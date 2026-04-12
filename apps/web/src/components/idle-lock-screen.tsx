"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { Clock3, LockKeyhole } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_IDLE_TIMEOUT_MINUTES = 10;
const LOCK_STATE_KEY = "maac:idle-locked";
const LOCK_NOW_EVENT = "maac:lock-now";

type IdleLockScreenProps = {
	locale: AppLocale;
};

type IdleLockConfig = {
	enabled: boolean;
	timeoutMinutes: number;
	requirePasswordOnUnlock: boolean;
};

const defaultIdleLockConfig: IdleLockConfig = {
	enabled: false,
	timeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
	requirePasswordOnUnlock: true,
};

function isProtectedPath(pathname: string) {
	return pathname !== "/login" && pathname !== "/reset-password";
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

	const timeoutMinutes =
		typeof raw.timeoutMinutes === "number" &&
		Number.isFinite(raw.timeoutMinutes)
			? Math.max(1, Math.min(240, Math.trunc(raw.timeoutMinutes)))
			: DEFAULT_IDLE_TIMEOUT_MINUTES;

	return {
		enabled: typeof raw.enabled === "boolean" ? raw.enabled : false,
		timeoutMinutes,
		requirePasswordOnUnlock:
			typeof raw.requirePasswordOnUnlock === "boolean"
				? raw.requirePasswordOnUnlock
				: true,
	};
}

