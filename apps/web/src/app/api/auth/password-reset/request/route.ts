import { writeActivityLog } from "@/lib/audit/log";
import {
	buildPasswordResetLink,
	cleanupExpiredPasswordResetTokens,
	issuePasswordResetToken,
} from "@/lib/auth/password-reset";
import { db } from "@/lib/db";
import { canSendEmail, sendEmail } from "@/lib/notifications/email";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import { passwordResetRequestSchema } from "@/schemas/auth";
import { type NextRequest, NextResponse } from "next/server";

const genericSuccessMessage =
	"If the email exists, a password reset link has been sent.";

export async function POST(request: NextRequest) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	if (!canSendEmail()) {
		return NextResponse.json(
			{
				message:
					"Password reset email is unavailable. Configure SMTP_* variables first.",
			},
			{ status: 503 },
		);
	}

	const parseResult = passwordResetRequestSchema.safeParse(
		await request.json(),
	);
	if (!parseResult.success) {
		return NextResponse.json(
			{ message: "Invalid password reset request." },
			{ status: 400 },
		);
	}

	const clientAddress = getClientAddress(request);
	const rateLimitResult = consumeRateLimit({
		key: `auth:password-reset:request:${clientAddress}`,
		limit: 6,
		windowMs: 10 * 60 * 1000,
	});
	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{
				message: `Too many password reset requests. Retry in ${rateLimitResult.retryAfterSeconds} seconds.`,
			},
			{
				status: 429,
				headers: {
					"retry-after": String(rateLimitResult.retryAfterSeconds),
				},
			},
		);
	}

	const email = parseResult.data.email.toLowerCase();
	const user = await db.user.findFirst({
		where: {
			email,
			isActive: true,
		},
		select: {
			id: true,
			email: true,
			username: true,
		},
	});

	if (!user) {
		return NextResponse.json(
			{ ok: true, message: genericSuccessMessage },
			{ status: 200 },
		);
	}

	await cleanupExpiredPasswordResetTokens();
	await db.passwordResetToken.deleteMany({
		where: {
			userId: user.id,
			usedAt: null,
		},
	});

	const { token, expiresAt } = await issuePasswordResetToken(user.id);
	const resetLink = buildPasswordResetLink(token);

	await sendEmail({
		to: user.email,
		subject: "Multi Account AI Control - Password reset",
		text: `Hello ${user.username},\n\nUse this link to reset your password:\n${resetLink}\n\nThe link expires at ${expiresAt.toISOString()}.\nIf you did not request this, ignore this message.`,
		html: `
			<p>Hello ${user.username},</p>
			<p>Use the link below to reset your password:</p>
			<p><a href="${resetLink}">${resetLink}</a></p>
			<p>This link expires at <strong>${expiresAt.toISOString()}</strong>.</p>
			<p>If you did not request this, ignore this message.</p>
		`,
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "auth",
		entityId: user.id,
		eventType: "password_reset_requested",
		message: `Password reset requested for user ${user.username}`,
	});

	return NextResponse.json(
		{ ok: true, message: genericSuccessMessage },
		{ status: 200 },
	);
}
