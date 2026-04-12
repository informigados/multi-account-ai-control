"use client";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";
import { useState } from "react";

type AccountSecretViewerProps = {
	accountId: string;
	hasSecret: boolean;
	locale: AppLocale;
};

type SecretResponse = {
	accountId: string;
	hasSecret: boolean;
	secret: Record<string, string> | null;
};

function normalizeSecret(value: unknown): Array<{
	key: string;
	value: string;
}> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return [];
	}

	return Object.entries(value as Record<string, unknown>)
		.filter(([, entryValue]) => typeof entryValue === "string")
		.map(([key, entryValue]) => ({ key, value: entryValue as string }));
}

export function AccountSecretViewer({
	accountId,
	hasSecret,
	locale,
}: AccountSecretViewerProps) {
	const isPtBr = locale === "pt_BR";
	const ui = {
		title: isPtBr ? "Revelação de Segredo" : "Secret Reveal",
		noSecret: isPtBr
			? "Nenhum segredo criptografado está armazenado para esta conta."
			: "No encrypted secret payload is stored for this account.",
		protectedAccess: isPtBr
			? "Acesso protegido ao segredo"
			: "Protected secret access",
		subtitle: isPtBr
			? "Reautentique com sua senha para revelar o segredo desta conta."
			: "Re-authenticate with your password to reveal this account secret payload.",
		hideSecret: isPtBr ? "Ocultar Segredo" : "Hide Secret",
		passwordPlaceholder: isPtBr ? "Senha da conta" : "Account password",
		failedReveal: isPtBr
			? "Falha ao revelar segredo."
			: "Failed to reveal secret.",
		reauthenticating: isPtBr ? "Reautenticando..." : "Re-authenticating...",
		revealSecret: isPtBr ? "Revelar Segredo" : "Reveal Secret",
		securityHint: isPtBr
			? "Mostre o segredo somente quando necessário e oculte novamente após uso."
			: "Reveal secrets only when necessary and hide again after use.",
	};

	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [revealedSecret, setRevealedSecret] = useState<
		Array<{ key: string; value: string }>
	>([]);

	async function onReveal(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch(`/api/accounts/${accountId}/secret`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ password }),
			});

			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				setError(payload.message ?? ui.failedReveal);
				return;
			}

			const payload = (await response.json()) as SecretResponse;
			setRevealedSecret(normalizeSecret(payload.secret));
			setPassword("");
		} catch {
			setError(ui.failedReveal);
		} finally {
			setIsSubmitting(false);
		}
	}

	function onHide() {
		setRevealedSecret([]);
		setPassword("");
		setError(null);
	}

	if (!hasSecret) {
		return (
			<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
					{ui.title}
				</p>
				<p className="mt-2 text-sm text-muted-foreground">{ui.noSecret}</p>
			</article>
		);
	}

	return (
		<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
			<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
				{ui.title}
			</p>
			<h2 className="mt-1 text-lg font-semibold">{ui.protectedAccess}</h2>
			<p className="mt-2 text-sm text-muted-foreground">{ui.subtitle}</p>
			<p className="mt-1 text-xs text-muted-foreground">{ui.securityHint}</p>

			{revealedSecret.length > 0 ? (
				<div className="mt-4 space-y-2">
					<div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
						{revealedSecret.map((entry) => (
							<div
								key={entry.key}
								className="grid gap-1 border-b border-border/70 pb-2 text-xs last:border-b-0 last:pb-0"
							>
								<p className="uppercase tracking-[0.12em] text-muted-foreground">
									{entry.key}
								</p>
								<p className="break-all rounded bg-muted px-2 py-1 font-mono text-foreground">
									{entry.value}
								</p>
							</div>
						))}
					</div>
					<Button variant="outline" onClick={onHide}>
						{ui.hideSecret}
					</Button>
				</div>
			) : (
				<form onSubmit={onReveal} className="mt-4 space-y-3">
					<input
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder={ui.passwordPlaceholder}
						className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-primary transition focus:ring-2"
						required
					/>

					{error ? (
						<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
							{error}
						</p>
					) : null}

					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? ui.reauthenticating : ui.revealSecret}
					</Button>
				</form>
			)}
		</article>
	);
}
