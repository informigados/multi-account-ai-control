import { db } from "@/lib/db";
import {
	AUDIT_RETENTION_DAYS_OPTIONS,
	type AuditRetentionDays,
} from "@/schemas/settings";

const AUDIT_RETENTION_KEY = "audit.log.retention";
const AUDIT_RETENTION_OPTION_SET = new Set<number>(
	AUDIT_RETENTION_DAYS_OPTIONS,
);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let nextRetentionPruneAt = 0;

export type AuditRetentionConfig = {
	enabled: boolean;
	days: AuditRetentionDays | null;
};

function normalizeRetentionDays(value: unknown): AuditRetentionDays | null {
	if (typeof value !== "number" || !AUDIT_RETENTION_OPTION_SET.has(value)) {
		return null;
	}

	return value as AuditRetentionDays;
}

function normalizeAuditRetentionConfig(value: unknown): AuditRetentionConfig {
	if (typeof value === "number") {
		const days = normalizeRetentionDays(value);
		return days ? { enabled: true, days } : { enabled: false, days: null };
	}

	if (typeof value !== "object" || value === null) {
		return { enabled: false, days: null };
	}

	const raw = value as { enabled?: unknown; days?: unknown };
	const normalizedDays = normalizeRetentionDays(raw.days);
	const enabled =
		typeof raw.enabled === "boolean" ? raw.enabled : normalizedDays !== null;

	if (!enabled) {
		return { enabled: false, days: null };
	}

	return {
		enabled: true,
		days: normalizedDays ?? AUDIT_RETENTION_DAYS_OPTIONS[0],
	};
}

export async function getAuditRetentionConfig(): Promise<AuditRetentionConfig> {
	let setting: { valueJson: unknown } | null = null;

	try {
		setting = await db.appSetting.findUnique({
			where: { key: AUDIT_RETENTION_KEY },
			select: { valueJson: true },
		});
	} catch {
		return { enabled: false, days: null };
	}

	if (!setting) {
		return { enabled: false, days: null };
	}

	return normalizeAuditRetentionConfig(setting.valueJson);
}

export async function saveAuditRetentionConfig(
	config: AuditRetentionConfig,
): Promise<AuditRetentionConfig> {
	const normalizedConfig: AuditRetentionConfig = config.enabled
		? { enabled: true, days: config.days ?? AUDIT_RETENTION_DAYS_OPTIONS[0] }
		: { enabled: false, days: null };

	await db.appSetting.upsert({
		where: { key: AUDIT_RETENTION_KEY },
		update: {
			valueJson: normalizedConfig,
		},
		create: {
			key: AUDIT_RETENTION_KEY,
			valueJson: normalizedConfig,
		},
	});

	nextRetentionPruneAt = 0;
	return normalizedConfig;
}

export async function pruneActivityLogsByRetentionPolicy(options?: {
	force?: boolean;
}) {
	const force = options?.force ?? false;
	const nowMs = Date.now();

	if (!force && nowMs < nextRetentionPruneAt) {
		return { deletedCount: 0, skipped: true as const };
	}

	nextRetentionPruneAt = nowMs + RETENTION_PRUNE_INTERVAL_MS;

	try {
		const config = await getAuditRetentionConfig();
		if (!config.enabled || config.days === null) {
			return { deletedCount: 0, skipped: false as const };
		}

		const cutoffDate = new Date(nowMs - config.days * ONE_DAY_MS);
		const result = await db.activityLog.deleteMany({
			where: {
				createdAt: { lt: cutoffDate },
			},
		});

		return { deletedCount: result.count, skipped: false as const };
	} catch {
		nextRetentionPruneAt = 0;
		return { deletedCount: 0, skipped: false as const };
	}
}
