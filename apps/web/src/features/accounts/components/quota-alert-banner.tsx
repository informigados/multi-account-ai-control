"use client";

import type { AccountView } from "@/features/accounts/account-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useState } from "react";

type QuotaAlertBannerProps = {
	accounts: AccountView[];
	thresholdPercent: number;
	locale?: AppLocale;
};

export function QuotaAlertBanner({
	accounts,
	thresholdPercent,
	locale = "pt_BR",
}: QuotaAlertBannerProps) {
	const [dismissed, setDismissed] = useState(false);

	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	const criticalAccounts = accounts.filter(
		(a) =>
			a.status !== "archived" &&
			(a.latestUsage?.usedPercent ?? 0) >= thresholdPercent,
	);

	if (criticalAccounts.length === 0 || dismissed) return null;

	const count = criticalAccounts.length;

	const ui = {
		message: text(
			`${count} conta${count !== 1 ? "s" : ""} com uso acima de ${thresholdPercent}%`,
			`${count} account${count !== 1 ? "s" : ""} above ${thresholdPercent}% usage`,
		),
		details: text(
			criticalAccounts
				.slice(0, 3)
				.map(
					(a) =>
						`${a.displayName} (${Math.round(a.latestUsage?.usedPercent ?? 0)}%)`,
				)
				.join(" · ") + (count > 3 ? ` +${count - 3}` : ""),
			criticalAccounts
				.slice(0, 3)
				.map(
					(a) =>
						`${a.displayName} (${Math.round(a.latestUsage?.usedPercent ?? 0)}%)`,
				)
				.join(" · ") + (count > 3 ? ` +${count - 3}` : ""),
		),
		dismiss: text("Dispensar", "Dismiss"),
	};

	return (
		<div
			role="alert"
			aria-live="polite"
			className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
		>
			<div className="flex items-start gap-2.5">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="mt-0.5 h-4 w-4 shrink-0"
					role="img"
					aria-label="Alerta"
				>
					<title>Alerta de cota</title>
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
				<div>
					<p className="font-semibold">{ui.message}</p>
					{ui.details && (
						<p className="mt-0.5 text-xs opacity-80">{ui.details}</p>
					)}
				</div>
			</div>
			<button
				type="button"
				onClick={() => setDismissed(true)}
				aria-label={ui.dismiss}
				className="shrink-0 rounded-md p-1 opacity-70 transition hover:opacity-100"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3.5 w-3.5"
					role="img"
					aria-label={ui.dismiss}
				>
					<title>{ui.dismiss}</title>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	);
}
