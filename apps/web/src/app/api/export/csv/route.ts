import { buildCsv } from "@/features/imports-exports/import-export-utils";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
	includeArchived: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value === "true"),
});

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = querySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);
	if (!parseResult.success) {
		return NextResponse.json(
			{ message: "Invalid export query." },
			{ status: 400 },
		);
	}

	const includeArchived = parseResult.data.includeArchived;

	const accounts = await db.account.findMany({
		where: includeArchived ? {} : { archivedAt: null },
		orderBy: [{ providerId: "asc" }, { identifier: "asc" }],
		include: {
			provider: {
				select: {
					name: true,
					slug: true,
				},
			},
			usageSnapshots: {
				orderBy: { measuredAt: "desc" },
				take: 1,
				select: {
					usedPercent: true,
					remainingPercent: true,
					usedQuota: true,
					remainingQuota: true,
					totalQuota: true,
					measuredAt: true,
					resetAt: true,
				},
			},
		},
	});

	const rows = accounts.map((account) => {
		const latestUsage = account.usageSnapshots[0];
		const tags = Array.isArray(account.tagsJson)
			? account.tagsJson.filter((tag) => typeof tag === "string").join(",")
			: "";

		return {
			providerName: account.provider.name,
			providerSlug: account.provider.slug,
			displayName: account.displayName,
			identifier: account.identifier,
			planName: account.planName ?? "",
			accountType: account.accountType ?? "",
			status: account.status,
			priority: account.priority,
			tags,
			notesText: account.notesText ?? "",
			resetIntervalMinutes: account.resetIntervalMinutes ?? "",
			nextResetAt: account.nextResetAt?.toISOString() ?? "",
			lastSyncAt: account.lastSyncAt?.toISOString() ?? "",
			usedPercent: latestUsage?.usedPercent ?? "",
			remainingPercent: latestUsage?.remainingPercent ?? "",
			usedQuota: latestUsage?.usedQuota ?? "",
			remainingQuota: latestUsage?.remainingQuota ?? "",
			totalQuota: latestUsage?.totalQuota ?? "",
			usageMeasuredAt: latestUsage?.measuredAt?.toISOString() ?? "",
			usageResetAt: latestUsage?.resetAt?.toISOString() ?? "",
		};
	});

	const headers = [
		"providerName",
		"providerSlug",
		"displayName",
		"identifier",
		"planName",
		"accountType",
		"status",
		"priority",
		"tags",
		"notesText",
		"resetIntervalMinutes",
		"nextResetAt",
		"lastSyncAt",
		"usedPercent",
		"remainingPercent",
		"usedQuota",
		"remainingQuota",
		"totalQuota",
		"usageMeasuredAt",
		"usageResetAt",
	];

	const csv = buildCsv(headers, rows);
	const exportedAt = new Date();

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "export",
		entityId: null,
		eventType: "export_created",
		message: "CSV export generated",
		metadata: {
			exportType: "csv",
			includeArchived,
			counts: {
				accounts: accounts.length,
			},
		},
	});

	const fileName = `multi-account-export-${exportedAt
		.toISOString()
		.replace(/[:.]/g, "-")}.csv`;

	return new NextResponse(csv, {
		status: 200,
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="${fileName}"`,
		},
	});
}
