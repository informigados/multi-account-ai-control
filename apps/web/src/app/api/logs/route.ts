import { presentActivityLog } from "@/features/audit/log-presenter";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { logQuerySchema } from "@/schemas/log";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = logQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);

	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid logs query.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const {
		limit,
		cursor,
		entityType,
		entityId,
		eventType,
		search,
		actorUserId,
		dateFrom,
		dateTo,
	} = parseResult.data;

	const where: Prisma.ActivityLogWhereInput = {
		AND: [
			entityType ? { entityType } : {},
			entityId ? { entityId } : {},
			eventType ? { eventType } : {},
			actorUserId ? { actorUserId } : {},
			dateFrom || dateTo
				? {
						createdAt: {
							...(dateFrom ? { gte: dateFrom } : {}),
							...(dateTo ? { lte: dateTo } : {}),
						},
					}
				: {},
			search
				? {
						OR: [
							{ message: { contains: search } },
							{ eventType: { contains: search } },
							{ entityType: { contains: search } },
						],
					}
				: {},
		],
	};

	const logs = await db.activityLog.findMany({
		where,
		take: limit + 1,
		...(cursor
			? {
					cursor: { id: cursor },
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
	const hasMore = logs.length > limit;
	const slice = hasMore ? logs.slice(0, limit) : logs;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			logs: slice.map(presentActivityLog),
			page: {
				limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}
