"use client";

import type { AccountView } from "@/features/accounts/account-types";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import type { UsageSnapshotView } from "@/features/usage/usage-types";
import type { AppLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { useMemo, useState } from "react";

type SummaryMetrics = {
	totalAccounts: number;
	activeAccounts: number;
	warningAccounts: number;
	exhaustedAccounts: number;
	providersCount: number;
	nearResetCount: number;
	errorAccounts: number;
};

type RecentSnapshot = UsageSnapshotView & {
	account?: {
		id: string;
		displayName: string;
		identifier: string;
		provider?: {
			id: string;
			name: string;
			slug: string;
			color: string | null;
		};
	};
};

type DashboardCommandCenterProps = {
	summary: SummaryMetrics;
	accounts: AccountView[];
	recentSnapshots: RecentSnapshot[];
	locale: AppLocale;
};

function usagePercent(account: AccountView) {
	return account.latestUsage?.usedPercent ?? 0;
}

function resetCountdown(value: string | null) {
	if (!value) return "no-reset-window";

	const target = new Date(value).getTime();
	if (Number.isNaN(target)) return "no-reset-window";

	const diff = target - Date.now();
	if (diff <= 0) return "reset-window-reached";

	const totalMinutes = Math.floor(diff / 60000);
	const days = Math.floor(totalMinutes / (60 * 24));
	const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
	const minutes = totalMinutes % 60;

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}

const widgetOrder: Array<{
	key: keyof SummaryMetrics;
	labelKey:
		| "totalAccounts"
		| "active"
		| "warning"
		| "exhausted"
		| "providers"
		| "nearReset"
		| "error";
	tone: "info" | "success" | "warning" | "danger";
}> = [
	{ key: "totalAccounts", labelKey: "totalAccounts", tone: "info" },
	{ key: "activeAccounts", labelKey: "active", tone: "success" },
	{ key: "warningAccounts", labelKey: "warning", tone: "warning" },
	{ key: "exhaustedAccounts", labelKey: "exhausted", tone: "danger" },
	{ key: "providersCount", labelKey: "providers", tone: "info" },
	{ key: "nearResetCount", labelKey: "nearReset", tone: "warning" },
	{ key: "errorAccounts", labelKey: "error", tone: "danger" },
];

export function DashboardCommandCenter({
	summary,
	accounts,
	recentSnapshots,
	locale,
}: DashboardCommandCenterProps) {
	const isPtBr = locale === "pt_BR";
	const ui = {
		totalAccounts: isPtBr ? "Total de contas" : "Total Accounts",
		active: isPtBr ? "Ativas" : "Active",
		warning: isPtBr ? "Atenção" : "Warning",
		exhausted: isPtBr ? "Esgotadas" : "Exhausted",
		providers: isPtBr ? "Provedores" : "Providers",
		nearReset: isPtBr ? "Próx. reset (24h)" : "Near Reset (24h)",
		error: isPtBr ? "Erro" : "Error",
		accountCards: isPtBr ? "Cartões de Conta" : "Account Cards",
		accountCountSuffix: isPtBr ? "contas" : "accounts",
		noAccounts: isPtBr
			? "Nenhuma conta cadastrada."
			: "No accounts registered.",
		unknownProvider: isPtBr ? "Provedor desconhecido" : "Unknown provider",
		noPlan: isPtBr ? "Sem plano" : "No plan",
		usage: isPtBr ? "Uso" : "Usage",
		noResetWindow: isPtBr ? "Sem janela de reset" : "No reset window",
		resetReached: isPtBr ? "Janela de reset atingida" : "Reset window reached",
		resetIn: isPtBr ? "Reset em" : "Reset in",
		lastMeasure: isPtBr ? "Última medição" : "Last measure",
		riskQueue: isPtBr ? "Fila de Risco" : "Risk Queue",
		riskSubtitle: isPtBr
			? "Contas que exigem atenção imediata."
			: "Accounts needing attention now.",
		noHighRisk: isPtBr
			? "Nenhuma conta em alto risco."
			: "No high-risk accounts.",
		recentMeasurements: isPtBr ? "Medições Recentes" : "Recent Measurements",
		noSnapshots: isPtBr
			? "Sem medições de uso ainda."
			: "No usage snapshots yet.",
		unknownAccount: isPtBr ? "Conta desconhecida" : "Unknown account",
		statusActive: isPtBr ? "Ativa" : "Active",
		statusWarning: isPtBr ? "Atenção" : "Warning",
		statusLimited: isPtBr ? "Limitada" : "Limited",
		statusExhausted: isPtBr ? "Esgotada" : "Exhausted",
		statusDisabled: isPtBr ? "Desativada" : "Disabled",
		statusError: isPtBr ? "Erro" : "Error",
		statusArchived: isPtBr ? "Arquivada" : "Archived",
	};

	const [accountCards, setAccountCards] = useState(accounts);

	function updateAccountUsage(
		accountId: string,
		snapshot: NonNullable<AccountView["latestUsage"]>,
	) {
		setAccountCards((previous) =>
			previous.map((account) => {
				if (account.id !== accountId) return account;
				return {
					...account,
					latestUsage: snapshot,
					lastSyncAt: snapshot.measuredAt,
					nextResetAt: snapshot.resetAt ?? account.nextResetAt,
				};
			}),
		);
	}

	const highRiskAccounts = useMemo(
		() =>
			accountCards.filter(
				(account) =>
					account.status === "warning" ||
					account.status === "exhausted" ||
					account.status === "error" ||
					usagePercent(account) >= 85,
			),
		[accountCards],
	);

	const resetCountdownByAccountId = useMemo(() => {
		return Object.fromEntries(
			accountCards.map((account) => [
				account.id,
				resetCountdown(account.nextResetAt),
			]),
		);
	}, [accountCards]);

	function statusLabel(status: AccountView["status"]) {
		if (status === "active") return ui.statusActive;
		if (status === "warning") return ui.statusWarning;
		if (status === "limited") return ui.statusLimited;
		if (status === "exhausted") return ui.statusExhausted;
		if (status === "disabled") return ui.statusDisabled;
		if (status === "error") return ui.statusError;
		return ui.statusArchived;
	}

	return (
		<section className="space-y-5">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{widgetOrder.map((item) => (
					<article
						key={item.key}
						className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur"
					>
						<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
							{ui[item.labelKey]}
						</p>
						<p
							className={`mt-2 text-2xl font-semibold ${
								item.tone === "success"
									? "text-success"
									: item.tone === "warning"
										? "text-warning"
										: item.tone === "danger"
											? "text-danger"
											: "text-info"
							}`}
						>
							{summary[item.key]}
						</p>
					</article>
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-[2fr,1fr]">
				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">{ui.accountCards}</h2>
						<span className="text-sm text-muted-foreground">
							{accountCards.length} {ui.accountCountSuffix}
						</span>
					</div>

					{accountCards.length === 0 ? (
						<p className="text-sm text-muted-foreground">{ui.noAccounts}</p>
					) : (
						<div className="grid gap-3 md:grid-cols-2">
							{accountCards.map((account) => (
								<article
									key={account.id}
									className="rounded-xl border border-border bg-background/40 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold">
												{account.displayName}
											</h3>
											<p className="text-sm text-muted-foreground">
												{account.identifier}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{account.provider?.name ?? ui.unknownProvider} •{" "}
												{account.planName ?? ui.noPlan}
											</p>
										</div>
										<span
											className={`rounded-md px-2 py-1 text-xs ${
												account.status === "active"
													? "bg-success/15 text-success"
													: account.status === "warning" ||
															account.status === "limited"
														? "bg-warning/15 text-warning"
														: "bg-danger/15 text-danger"
											}`}
										>
											{statusLabel(account.status)}
										</span>
									</div>

									<div className="mt-3 space-y-1">
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>{ui.usage}</span>
											<span>{usagePercent(account).toFixed(1)}%</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-muted">
											<div
												className={`h-full ${
													usagePercent(account) >= 90
														? "bg-danger"
														: usagePercent(account) >= 70
															? "bg-warning"
															: "bg-success"
												}`}
												style={{
													width: `${Math.min(100, Math.max(0, usagePercent(account)))}%`,
												}}
											/>
										</div>
									</div>

									<div className="mt-3 space-y-1 text-xs text-muted-foreground">
										<p>
											{ui.resetIn}:{" "}
											{resetCountdownByAccountId[account.id] ===
											"no-reset-window"
												? ui.noResetWindow
												: resetCountdownByAccountId[account.id] ===
														"reset-window-reached"
													? ui.resetReached
													: resetCountdownByAccountId[account.id]}
										</p>
										<p>
											{ui.lastMeasure}:{" "}
											{formatDateTime(account.latestUsage?.measuredAt ?? null)}
										</p>
									</div>

									<div className="mt-4">
										<QuickUsageUpdate
											accountId={account.id}
											locale={locale}
											onSaved={(snapshot) =>
												updateAccountUsage(account.id, snapshot)
											}
										/>
									</div>
								</article>
							))}
						</div>
					)}
				</article>

				<div className="space-y-5">
					<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
						<h2 className="text-lg font-semibold">{ui.riskQueue}</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{ui.riskSubtitle}
						</p>
						{highRiskAccounts.length === 0 ? (
							<p className="mt-3 text-sm text-muted-foreground">
								{ui.noHighRisk}
							</p>
						) : (
							<ul className="mt-3 space-y-2">
								{highRiskAccounts.slice(0, 8).map((account) => (
									<li
										key={account.id}
										className="rounded-md border border-border bg-muted/30 px-3 py-2"
									>
										<p className="text-sm font-medium">{account.displayName}</p>
										<p className="text-xs text-muted-foreground">
											{statusLabel(account.status)} •{" "}
											{usagePercent(account).toFixed(1)}%
										</p>
									</li>
								))}
							</ul>
						)}
					</article>

					<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
						<h2 className="text-lg font-semibold">{ui.recentMeasurements}</h2>
						{recentSnapshots.length === 0 ? (
							<p className="mt-2 text-sm text-muted-foreground">
								{ui.noSnapshots}
							</p>
						) : (
							<ul className="mt-3 space-y-2">
								{recentSnapshots.map((snapshot) => (
									<li
										key={snapshot.id}
										className="rounded-md border border-border bg-muted/30 px-3 py-2"
									>
										<p className="text-sm font-medium">
											{snapshot.account?.displayName ?? ui.unknownAccount}
										</p>
										<p className="text-xs text-muted-foreground">
											{snapshot.usedPercent?.toFixed(1) ?? "-"}% •{" "}
											{formatDateTime(snapshot.measuredAt)}
										</p>
									</li>
								))}
							</ul>
						)}
					</article>
				</div>
			</div>
		</section>
	);
}
