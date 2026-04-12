"use client";

import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
	const t = getDictionary(DEFAULT_LOCALE);
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		if (!token) {
			setError(t.login.resetMissingToken);
			return;
		}
		if (password !== confirmPassword) {
			setError(t.login.resetPasswordsMismatch);
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch("/api/auth/password-reset/confirm", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token, password }),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				setError(payload.message ?? t.login.resetErrorGeneric);
				return;
			}

			setSuccess(true);
		} catch {
			setError(t.login.resetErrorGeneric);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="grid min-h-screen place-items-center px-6">
			<div className="w-full max-w-md rounded-2xl border border-border bg-card/90 p-6 shadow-lg backdrop-blur md:p-8">
				<div className="mb-6 flex items-center gap-2">
					<span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
						<KeyRound className="h-4 w-4" />
					</span>
					<div>
						<h1 className="text-2xl font-semibold">{t.login.resetTitle}</h1>
						<p className="text-sm text-muted-foreground">
							{t.login.resetSubtitle}
						</p>
					</div>
				</div>

				{success ? (
					<div className="space-y-4">
						<p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
							{t.login.resetSuccess}
						</p>
						<Link href="/login" className="inline-flex">
							<Button>{t.login.resetBackToLogin}</Button>
						</Link>
					</div>
				) : (
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="space-y-2">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="password"
							>
								{t.login.resetPasswordLabel}
							</label>
							<input
								id="password"
								type="password"
								autoComplete="new-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								placeholder={t.login.resetPasswordPlaceholder}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
						</div>

						<div className="space-y-2">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="confirm-password"
							>
								{t.login.resetConfirmPasswordLabel}
							</label>
							<input
								id="confirm-password"
								type="password"
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								placeholder={t.login.resetPasswordPlaceholder}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
						</div>

						{error ? (
							<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
								{error}
							</p>
						) : null}

						<Button type="submit" disabled={isSubmitting} className="w-full">
							{isSubmitting ? t.login.resetSubmitting : t.login.resetSubmit}
						</Button>
						<Link
							href="/login"
							className="inline-flex text-sm text-muted-foreground hover:underline"
						>
							{t.login.resetBackToLogin}
						</Link>
					</form>
				)}
			</div>
		</main>
	);
}
