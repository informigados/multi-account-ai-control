import { presentActivityLog } from "@/features/audit/log-presenter";
import { pruneActivityLogsByRetentionPolicy } from "@/lib/audit/retention";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const querySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(100),
	cursor: z.string().uuid().optional(),
	dateFrom: z.coerce.date().optional(),
	dateTo: z.coerce.date().optional(),
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
			{ message: "Invalid logs query." },
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

	await pruneActivityLogsByRetentionPolicy();

	const logs = await db.activityLog.findMany({
		where: {
			entityType: "account",
			entityId: account.id,
			...(parsedQuery.data.dateFrom || parsedQuery.data.dateTo
				? {
						createdAt: {
							...(parsedQuery.data.dateFrom
								? { gte: parsedQuery.data.dateFrom }
								: {}),
							...(parsedQuery.data.dateTo
								? { lte: parsedQuery.data.dateTo }
								: {}),
						},
					}
				: {}),
		},
		take: parsedQuery.data.limit + 1,
		...(parsedQuery.data.cursor
			? {
					cursor: { id: parsedQuery.data.cursor },
					skip: 1,
				}
			: {}),
		orderBy: { createdAt: "desc" },
		include: {
			actor: {
				select: {
					id: true,
					username: true,
					email: true,
				},
			},
		},
	});
	const hasMore = logs.length > parsedQuery.data.limit;
	const slice = hasMore ? logs.slice(0, parsedQuery.data.limit) : logs;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			logs: slice.map(presentActivityLog),
			page: {
				limit: parsedQuery.data.limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}
