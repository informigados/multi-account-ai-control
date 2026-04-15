import { createHash, timingSafeEqual } from "node:crypto";

export const BACKUP_CHECKSUM_ALGORITHM = "sha256" as const;

export function computeSha256Hex(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

export function compareHexChecksums(
	expectedHex: string,
	actualHex: string,
): boolean {
	const expected = Buffer.from(expectedHex.trim().toLowerCase(), "utf8");
	const actual = Buffer.from(actualHex.trim().toLowerCase(), "utf8");

	if (expected.length !== actual.length) {
		return false;
	}

	return timingSafeEqual(expected, actual);
}
