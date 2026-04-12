import { z } from "zod";

export const AUDIT_RETENTION_DAYS_OPTIONS = [30, 60, 90, 180, 360] as const;
export const IDLE_LOCK_TIMEOUT_MINUTES_MIN = 1;
export const IDLE_LOCK_TIMEOUT_MINUTES_MAX = 240;
export const DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES = 10;

export type AuditRetentionDays = (typeof AUDIT_RETENTION_DAYS_OPTIONS)[number];

export const auditRetentionUpdateSchema = z
	.object({
		enabled: z.boolean(),
		days: z
			.union([
				z.literal(30),
				z.literal(60),
				z.literal(90),
				z.literal(180),
				z.literal(360),
			])
			.nullable(),
	})
	.refine((value) => !value.enabled || value.days !== null, {
		message: "Days is required when retention is enabled.",
		path: ["days"],
	});

export const idleLockUpdateSchema = z.object({
	enabled: z.boolean(),
	timeoutMinutes: z
		.number()
		.int()
		.min(IDLE_LOCK_TIMEOUT_MINUTES_MIN)
		.max(IDLE_LOCK_TIMEOUT_MINUTES_MAX),
	requirePasswordOnUnlock: z.boolean(),
});
