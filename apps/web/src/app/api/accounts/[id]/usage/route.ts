import { presentUsageSnapshot } from "@/features/usage/usage-presenter";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { normalizeUsagePayload } from "@/lib/usage/normalize";
import { usageCreateSchema } from "@/schemas/usage";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const querySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(30),
	cursor: z.string().uuid().optional(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawParams = await context.params;
	const parsedParams = paramsSchema.safeParse(rawParams);
	if (!parsedParams.success) {
		return NextResponse.json(
			{ message: "Invalid account id." },
			{ status: 400 },
		);
	}

	const parsedQuery = querySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);
	if (!parsedQuery.success) {
		return NextResponse.json(
			{ message: "Invalid usage query." },
			{ status: 400 },
		);
	}

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	const snapshots = await db.usageSnapshot.findMany({
		where: { accountId: account.id },
		take: parsedQuery.data.limit + 1,
		...(parsedQuery.data.cursor
			? {
					cursor: { id: parsedQuery.data.cursor },
					skip: 1,
				}
			: {}),
		orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
	});
	const hasMore = snapshots.length > parsedQuery.data.limit;
	const slice = hasMore
		? snapshots.slice(0, parsedQuery.data.limit)
		: snapshots;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			snapshots: slice.map(presentUsageSnapshot),
			page: {
				limit: parsedQuery.data.limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}

export async function POST(request: NextRequest, context: RouteContext) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawParams = await context.params;
	const parsedParams = paramsSchema.safeParse(rawParams);
	if (!parsedParams.success) {
		return NextResponse.json(
			{ message: "Invalid account id." },
			{ status: 400 },
		);
	}

	const parseResult = usageCreateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid usage payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true, displayName: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	try {
		const normalized = normalizeUsagePayload(parseResult.data);

		const snapshot = await db.usageSnapshot.create({
			data: {
				accountId: account.id,
				sourceType: normalized.sourceType,
				totalQuota: normalized.totalQuota,
				usedQuota: normalized.usedQuota,
				remainingQuota: normalized.remainingQuota,
				usedPercent: normalized.usedPercent,
				remainingPercent: normalized.remainingPercent,
				requestCount: normalized.requestCount,
				tokenCount: normalized.tokenCount,
				creditBalance: normalized.creditBalance,
				modelBreakdownJson: normalized.modelBreakdownJson
					? (normalized.modelBreakdownJson as Prisma.InputJsonValue)
					: undefined,
				measuredAt: normalized.measuredAt,
				resetAt: normalized.resetAt,
				comments: normalized.comments,
			},
		});

		await db.account.update({
			where: { id: account.id },
			data: {
				lastSyncAt: normalized.measuredAt,
				nextResetAt: normalized.resetAt ?? undefined,
			},
		});

		await writeActivityLog({
			actorUserId: user.id,
			entityType: "account",
			entityId: account.id,
			eventType: "usage_updated",
			message: `Usage updated for ${account.displayName}`,
			metadata: {
				accountId: account.id,
				usageSnapshotId: snapshot.id,
				sourceType: snapshot.sourceType,
			},
		});

		return NextResponse.json(
			{ snapshot: presentUsageSnapshot(snapshot) },
			{ status: 201 },
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update usage.";
		return NextResponse.json({ message }, { status: 400 });
	}
}
