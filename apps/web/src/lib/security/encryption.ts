import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";

const IV_LENGTH = 12;

type EncryptedPayload = {
	iv: string;
	tag: string;
	value: string;
};

function getMasterKey(): Buffer {
	const key = getEnv().APP_MASTER_KEY.trim();

	if (/^[a-fA-F0-9]{64}$/.test(key)) {
		return Buffer.from(key, "hex");
	}

	const decoded = Buffer.from(key, "base64");
	if (decoded.length === 32) {
		return decoded;
	}

	throw new Error(
		"APP_MASTER_KEY must be 32-byte base64 or 64-char hex. Refusing weak fallback key derivation.",
	);
}

export function encryptSecret(plainText: string): string {
	const key = getMasterKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plainText, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	const payload: EncryptedPayload = {
		iv: iv.toString("base64"),
		tag: tag.toString("base64"),
		value: encrypted.toString("base64"),
	};

	return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decryptSecret(encryptedBlob: string): string {
	const decodedPayload = JSON.parse(
		Buffer.from(encryptedBlob, "base64").toString("utf8"),
	) as EncryptedPayload;

	const key = getMasterKey();
	const iv = Buffer.from(decodedPayload.iv, "base64");
	const tag = Buffer.from(decodedPayload.tag, "base64");
	const value = Buffer.from(decodedPayload.value, "base64");

	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(tag);
	const decrypted = Buffer.concat([decipher.update(value), decipher.final()]);
	return decrypted.toString("utf8");
}

export function maskSecret(value: string, visibleTail = 4): string {
	if (!value) return "";
	if (value.length <= visibleTail) return "*".repeat(value.length);
	return `${"*".repeat(Math.max(0, value.length - visibleTail))}${value.slice(-visibleTail)}`;
}
