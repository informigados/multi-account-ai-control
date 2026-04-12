import { z } from "zod";

function isBase64EncodedSecret(value: string) {
	try {
		return Buffer.from(value, "base64").length === 32;
	} catch {
		return false;
	}
}

function isHexEncodedSecret(value: string) {
	return /^[a-fA-F0-9]{64}$/.test(value);
}

const emptyStringToUndefined = z.preprocess((value) => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length === 0 ? undefined : trimmed;
	}

	return value;
}, z.string().optional());

const optionalUrl = emptyStringToUndefined.pipe(z.string().url().optional());
const optionalEmail = emptyStringToUndefined.pipe(
	z.string().email().optional(),
);
const optionalPositiveInt = z.preprocess((value) => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return undefined;
		}

		return Number(trimmed);
	}

	return value;
}, z.number().int().positive().optional());

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	APP_MASTER_KEY: z
		.string()
		.min(1)
		.refine(
			(value) =>
				isHexEncodedSecret(value.trim()) || isBase64EncodedSecret(value.trim()),
			{
				message: "APP_MASTER_KEY must be 32-byte base64 or 64-char hex.",
			},
		)
		.describe("32-byte key encoded as base64 or 64-char hex"),
	SESSION_SECRET: z.string().trim().min(32),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	APP_BASE_URL: optionalUrl,
	SMTP_HOST: emptyStringToUndefined,
	SMTP_PORT: optionalPositiveInt,
	SMTP_USER: emptyStringToUndefined,
	SMTP_PASS: emptyStringToUndefined,
	SMTP_FROM: optionalEmail,
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
	if (cachedEnv) return cachedEnv;

	cachedEnv = envSchema.parse({
		DATABASE_URL: process.env.DATABASE_URL,
		APP_MASTER_KEY: process.env.APP_MASTER_KEY,
		SESSION_SECRET: process.env.SESSION_SECRET,
		NODE_ENV: process.env.NODE_ENV,
		APP_BASE_URL: process.env.APP_BASE_URL,
		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT,
		SMTP_USER: process.env.SMTP_USER,
		SMTP_PASS: process.env.SMTP_PASS,
		SMTP_FROM: process.env.SMTP_FROM,
	});

	return cachedEnv;
}
