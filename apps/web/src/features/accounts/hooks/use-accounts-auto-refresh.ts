"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseAccountsAutoRefreshOptions = {
	/** Interval in minutes. 0 = disabled. */
	intervalMinutes: number;
	/** Called on each tick. Should re-fetch account usage. */
	onRefresh: () => Promise<void> | void;
	/** Skip first immediate tick on mount? Default false */
	skipInitial?: boolean;
};

type AutoRefreshState = {
	lastRefreshedAt: Date | null;
	isRefreshing: boolean;
	/** Human-readable "X min ago" label */
	sinceLabel: string;
};

export function useAccountsAutoRefresh({
	intervalMinutes,
	onRefresh,
	skipInitial = false,
}: UseAccountsAutoRefreshOptions): AutoRefreshState {
	const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [sinceLabel, setSinceLabel] = useState("");
	const onRefreshRef = useRef(onRefresh);
	useEffect(() => {
		onRefreshRef.current = onRefresh;
	}, [onRefresh]);

	// Run one tick
	const runTick = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await onRefreshRef.current();
			setLastRefreshedAt(new Date());
		} finally {
			setIsRefreshing(false);
		}
	}, []);

	// Main interval
	useEffect(() => {
		if (intervalMinutes <= 0) return;

		if (!skipInitial) {
			void runTick();
		}

		const ms = intervalMinutes * 60 * 1000;
		const id = setInterval(() => void runTick(), ms);
		return () => clearInterval(id);
	}, [intervalMinutes, skipInitial, runTick]);

	// Update "X min ago" label every 30 seconds
	useEffect(() => {
		function update() {
			if (!lastRefreshedAt) {
				setSinceLabel("");
				return;
			}
			const diffMs = Date.now() - lastRefreshedAt.getTime();
			const diffMin = Math.floor(diffMs / 60_000);
			if (diffMin < 1) setSinceLabel("agora mesmo");
			else if (diffMin === 1) setSinceLabel("há 1 min");
			else setSinceLabel(`há ${diffMin} min`);
		}

		update();
		const id = setInterval(update, 30_000);
		return () => clearInterval(id);
	}, [lastRefreshedAt]);

	return { lastRefreshedAt, isRefreshing, sinceLabel };
}
