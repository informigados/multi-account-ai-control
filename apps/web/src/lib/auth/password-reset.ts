import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";

const PASSWORD_RESET_TTL_MINUTES = 30;
const PASSWORD_RESET_WINDOW_MS = PASSWORD_RESET_TTL_MINUTES * 60 * 1000;

function hashResetToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

function getBaseUrl() {
	const env = getEnv();
	if (env.APP_BASE_URL) {
		return env.APP_BASE_URL.replace(/\/+$/, "");
	}

	return "http://localhost:3000";
}

export function buildPasswordResetLink(token: string) {
	return `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function issuePasswordResetToken(userId: string) {
	const token = randomBytes(32).toString("base64url");
	const tokenHash = hashResetToken(token);
	const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);

	await db.passwordResetToken.create({
		data: {
			userId,
			tokenHash,
			expiresAt,
		},
	});

	return { token, expiresAt };
}

export async function consumePasswordResetToken(token: string) {
	const tokenHash = hashResetToken(token);
	const now = new Date();

	const record = await db.passwordResetToken.findFirst({
		where: {
			tokenHash,
			usedAt: null,
			expiresAt: { gt: now },
		},
		select: {
			id: true,
			userId: true,
		},
	});

	if (!record) {
		return null;
	}

	await db.passwordResetToken.update({
		where: { id: record.id },
		data: { usedAt: now },
	});

	return record;
}

export async function cleanupExpiredPasswordResetTokens() {
	await db.passwordResetToken.deleteMany({
		where: {
			OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
		},
	});
}
