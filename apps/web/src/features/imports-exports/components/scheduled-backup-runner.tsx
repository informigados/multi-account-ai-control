"use client";

/**
 * ScheduledBackupRunner
 *
 * Invisible client-only component that activates the useScheduledBackup hook.
 * Injected once at the dashboard root so automatic backups run in the background
 * as long as the user has the app open.
 *
 * Reads the backup interval from the quota-config AppSetting (retentionDays
 * converts to hours: retentionDays × 24 / retentionDays ≈ 24h default).
 * We default to 24h between automatic backups regardless.
 */
import { useScheduledBackup } from "@/features/imports-exports/hooks/use-scheduled-backup";

export function ScheduledBackupRunner() {
	useScheduledBackup({
		intervalHours: 24,
		enabled: true,
	});
	// Renders nothing — purely a hook carrier
	return null;
}
