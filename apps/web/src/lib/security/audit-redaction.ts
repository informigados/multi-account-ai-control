import type { Prisma } from "@prisma/client";

const REDACTED = "[REDACTED]";
const TRUNCATED = "[TRUNCATED]";
const MAX_DEPTH = 8;

const SENSITIVE_KEY_PATTERN =
	/(pass(word)?|secret|token|api[_-]?key|cookie|authorization|auth[_-]?header|encrypted[_-]?payload|encrypted[_-]?secret|confirm[_-]?phrase)/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeValue(value: unknown, depth: number): unknown {
	if (depth > MAX_DEPTH) {
		return TRUNCATED;
	}

	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeValue(entry, depth + 1));
	}

	if (isPlainObject(value)) {
		const output: Record<string, unknown> = {};

		for (const [key, nested] of Object.entries(value)) {
			if (SENSITIVE_KEY_PATTERN.test(key)) {
				output[key] = REDACTED;
				continue;
			}
			output[key] = sanitizeValue(nested, depth + 1);
		}

		return output;
	}

	return String(value);
}

export function sanitizeAuditMetadata(
	metadata: Prisma.InputJsonValue | undefined,
): Prisma.InputJsonValue {
	const sanitized = sanitizeValue(metadata ?? {}, 0);
	return (sanitized ?? {}) as Prisma.InputJsonValue;
}
