"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const LOCK_STATE_KEY = "maac:idle-locked";
const LOCK_NOW_EVENT = "maac:lock-now";

type IdleLockScreenProps = {
	locale: AppLocale;
};

function isProtectedPath(pathname: string) {
	return pathname !== "/login";
}

export function IdleLockScreen({ locale }: IdleLockScreenProps) {
	const t = getDictionary(locale);
	const pathname = usePathname();
	const router = useRouter();
	const lockTimerRef = useRef<number | null>(null);
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

	const resetIdleTimer = useCallback(() => {
		if (!isProtectedPath(pathname) || isLocked) return;

		if (lockTimerRef.current !== null) {
			window.clearTimeout(lockTimerRef.current);
		}

		lockTimerRef.current = window.setTimeout(() => {
			lockSession();
		}, DEFAULT_IDLE_TIMEOUT_MS);
	}, [isLocked, lockSession, pathname]);

	useEffect(() => {
		if (!isProtectedPath(pathname)) {
			unlockSession();
			if (lockTimerRef.current !== null) {
				window.clearTimeout(lockTimerRef.current);
				lockTimerRef.current = null;
			}
			return;
		}

		const persistedLock = sessionStorage.getItem(LOCK_STATE_KEY) === "1";
		if (persistedLock) {
			setIsLocked(true);
		}

		resetIdleTimer();

		const onActivity = () => {
			resetIdleTimer();
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
			if (lockTimerRef.current !== null) {
				window.clearTimeout(lockTimerRef.current);
				lockTimerRef.current = null;
			}
		};
	}, [lockSession, pathname, resetIdleTimer, unlockSession]);

	useEffect(() => {
		if (!isLocked) return;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isLocked]);

	async function onUnlock(event: React.FormEvent<HTMLFormElement>) {
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

	async function onLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		unlockSession();
		router.push("/login");
		router.refresh();
	}

	if (!isProtectedPath(pathname) || !isLocked) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-4">
			<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Idle Protection
				</p>
				<h2 className="mt-2 text-2xl font-semibold">{t.idleLock.title}</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					{t.idleLock.subtitle}
				</p>

				<form onSubmit={onUnlock} className="mt-5 space-y-3">
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
			</div>
		</div>
	);
}
