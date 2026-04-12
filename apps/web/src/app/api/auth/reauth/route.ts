import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { verifyPassword } from "@/lib/security/password";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reauthSchema = z.object({
	password: z.string().min(1),
});

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const parseResult = reauthSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{ message: "Invalid re-auth payload." },
			{ status: 400 },
		);
	}

	const clientAddress = getClientAddress(request);
	const rateLimitResult = consumeRateLimit({
		key: `auth:reauth:${clientAddress}`,
		limit: 12,
		windowMs: 10 * 60 * 1000,
	});
	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{
				message: `Too many re-auth attempts. Retry in ${rateLimitResult.retryAfterSeconds} seconds.`,
			},
			{
				status: 429,
				headers: {
					"retry-after": String(rateLimitResult.retryAfterSeconds),
				},
			},
		);
	}

	const authUser = await db.user.findUnique({
		where: { id: user.id },
		select: { id: true, username: true, passwordHash: true, isActive: true },
	});

	if (!authUser || !authUser.isActive) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const isValid = await verifyPassword(
		parseResult.data.password,
		authUser.passwordHash,
	);
	if (!isValid) {
		await writeActivityLog({
			actorUserId: authUser.id,
			entityType: "auth",
			entityId: authUser.id,
			eventType: "reauth_failure",
			message: `Re-auth failed for user ${authUser.username}`,
		});

		return NextResponse.json(
			{ message: "Invalid credentials." },
			{ status: 401 },
		);
	}

	await writeActivityLog({
		actorUserId: authUser.id,
		entityType: "auth",
		entityId: authUser.id,
		eventType: "reauth_success",
		message: `Re-auth succeeded for user ${authUser.username}`,
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
