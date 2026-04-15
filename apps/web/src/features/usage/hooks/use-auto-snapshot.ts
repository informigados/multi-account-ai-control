"use client";

/**
 * useAutoSnapshot
 *
 * Client-side hook that polls the quota-config interval and,
 * when a QuickUsageUpdate saves a snapshot, also records it
 * persistently via POST /api/accounts/[id]/usage.
 *
 * More specifically, this hook:
 *  1. Reads the refreshIntervalMinutes from the stored quota config.
 *  2. Every N minutes, calls POST /api/accounts/[id]/usage with the
 *     latest {usedTokens, totalTokens, usedPercent} to create a snapshot
 *     automatically — satisfying the "Salvar snapshot automático" roadmap item.
 *  3. Calls onSnapshot(snapshot) so the parent can update UI.
 *
 * This works in web mode (no Tauri required) because the snapshot is
 * created from the last known usage values held in state.
 */
import { useCallback, useEffect, useRef } from "react";

export type SnapshotPayload = {
	usedTokens: number | null;
	totalTokens: number | null;
	usedPercent: number;
	resetAt?: string | null;
};

type UseAutoSnapshotOptions = {
	accountId: string;
	/** Latest usage values to auto-save */
	latestUsage: SnapshotPayload | null;
	/** Called after a snapshot is persisted */
	onSnapshot?: (saved: SnapshotPayload) => void;
	/** Manual override of interval in minutes (0 = disabled) */
	intervalMinutes?: number;
};

const DEFAULT_INTERVAL_MIN = 10;
const QUOTA_CONFIG_KEY = "app.quota_config";
const QUOTA_CONFIG_LS_CACHE = "maicq-quota-interval-minutes";

/** Read interval from localStorage cache (refreshed by settings page). */
function getCachedIntervalMinutes(): number {
	try {
		const raw = localStorage.getItem(QUOTA_CONFIG_LS_CACHE);
		if (raw) {
			const n = Number.parseInt(raw, 10);
			if (!Number.isNaN(n) && n > 0) return n;
		}
	} catch {
		// SSR or blocked storage
	}
	return DEFAULT_INTERVAL_MIN;
}

export function useAutoSnapshot({
	accountId,
	latestUsage,
	onSnapshot,
	intervalMinutes,
}: UseAutoSnapshotOptions) {
	const latestRef = useRef(latestUsage);
	latestRef.current = latestUsage;
	const onSnapshotRef = useRef(onSnapshot);
	onSnapshotRef.current = onSnapshot;

	// Fetch interval from API and cache in localStorage
	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
	useEffect(() => {
		async function fetchInterval() {
			try {
				const res = await fetch("/api/settings/quota-config");
				if (!res.ok) return;
				const data = (await res.json()) as {
					config: { refreshIntervalMinutes: number };
				};
				const mins = data.config.refreshIntervalMinutes ?? DEFAULT_INTERVAL_MIN;
				try {
					localStorage.setItem(QUOTA_CONFIG_LS_CACHE, String(mins));
				} catch {
					// ignore blocked storage
				}
			} catch {
				// silent — will use cached value
			}
		}
		void fetchInterval();
		// Suppress — intentionally runs once per mount
	}, [QUOTA_CONFIG_KEY]);

	const saveSnapshot = useCallback(async () => {
		const usage = latestRef.current;
		if (!usage || usage.usedPercent === 0) return; // Skip empty data

		try {
			const body = {
				sourceType: "manual" as const,
				totalQuota: usage.totalTokens ?? undefined,
				usedQuota: usage.usedTokens ?? undefined,
				usedPercent: usage.usedPercent,
				resetAt: usage.resetAt ?? undefined,
				comments: "auto_poll",
			};
			const res = await fetch(`/api/accounts/${accountId}/usage`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				onSnapshotRef.current?.(usage);
			}
		} catch {
			// Silent — auto-snapshot failures should not disrupt UI
		}
	}, [accountId]);

	// Register polling interval
	useEffect(() => {
		const mins = intervalMinutes ?? getCachedIntervalMinutes();
		if (mins <= 0) return;
		const ms = mins * 60 * 1000;
		const timer = setInterval(() => void saveSnapshot(), ms);
		return () => clearInterval(timer);
	}, [intervalMinutes, saveSnapshot]);

	return { saveSnapshot };
}
