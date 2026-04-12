import type { UsageCreateInput } from "@/schemas/usage";

function round2(value: number) {
	return Math.round(value * 100) / 100;
}

type NormalizedUsage = {
	totalQuota: number | null;
	usedQuota: number | null;
	remainingQuota: number | null;
	usedPercent: number | null;
	remainingPercent: number | null;
	requestCount: number | null;
	tokenCount: number | null;
	creditBalance: number | null;
	modelBreakdownJson: Record<string, unknown> | undefined;
	measuredAt: Date;
	resetAt: Date | null;
	comments: string | null;
	sourceType: "manual" | "import" | "connector";
};

export function normalizeUsagePayload(
	payload: UsageCreateInput,
): NormalizedUsage {
	const totalQuota = payload.totalQuota ?? null;
	let usedQuota = payload.usedQuota ?? null;
	let remainingQuota = payload.remainingQuota ?? null;
	let usedPercent = payload.usedPercent ?? null;
	let remainingPercent = payload.remainingPercent ?? null;

	if (totalQuota !== null && totalQuota < 0) {
		throw new Error("totalQuota cannot be negative.");
	}

	if (usedQuota !== null && usedQuota < 0) {
		throw new Error("usedQuota cannot be negative.");
	}

	if (remainingQuota !== null && remainingQuota < 0) {
		throw new Error("remainingQuota cannot be negative.");
	}

	if (usedPercent !== null && (usedPercent < 0 || usedPercent > 100)) {
		throw new Error("usedPercent must be between 0 and 100.");
	}

	if (
		remainingPercent !== null &&
		(remainingPercent < 0 || remainingPercent > 100)
	) {
		throw new Error("remainingPercent must be between 0 and 100.");
	}

	if (totalQuota !== null && usedQuota !== null && usedQuota > totalQuota) {
		throw new Error("usedQuota cannot exceed totalQuota.");
	}

	if (
		totalQuota !== null &&
		remainingQuota !== null &&
		remainingQuota > totalQuota
	) {
		throw new Error("remainingQuota cannot exceed totalQuota.");
	}

	if (totalQuota !== null && usedQuota !== null && remainingQuota === null) {
		remainingQuota = round2(totalQuota - usedQuota);
	}

	if (totalQuota !== null && remainingQuota !== null && usedQuota === null) {
		usedQuota = round2(totalQuota - remainingQuota);
	}

	if (totalQuota !== null && usedQuota !== null) {
		if (usedQuota > totalQuota) {
			throw new Error("usedQuota cannot exceed totalQuota.");
		}

		const computedUsedPercent =
			totalQuota === 0 ? 0 : round2((usedQuota / totalQuota) * 100);
		const computedRemainingPercent = round2(100 - computedUsedPercent);

		if (
			usedPercent !== null &&
			Math.abs(usedPercent - computedUsedPercent) > 0.5
		) {
			throw new Error(
				"usedPercent is inconsistent with totalQuota and usedQuota.",
			);
		}

		if (
			remainingPercent !== null &&
			Math.abs(remainingPercent - computedRemainingPercent) > 0.5
		) {
			throw new Error(
				"remainingPercent is inconsistent with totalQuota and usedQuota.",
			);
		}

		usedPercent = computedUsedPercent;
		remainingPercent = computedRemainingPercent;
	} else if (usedPercent !== null && remainingPercent === null) {
		remainingPercent = round2(100 - usedPercent);
	} else if (remainingPercent !== null && usedPercent === null) {
		usedPercent = round2(100 - remainingPercent);
	}

	if (
		usedPercent !== null &&
		remainingPercent !== null &&
		Math.abs(usedPercent + remainingPercent - 100) > 0.5
	) {
		throw new Error("usedPercent and remainingPercent must sum to 100.");
	}

	return {
		totalQuota,
		usedQuota,
		remainingQuota,
		usedPercent,
		remainingPercent,
		requestCount: payload.requestCount ?? null,
		tokenCount: payload.tokenCount ?? null,
		creditBalance: payload.creditBalance ?? null,
		modelBreakdownJson: payload.modelBreakdown,
		measuredAt: payload.measuredAt ?? new Date(),
		resetAt: payload.resetAt ?? null,
		comments: payload.comments ?? null,
		sourceType: payload.sourceType,
	};
}
