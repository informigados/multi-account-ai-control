"use client";

/**
 * useQuotaNotification
 *
 * Sends a quota-exceeded notification through the best available channel:
 *
 * 1. Tauri desktop: invokes `send_quota_alert` Tauri command → real OS toast.
 * 2. Web browser: uses the Web Notifications API (with permission request).
 * 3. Fallback: logs to console (no permissions, no Tauri).
 *
 * Also posts to POST /api/usage/quota-alert to persist the event in the audit log.
 *
 * Usage:
 *   const { notify } = useQuotaNotification();
 *   notify({ accountName: "Gemini CLI", percent: 92 });
 */
import { useCallback, useEffect, useRef } from "react";

type QuotaNotifyPayload = {
	accountId?: string;
	accountName: string;
	percent: number;
};

/** Check if running inside Tauri desktop environment */
function isTauri(): boolean {
	return (
		typeof window !== "undefined" &&
		"__TAURI_INTERNALS__" in window &&
		(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !==
			undefined
	);
}

type TauriInternals = {
	invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function getTauriInvoke(): TauriInternals["invoke"] | null {
	if (!isTauri()) return null;
	return (
		(window as unknown as { __TAURI_INTERNALS__?: TauriInternals })
			.__TAURI_INTERNALS__?.invoke ?? null
	);
}

async function requestBrowserNotificationPermission(): Promise<boolean> {
	if (typeof Notification === "undefined") return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	const result = await Notification.requestPermission();
	return result === "granted";
}

async function sendBrowserNotification(
	title: string,
	body: string,
): Promise<void> {
	const ok = await requestBrowserNotificationPermission();
	if (!ok) return;
	// eslint-disable-next-line no-new
	new Notification(title, {
		body,
		icon: "/icons/icon.png",
		tag: "quota-alert",
		requireInteraction: false,
	});
}

async function sendTauriNotification(
	title: string,
	body: string,
): Promise<void> {
	const invoke = getTauriInvoke();
	if (!invoke) return;
	await invoke("send_quota_alert", { title, body });
}

async function persistAlertLog(payload: QuotaNotifyPayload): Promise<void> {
	try {
		await fetch("/api/usage/quota-alert", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				accountId: payload.accountId,
				accountName: payload.accountName,
				usedPercent: payload.percent,
				message: `Quota at ${payload.percent.toFixed(1)}% for ${payload.accountName}`,
			}),
		});
	} catch {
		// Silent — audit log failure should not block the notification
	}
}

export function useQuotaNotification() {
	const permissionAskedRef = useRef(false);

	// Pre-request browser notification permission on mount (only once)
	useEffect(() => {
		if (permissionAskedRef.current) return;
		if (isTauri()) return; // Tauri handles its own permissions
		if (typeof Notification === "undefined") return;
		if (Notification.permission === "default") {
			permissionAskedRef.current = true;
			// Request without blocking — user may dismiss
			void requestBrowserNotificationPermission();
		}
	}, []);

	const notify = useCallback(async (payload: QuotaNotifyPayload) => {
		const title = `⚠️ Quota Alert: ${payload.accountName}`;
		const body = `Usage reached ${payload.percent.toFixed(1)}% — action may be needed.`;

		// 1. Persist in audit log (non-blocking)
		void persistAlertLog(payload);

		// 2. Send via the best available channel
		if (isTauri()) {
			await sendTauriNotification(title, body);
		} else {
			await sendBrowserNotification(title, body);
		}
	}, []);

	return { notify };
}
