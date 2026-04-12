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

	const [providers, accounts, usageSnapshots, notes] = await Promise.all([
		db.provider.findMany({
			orderBy: { name: "asc" },
		}),
		db.account.findMany({
			where: includeArchived ? {} : { archivedAt: null },
			orderBy: [{ providerId: "asc" }, { identifier: "asc" }],
			select: {
				id: true,
				providerId: true,
				displayName: true,
				identifier: true,
				planName: true,
				accountType: true,
				status: true,
				priority: true,
				tagsJson: true,
				notesText: true,
				resetIntervalMinutes: true,
				nextResetAt: true,
				lastSyncAt: true,
				createdAt: true,
				updatedAt: true,
				archivedAt: true,
			},
		}),
		db.usageSnapshot.findMany({
			orderBy: { measuredAt: "desc" },
			select: {
				id: true,
				accountId: true,
				sourceType: true,
				totalQuota: true,
				usedQuota: true,
				remainingQuota: true,
				usedPercent: true,
				remainingPercent: true,
				requestCount: true,
				tokenCount: true,
				creditBalance: true,
				modelBreakdownJson: true,
				measuredAt: true,
				resetAt: true,
				comments: true,
			},
		}),
		db.note.findMany({
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				accountId: true,
				noteType: true,
				content: true,
				createdBy: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	const exportedAt = new Date();
	const payload = {
		version: 1,
		exportType: "json",
		exportedAt: exportedAt.toISOString(),
		includeArchived,
		providers,
		accounts,
		usageSnapshots,
		notes,
	};

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "export",
		entityId: null,
		eventType: "export_created",
		message: "JSON export generated",
		metadata: {
			exportType: "json",
			includeArchived,
			counts: {
				providers: providers.length,
				accounts: accounts.length,
				usageSnapshots: usageSnapshots.length,
				notes: notes.length,
			},
		},
	});

	const fileName = `multi-account-export-${exportedAt
		.toISOString()
		.replace(/[:.]/g, "-")}.json`;

	return new NextResponse(JSON.stringify(payload, null, 2), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"content-disposition": `attachment; filename="${fileName}"`,
		},
	});
}
