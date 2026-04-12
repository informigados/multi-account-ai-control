import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

const SESSION_VERSION = "v1";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export const SESSION_COOKIE_NAME = "maac_session";

type SessionPayload = {
	sub: string;
	iat: number;
	exp: number;
	v: string;
};

function toBase64Url(value: string): string {
	return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
	return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadBase64Url: string): string {
	return createHmac("sha256", getEnv().SESSION_SECRET)
		.update(payloadBase64Url)
		.digest("base64url");
}

export function createSessionToken(userId: string): string {
	const iat = Math.floor(Date.now() / 1000);
	const payload: SessionPayload = {
		sub: userId,
		iat,
		exp: iat + SESSION_TTL_SECONDS,
		v: SESSION_VERSION,
	};

	const payloadBase64Url = toBase64Url(JSON.stringify(payload));
	const signature = sign(payloadBase64Url);

	return `${payloadBase64Url}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
	const parts = token.split(".");
	if (parts.length !== 2) return null;

	const [payloadBase64Url, signature] = parts;
	if (!payloadBase64Url || !signature) return null;

	const expected = sign(payloadBase64Url);

	// Compare canonical signature text to avoid base64url decoder ambiguities.
	const signatureBuffer = Buffer.from(signature, "utf8");
	const expectedBuffer = Buffer.from(expected, "utf8");

	if (signatureBuffer.length !== expectedBuffer.length) return null;
	if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

	let payload: SessionPayload;
	try {
		payload = JSON.parse(fromBase64Url(payloadBase64Url)) as SessionPayload;
	} catch {
		return null;
	}

	if (payload.v !== SESSION_VERSION) return null;

	const now = Math.floor(Date.now() / 1000);
	if (payload.exp <= now) return null;

	return payload;
}

export function getSessionTtlSeconds() {
	return SESSION_TTL_SECONDS;
}
