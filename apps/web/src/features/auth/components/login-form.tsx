"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
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

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="space-y-2">
				<label htmlFor="identifier" className="text-sm text-muted-foreground">
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
				<label htmlFor="password" className="text-sm text-muted-foreground">
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
	);
}
