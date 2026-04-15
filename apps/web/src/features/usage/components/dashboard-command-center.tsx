"use client";

import type { AccountView } from "@/features/accounts/account-types";
import { ProviderBrand } from "@/features/providers/components/provider-brand";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import type { UsageSnapshotView } from "@/features/usage/usage-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

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
			icon?: string | null;
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
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });
	const ui = {
		totalAccounts: text(
			"Total de contas",
			"Total Accounts",
			"Total de cuentas",
			"账户总数",
		),
		active: text("Ativas", "Active", "Activas", "活跃"),
		warning: text("Atenção", "Warning", "Atención", "警告"),
		exhausted: text("Esgotadas", "Exhausted", "Agotadas", "已耗尽"),
		providers: text("Provedores", "Providers", "Proveedores", "服务商"),
		nearReset: text(
			"Próx. reset (24h)",
			"Near Reset (24h)",
			"Próx. reinicio (24h)",
			"临近重置 (24h)",
		),
		error: text("Erro", "Error", "Error", "错误"),
		accountCards: text(
			"Cartões de Conta",
			"Account Cards",
			"Tarjetas de cuenta",
			"账号卡片",
		),
		accountCountSuffix: text("contas", "accounts", "cuentas", "个账号"),
		noAccounts: text(
			"Nenhuma conta cadastrada.",
			"No accounts registered.",
			"No hay cuentas registradas.",
			"暂无已登记账号。",
		),
		unknownProvider: text(
			"Provedor desconhecido",
			"Unknown provider",
			"Proveedor desconocido",
			"未知服务商",
		),
		noPlan: text("Sem plano", "No plan", "Sin plan", "无套餐"),
		usage: text("Uso", "Usage", "Uso", "用量"),
		noResetWindow: text(
			"Sem janela de reset",
			"No reset window",
			"Sin ventana de reinicio",
			"无重置窗口",
		),
		resetReached: text(
			"Janela de reset atingida",
			"Reset window reached",
			"Ventana de reinicio alcanzada",
			"已到达重置窗口",
		),
		resetIn: text("Reset em", "Reset in", "Reinicio en", "重置于"),
		lastMeasure: text(
			"Última medição",
			"Last measure",
			"Última medición",
			"最近测量",
		),
		riskQueue: text(
			"Fila de Risco",
			"Risk Queue",
			"Cola de riesgo",
			"风险队列",
		),
		riskSubtitle: text(
			"Contas que exigem atenção imediata.",
			"Accounts needing attention now.",
			"Cuentas que requieren atención inmediata.",
			"需要立即关注的账号。",
		),
		noHighRisk: text(
			"Nenhuma conta em alto risco.",
			"No high-risk accounts.",
			"No hay cuentas de alto riesgo.",
			"暂无高风险账号。",
		),
		recentMeasurements: text(
			"Medições Recentes",
			"Recent Measurements",
			"Mediciones recientes",
			"最近测量",
		),
		noSnapshots: text(
			"Sem medições de uso ainda.",
			"No usage snapshots yet.",
			"Aún no hay mediciones de uso.",
			"尚无用量快照。",
		),
		unknownAccount: text(
			"Conta desconhecida",
			"Unknown account",
			"Cuenta desconocida",
			"未知账号",
		),
		statusActive: text("Ativa", "Active", "Activa", "活跃"),
		statusWarning: text("Atenção", "Warning", "Atención", "警告"),
		statusLimited: text("Limitada", "Limited", "Limitada", "受限"),
		statusExhausted: text("Esgotada", "Exhausted", "Agotada", "已耗尽"),
		statusDisabled: text("Desativada", "Disabled", "Desactivada", "已禁用"),
		statusError: text("Erro", "Error", "Error", "错误"),
		statusArchived: text("Arquivada", "Archived", "Archivada", "已归档"),
	};

	const [accountCards, setAccountCards] = useState(accounts);
	// Tick every 60 seconds to refresh reset countdown values in real time.
	const [, setTick] = useState(0);
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
	useEffect(() => {
		tickRef.current = setInterval(() => setTick((n) => n + 1), 60_000);
		return () => {
			if (tickRef.current !== null) clearInterval(tickRef.current);
		};
	}, []);

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
		<section className="space-y-5 page-enter">
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
									className="card-hover rounded-xl border border-border bg-background/40 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold">
												{account.displayName}
											</h3>
											<p className="text-sm text-muted-foreground">
												{account.identifier}
											</p>
											<div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
												<ProviderBrand
													name={account.provider?.name ?? ui.unknownProvider}
													icon={account.provider?.icon}
													color={account.provider?.color}
													size="sm"
												/>
												<span aria-hidden>•</span>
												<span className="truncate">
													{account.planName ?? ui.noPlan}
												</span>
											</div>
										</div>
										<span
											className={`rounded-md px-2 py-1 text-xs font-medium ${
												account.status === "active"
													? "bg-success/15 text-success"
													: account.status === "warning" ||
															account.status === "limited"
														? "bg-warning/15 text-warning"
														: "badge-critical bg-danger/15 text-danger"
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
												className={`progress-fill h-full rounded-full ${
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
