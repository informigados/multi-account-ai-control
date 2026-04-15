"use client";

/**
 * useScheduledBackup
 *
 * Client-side hook that automatically creates a backup at a configured
 * interval while the app is open. This is the web-mode equivalent of the
 * Tauri daemon scheduled backup.
 *
 * Behaviour:
 *  - Reads retentionDays from /api/settings/quota-config (falls back to 7)
 *  - On mount: checks if last backup was more than `intervalHours` ago.
 *    If so, creates one immediately.
 *  - Then sets up an interval timer to create backups every `intervalHours`.
 *  - On unmount: clears the interval.
 *
 * The backup is created via POST /api/export/backup (full JSON export) and
 * then registered via POST /api/export/backup/schedule (metadata log entry).
 *
 * Usage:
 *   useScheduledBackup({ intervalHours: 24, enabled: true })
 */
import { useCallback, useEffect, useRef } from "react";

type BackupEntry = {
	id: string;
	createdAt: string;
	label?: string;
};

type UseScheduledBackupOptions = {
	/** Hours between automatic backups. Default: 24 */
	intervalHours?: number;
	/** Whether the auto-backup is enabled. Default: true */
	enabled?: boolean;
	/** Optional callback fired after each successful backup */
	onBackupCreated?: (entry: BackupEntry) => void;
};

const LAST_BACKUP_KEY = "maac:last_auto_backup";

function getLastBackupTime(): number {
	if (typeof localStorage === "undefined") return 0;
	const raw = localStorage.getItem(LAST_BACKUP_KEY);
	return raw ? Number(raw) : 0;
}

function setLastBackupTime(ts: number) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(LAST_BACKUP_KEY, String(ts));
}

export function useScheduledBackup({
	intervalHours = 24,
	enabled = true,
	onBackupCreated,
}: UseScheduledBackupOptions = {}) {
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const isRunningRef = useRef(false);

	const runBackup = useCallback(async () => {
		if (isRunningRef.current) return; // Prevent concurrent runs
		isRunningRef.current = true;

		try {
			// Step 1: Export full backup payload
			const exportRes = await fetch("/api/export/json");
			if (!exportRes.ok) return;
			const payload = await exportRes.text();

			// Step 2: Register the backup in the schedule log
			const label = `Auto-backup ${new Date().toLocaleDateString("pt-BR")}`;
			const schedRes = await fetch("/api/export/backup/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label, payload }),
			});
			if (!schedRes.ok) return;

			const data = (await schedRes.json()) as { entry?: BackupEntry };
			const now = Date.now();
			setLastBackupTime(now);

			if (data.entry) {
				onBackupCreated?.(data.entry);
			}
		} catch {
			// Silent — backup errors should not disrupt the user
		} finally {
			isRunningRef.current = false;
		}
	}, [onBackupCreated]);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") return;

		const intervalMs = intervalHours * 60 * 60 * 1000;

		// Run immediately if overdue
		const lastTs = getLastBackupTime();
		const overdue = Date.now() - lastTs >= intervalMs;
		if (overdue) {
			// Delay 10s after mount to avoid blocking initial page render
			const initTimer = setTimeout(() => {
				void runBackup();
			}, 10_000);

			timerRef.current = setInterval(() => {
				void runBackup();
			}, intervalMs);

			return () => {
				clearTimeout(initTimer);
				if (timerRef.current) clearInterval(timerRef.current);
			};
		}

		// Schedule next backup at the right time
		const remaining = intervalMs - (Date.now() - lastTs);
		const nextTimer = setTimeout(() => {
			void runBackup();
			timerRef.current = setInterval(() => {
				void runBackup();
			}, intervalMs);
		}, remaining);

		return () => {
			clearTimeout(nextTimer);
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [enabled, intervalHours, runBackup]);
}
