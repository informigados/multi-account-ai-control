import { encryptSecret } from "@/lib/security/encryption";

export function buildSecretBlob(
	secretPayload: Record<string, string | undefined> | undefined,
) {
	if (!secretPayload) return null;

	const entries = Object.entries(secretPayload).filter(
		([, value]) => typeof value === "string" && value.trim().length > 0,
	);

	if (entries.length === 0) return null;

	const normalized = Object.fromEntries(entries);
	return encryptSecret(JSON.stringify(normalized));
}
