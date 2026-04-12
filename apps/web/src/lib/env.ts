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
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
	if (cachedEnv) return cachedEnv;

	cachedEnv = envSchema.parse({
		DATABASE_URL: process.env.DATABASE_URL,
		APP_MASTER_KEY: process.env.APP_MASTER_KEY,
		SESSION_SECRET: process.env.SESSION_SECRET,
		NODE_ENV: process.env.NODE_ENV,
	});

	return cachedEnv;
}
