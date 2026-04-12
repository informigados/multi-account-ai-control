import {
	executeImportData,
	resolveImportStatus,
} from "@/features/imports-exports/import-export-service";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { importJsonSchema } from "@/schemas/import-export";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = importJsonSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid JSON import payload.",
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
				`import-json-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
			fileType: "json",
			importedBy: user.id,
			status: "pending",
		},
		select: {
			id: true,
		},
	});

	const summary = await executeImportData({
		providers: payload.providers,
		accounts: payload.accounts,
		usageSnapshots: payload.usageSnapshots,
	});

	const status = resolveImportStatus(summary);
	await db.import.update({
		where: { id: importRow.id },
		data: {
			status,
			summaryJson: summary as Prisma.InputJsonValue,
		},
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "import",
		entityId: importRow.id,
		eventType: "import_executed",
		message: `JSON import executed with status ${status}`,
		metadata: {
			importId: importRow.id,
			fileType: "json",
			status,
			summary,
		},
	});

	return NextResponse.json(
		{
			importId: importRow.id,
			status,
			summary,
		},
		{
			status: status === "failed" ? 400 : 200,
		},
	);
}