export function IdleLockScreen({ locale }: IdleLockScreenProps) {
	const t = getDictionary(locale);
	const pathname = usePathname();
	const router = useRouter();
	const lockTimerRef = useRef<number | null>(null);
	const [idleLockConfig, setIdleLockConfig] = useState<IdleLockConfig>(
		defaultIdleLockConfig,
	);
	const [isLoadingIdleLockConfig, setIsLoadingIdleLockConfig] = useState(false);
	const [isLocked, setIsLocked] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const lockSession = useCallback(() => {
		setIsLocked(true);
		setPassword("");
		setError(null);
		sessionStorage.setItem(LOCK_STATE_KEY, "1");
	}, []);

	const unlockSession = useCallback(() => {
		setIsLocked(false);
		setPassword("");
		setError(null);
		sessionStorage.removeItem(LOCK_STATE_KEY);
	}, []);

	const clearIdleTimer = useCallback(() => {
		if (lockTimerRef.current !== null) {
			window.clearTimeout(lockTimerRef.current);
			lockTimerRef.current = null;
		}
	}, []);

	const resetIdleTimer = useCallback(() => {
		if (
			!isProtectedPath(pathname) ||
			isLocked ||
			!idleLockConfig.enabled ||
			isLoadingIdleLockConfig
		) {
			return;
		}

		clearIdleTimer();
		const timeoutMs = idleLockConfig.timeoutMinutes * 60 * 1000;

		lockTimerRef.current = window.setTimeout(() => {
			lockSession();
		}, timeoutMs);
	}, [
		clearIdleTimer,
		idleLockConfig.enabled,
		idleLockConfig.timeoutMinutes,
		isLoadingIdleLockConfig,
		isLocked,
		lockSession,
		pathname,
	]);

	useEffect(() => {
		if (!isProtectedPath(pathname)) {
			setIdleLockConfig(defaultIdleLockConfig);
			setIsLoadingIdleLockConfig(false);
			unlockSession();
			clearIdleTimer();
			return;
		}

		let isMounted = true;
		setIsLoadingIdleLockConfig(true);

		async function loadIdleLockConfig() {
			try {
				const response = await fetch("/api/settings/idle-lock", {
					method: "GET",
				});
				if (!response.ok) {
					throw new Error("Failed to load idle lock config.");
				}

				const payload = (await response.json()) as {
					config?: unknown;
				};

				if (isMounted) {
					setIdleLockConfig(normalizeIdleLockConfig(payload.config));
				}
			} catch {
				if (isMounted) {
					setIdleLockConfig(defaultIdleLockConfig);
				}
			} finally {
				if (isMounted) {
					setIsLoadingIdleLockConfig(false);
				}
			}
		}

		void loadIdleLockConfig();

		return () => {
			isMounted = false;
		};
	}, [clearIdleTimer, pathname, unlockSession]);

	useEffect(() => {
		if (!isProtectedPath(pathname) || isLoadingIdleLockConfig) {
			return;
		}

		if (!idleLockConfig.enabled) {
			unlockSession();
			clearIdleTimer();
			return;
		}

		const persistedLock = sessionStorage.getItem(LOCK_STATE_KEY) === "1";
		if (persistedLock) {
			setIsLocked(true);
		}

		resetIdleTimer();

		const onActivity = () => {
			if (!isLocked) {
				resetIdleTimer();
			}
		};
		const onManualLock = () => {
			lockSession();
		};

		window.addEventListener("mousemove", onActivity);
		window.addEventListener("keydown", onActivity);
		window.addEventListener("mousedown", onActivity);
		window.addEventListener("scroll", onActivity, { passive: true });
		window.addEventListener("touchstart", onActivity, { passive: true });
		window.addEventListener(LOCK_NOW_EVENT, onManualLock);

		return () => {
			window.removeEventListener("mousemove", onActivity);
			window.removeEventListener("keydown", onActivity);
			window.removeEventListener("mousedown", onActivity);
			window.removeEventListener("scroll", onActivity);
			window.removeEventListener("touchstart", onActivity);
			window.removeEventListener(LOCK_NOW_EVENT, onManualLock);
			clearIdleTimer();
		};
	}, [
		clearIdleTimer,
		idleLockConfig.enabled,
		isLoadingIdleLockConfig,
		isLocked,
		lockSession,
		pathname,
		resetIdleTimer,
		unlockSession,
	]);

	useEffect(() => {
		if (!isLocked) return;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isLocked]);

	async function onUnlockWithPassword(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/reauth", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ password }),
			});

			if (response.status === 401) {
				setError(t.idleLock.errorExpired);
				router.push("/login");
				router.refresh();
				return;
			}

			if (!response.ok) {
				setError(t.idleLock.errorGeneric);
				return;
			}

			unlockSession();
			resetIdleTimer();
		} catch {
			setError(t.idleLock.errorGeneric);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function onContinueSession() {
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/me", {
				method: "GET",
				cache: "no-store",
			});
			if (!response.ok) {
				setError(t.idleLock.errorExpired);
				router.push("/login");
				router.refresh();
				return;
			}

			unlockSession();
			resetIdleTimer();
		} catch {
			setError(t.idleLock.errorGeneric);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function onLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		unlockSession();
		router.push("/login");
		router.refresh();
	}

	if (!isProtectedPath(pathname) || !idleLockConfig.enabled || !isLocked) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-4">
			<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
				<div className="flex items-center gap-2">
					<span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
						<LockKeyhole className="h-4 w-4" />
					</span>
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						Idle Protection
					</p>
				</div>
				<h2 className="mt-2 text-2xl font-semibold">{t.idleLock.title}</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					{idleLockConfig.requirePasswordOnUnlock
						? t.idleLock.subtitle
						: t.idleLock.subtitleNoPassword}
				</p>
				<p className="mt-2 inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
					<Clock3 className="h-3.5 w-3.5" />
					{t.idleLock.timeoutLabel.replace(
						"{minutes}",
						String(idleLockConfig.timeoutMinutes),
					)}
				</p>

				{idleLockConfig.requirePasswordOnUnlock ? (
					<form onSubmit={onUnlockWithPassword} className="mt-5 space-y-3">
						<input
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder={t.idleLock.passwordPlaceholder}
							className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						/>
						{error ? (
							<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
								{error}
							</p>
						) : null}
						<div className="flex flex-wrap gap-2">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? t.idleLock.unlocking : t.idleLock.unlock}
							</Button>
							<Button type="button" variant="outline" onClick={onLogout}>
								{t.idleLock.logout}
							</Button>
						</div>
					</form>
				) : (
					<div className="mt-5 space-y-3">
						{error ? (
							<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
								{error}
							</p>
						) : null}
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								disabled={isSubmitting}
								onClick={onContinueSession}
							>
								{isSubmitting ? t.idleLock.continuing : t.idleLock.continue}
							</Button>
							<Button type="button" variant="outline" onClick={onLogout}>
								{t.idleLock.logout}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
