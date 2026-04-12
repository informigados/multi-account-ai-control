import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

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

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true, displayName: true, status: true, archivedAt: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	if (account.status === "archived" && account.archivedAt) {
		return NextResponse.json({ ok: true }, { status: 200 });
	}

	await db.account.update({
		where: { id: account.id },
		data: {
			status: "archived",
			archivedAt: new Date(),
		},
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		entityId: account.id,
		eventType: "account_archived",
		message: `Account ${account.displayName} archived`,
		metadata: { accountId: account.id },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
