import { presentUsageSnapshot } from "@/features/usage/usage-presenter";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { usageRecentQuerySchema } from "@/schemas/usage";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const query = usageRecentQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);

	if (!query.success) {
		return NextResponse.json(
			{
				message: "Invalid recent usage query.",
				issues: query.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const snapshots = await db.usageSnapshot.findMany({
		where: query.data.accountId
			? { accountId: query.data.accountId }
			: undefined,
		take: query.data.limit + 1,
		...(query.data.cursor
			? {
					cursor: { id: query.data.cursor },
					skip: 1,
				}
			: {}),
		orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
		include: {
			account: {
				select: {
					id: true,
					displayName: true,
					identifier: true,
					provider: {
						select: {
							id: true,
							name: true,
							slug: true,
							color: true,
						},
					},
				},
			},
		},
	});
	const hasMore = snapshots.length > query.data.limit;
	const slice = hasMore ? snapshots.slice(0, query.data.limit) : snapshots;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			snapshots: slice.map(presentUsageSnapshot),
			page: {
				limit: query.data.limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}
