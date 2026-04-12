import {
	type ImportExecutionSummary,
	executeImportData,
	resolveImportStatus,
} from "@/features/imports-exports/import-export-service";
import {
	type CsvImportedAccount,
	mapCsvRowToAccount,
	parseCsvToRows,
} from "@/features/imports-exports/import-export-utils";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { importCsvSchema } from "@/schemas/import-export";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

function buildInvalidRowsSummary(
	parseErrors: Array<{ index: number; message: string }>,
): ImportExecutionSummary {
	return {
		providers: { total: 0, created: 0, updated: 0, failed: 0 },
		accounts: {
			total: parseErrors.length,
			created: 0,
			updated: 0,
			failed: parseErrors.length,
		},
		usageSnapshots: { total: 0, created: 0, failed: 0 },
		errors: parseErrors.map((error) => ({
			section: "accounts" as const,
			index: error.index,
			message: error.message,
		})),
	};
}

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = importCsvSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid CSV import payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const payload = parseResult.data;
	const importRow = await db.import.create({
		data: {
			fileName:
				payload.fileName ??
				`import-csv-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
			fileType: "csv",
			importedBy: user.id,
			status: "pending",
		},
		select: { id: true },
	});

	const parsed = parseCsvToRows(payload.csvText, payload.delimiter);
	if (parsed.rows.length === 0) {
		const summary = buildInvalidRowsSummary([
			{ index: 0, message: "CSV file has no data rows." },
		]);
		await db.import.update({
			where: { id: importRow.id },
			data: {
				status: "failed",
				summaryJson: summary as Prisma.InputJsonValue,
			},
		});

		return NextResponse.json(
			{ importId: importRow.id, status: "failed", summary },
			{ status: 400 },
		);
	}

	const accounts: CsvImportedAccount[] = [];
	const parseErrors: Array<{ index: number; message: string }> = [];
	for (let index = 0; index < parsed.rows.length; index += 1) {
		const mapped = mapCsvRowToAccount(parsed.rows[index]);
		if (!mapped.ok) {
			parseErrors.push({ index, message: mapped.error });
			continue;
		}

		accounts.push(mapped.account);
	}

	const importSummary =
		accounts.length > 0
			? await executeImportData({ accounts })
			: buildInvalidRowsSummary(parseErrors);

	if (parseErrors.length > 0) {
		importSummary.accounts.total += parseErrors.length;
		importSummary.accounts.failed += parseErrors.length;
		importSummary.errors.push(
			...parseErrors.map((error) => ({
				section: "accounts" as const,
				index: error.index,
				message: error.message,
			})),
		);
	}

	const status = resolveImportStatus(importSummary);
	await db.import.update({
		where: { id: importRow.id },
		data: {
			status,
			summaryJson: importSummary as Prisma.InputJsonValue,
		},
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "import",
		entityId: importRow.id,
		eventType: "import_executed",
		message: `CSV import executed with status ${status}`,
		metadata: {
			importId: importRow.id,
			fileType: "csv",
			status,
			summary: importSummary,
		},
	});

	return NextResponse.json(
		{
			importId: importRow.id,
			status,
			summary: importSummary,
		},
		{
			status: status === "failed" ? 400 : 200,
		},
	);
}
