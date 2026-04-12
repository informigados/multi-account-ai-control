import { writeActivityLog } from "@/lib/audit/log";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { hashPassword } from "@/lib/security/password";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import { passwordResetConfirmSchema } from "@/schemas/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const parseResult = passwordResetConfirmSchema.safeParse(
		await request.json(),
	);
	if (!parseResult.success) {
		return NextResponse.json(
			{ message: "Invalid password reset payload." },
			{ status: 400 },
		);
	}

	const clientAddress = getClientAddress(request);
	const rateLimitResult = consumeRateLimit({
		key: `auth:password-reset:confirm:${clientAddress}`,
		limit: 8,
		windowMs: 10 * 60 * 1000,
	});
	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{
				message: `Too many reset attempts. Retry in ${rateLimitResult.retryAfterSeconds} seconds.`,
			},
			{
				status: 429,
				headers: {
					"retry-after": String(rateLimitResult.retryAfterSeconds),
				},
			},
		);
	}

	const tokenRecord = await consumePasswordResetToken(parseResult.data.token);
	if (!tokenRecord) {
		return NextResponse.json(
			{ message: "Reset token is invalid or expired." },
			{ status: 400 },
		);
	}

	const user = await db.user.findUnique({
		where: { id: tokenRecord.userId },
		select: { id: true, username: true, isActive: true },
	});
	if (!user || !user.isActive) {
		return NextResponse.json(
			{ message: "User is inactive or not found." },
			{ status: 400 },
		);
	}

	const passwordHash = await hashPassword(parseResult.data.password);
	await db.user.update({
		where: { id: user.id },
		data: { passwordHash },
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "auth",
		entityId: user.id,
		eventType: "password_reset_confirmed",
		message: `Password reset confirmed for user ${user.username}`,
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
