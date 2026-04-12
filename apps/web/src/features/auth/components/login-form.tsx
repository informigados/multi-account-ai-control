"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormProps = {
	locale: AppLocale;
};

export function LoginForm({ locale }: LoginFormProps) {
	const t = getDictionary(locale);
	const router = useRouter();
	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForgotPassword, setShowForgotPassword] = useState(false);
	const [resetEmail, setResetEmail] = useState("");
	const [isSendingReset, setIsSendingReset] = useState(false);
	const [resetFeedback, setResetFeedback] = useState<string | null>(null);
	const [resetError, setResetError] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier, password }),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;

				if (response.status === 401) {
					setError(t.login.errorInvalidCredentials);
					return;
				}

				setError(payload?.message ?? t.login.errorLoginFailed);
				return;
			}

			router.push("/");
			router.refresh();
		} catch {
			setError(t.login.errorLoginFailed);
		} finally {
			setIsLoading(false);
		}
	}

	async function onRequestPasswordReset(
		event: React.FormEvent<HTMLFormElement>,
	) {
		event.preventDefault();
		setResetFeedback(null);
		setResetError(null);
		setIsSendingReset(true);

		try {
			const response = await fetch("/api/auth/password-reset/request", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: resetEmail }),
			});

			const payload = (await response.json().catch(() => null)) as {
				message?: string;
			} | null;

			if (!response.ok) {
				setResetError(payload?.message ?? t.login.resetRequestError);
				return;
			}

			setResetFeedback(payload?.message ?? t.login.resetRequestSuccess);
		} catch {
			setResetError(t.login.resetRequestError);
		} finally {
			setIsSendingReset(false);
		}
	}

	return (
		<div className="space-y-4">
			<form onSubmit={onSubmit} className="space-y-4">
				<div className="space-y-2">
					<label
						htmlFor="identifier"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
					>
						<Mail className="h-3.5 w-3.5" />
						{t.login.identifierLabel}
					</label>
					<input
						id="identifier"
						type="text"
						autoComplete="username"
						value={identifier}
						onChange={(event) => setIdentifier(event.target.value)}
						className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						placeholder={t.login.identifierPlaceholder}
						required
					/>
				</div>

				<div className="space-y-2">
					<label
						htmlFor="password"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
					>
						<KeyRound className="h-3.5 w-3.5" />
						{t.login.passwordLabel}
					</label>
					<input
						id="password"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						placeholder="••••••••"
						required
					/>
				</div>

				{error ? (
					<p
						aria-live="polite"
						className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
					>
						{error}
					</p>
				) : null}

				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading ? t.login.submitting : t.login.submit}
				</Button>
			</form>

			<div className="pt-1">
				<button
					type="button"
					className="text-sm text-primary hover:underline"
					onClick={() => {
						setShowForgotPassword((value) => !value);
						setResetFeedback(null);
						setResetError(null);
					}}
				>
					{t.login.forgotPassword}
				</button>
			</div>

			{showForgotPassword ? (
				<div className="rounded-lg border border-border bg-muted/30 p-3">
					<p className="text-sm font-medium">{t.login.resetRequestTitle}</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{t.login.resetRequestDescription}
					</p>
					<form className="mt-3 space-y-3" onSubmit={onRequestPasswordReset}>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="reset-email"
							>
								{t.login.resetRequestEmailLabel}
							</label>
							<input
								id="reset-email"
								type="email"
								autoComplete="email"
								value={resetEmail}
								onChange={(event) => setResetEmail(event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								placeholder="admin@local"
								required
							/>
						</div>
						{resetFeedback ? (
							<p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
								{resetFeedback}
							</p>
						) : null}
						{resetError ? (
							<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
								{resetError}
							</p>
						) : null}
						<Button type="submit" variant="outline" disabled={isSendingReset}>
							{isSendingReset
								? t.login.resetRequestSubmitting
								: t.login.resetRequestSubmit}
						</Button>
					</form>
				</div>
			) : null}
		</div>
	);
}
