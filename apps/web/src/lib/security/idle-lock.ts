import { db } from "@/lib/db";
import {
	DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
	IDLE_LOCK_TIMEOUT_MINUTES_MAX,
	IDLE_LOCK_TIMEOUT_MINUTES_MIN,
} from "@/schemas/settings";

const IDLE_LOCK_SETTING_KEY = "security.idle_lock";

export type IdleLockConfig = {
	enabled: boolean;
	timeoutMinutes: number;
	requirePasswordOnUnlock: boolean;
};

export const defaultIdleLockConfig: IdleLockConfig = {
	enabled: false,
	timeoutMinutes: DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES,
	requirePasswordOnUnlock: true,
};

function normalizeTimeoutMinutes(value: unknown) {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES;
	}

	const integerValue = Math.trunc(value);
	return Math.min(
		IDLE_LOCK_TIMEOUT_MINUTES_MAX,
		Math.max(IDLE_LOCK_TIMEOUT_MINUTES_MIN, integerValue),
	);
}

function normalizeIdleLockConfig(value: unknown): IdleLockConfig {
	if (typeof value !== "object" || value === null) {
		return defaultIdleLockConfig;
	}

	const raw = value as {
		enabled?: unknown;
		timeoutMinutes?: unknown;
		requirePasswordOnUnlock?: unknown;
	};

	return {
		enabled: typeof raw.enabled === "boolean" ? raw.enabled : false,
		timeoutMinutes: normalizeTimeoutMinutes(raw.timeoutMinutes),
		requirePasswordOnUnlock:
			typeof raw.requirePasswordOnUnlock === "boolean"
				? raw.requirePasswordOnUnlock
				: true,
	};
}

export async function getIdleLockConfig(): Promise<IdleLockConfig> {
	try {
		const setting = await db.appSetting.findUnique({
			where: { key: IDLE_LOCK_SETTING_KEY },
			select: { valueJson: true },
		});
		if (!setting) {
			return defaultIdleLockConfig;
		}

		return normalizeIdleLockConfig(setting.valueJson);
	} catch {
		return defaultIdleLockConfig;
	}
}

export async function saveIdleLockConfig(
	config: IdleLockConfig,
): Promise<IdleLockConfig> {
	const normalizedConfig = normalizeIdleLockConfig(config);

	await db.appSetting.upsert({
		where: { key: IDLE_LOCK_SETTING_KEY },
		update: {
			valueJson: normalizedConfig,
		},
		create: {
			key: IDLE_LOCK_SETTING_KEY,
			valueJson: normalizedConfig,
		},
	});

	return normalizedConfig;
}
