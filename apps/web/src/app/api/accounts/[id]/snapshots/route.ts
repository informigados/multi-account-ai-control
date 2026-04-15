/**
 * GET /api/accounts/[id]/snapshots?limit=30
 *
 * Returns the usage snapshot history for a given account,
 * ordered by measuredAt DESC. Used by the sparkline component.
 */
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
	const user = await requireApiUser(request);
	if (!user)
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

	const { id } = await ctx.params;
	if (!z.string().uuid().safeParse(id).success)
		return NextResponse.json(
			{ message: "Invalid account id." },
			{ status: 400 },
		);

	const rawLimit = new URL(request.url).searchParams.get("limit");
	const limit = Math.min(
		90,
		Math.max(1, Number.parseInt(rawLimit ?? "30", 10) || 30),
	);

	const snapshots = await db.usageSnapshot.findMany({
		where: { accountId: id },
		orderBy: { measuredAt: "desc" },
		take: limit,
		select: {
			id: true,
			accountId: true,
			usedQuota: true,
			totalQuota: true,
			usedPercent: true,
			resetAt: true,
			measuredAt: true,
		},
	});

	// Return oldest-first so sparkline renders left→right
	return NextResponse.json({ snapshots: snapshots.reverse() }, { status: 200 });
}
