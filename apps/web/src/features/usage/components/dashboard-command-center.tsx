"use client";

import type { AccountView } from "@/features/accounts/account-types";
import { ProviderBrand } from "@/features/providers/components/provider-brand";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import type { UsageSnapshotView } from "@/features/usage/usage-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import {
	AlertOctagon,
	AlertTriangle,
	CheckCircle2,
	Cpu,
	type LucideIcon,
	Timer,
	Users,
	XCircle,
} from "lucide-react";
import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type SummaryMetrics = {
	totalAccounts: number;
	activeAccounts: number;
	warningAccounts: number;
	exhaustedAccounts: number;
	providersCount: number;
	nearResetCount: number;
	errorAccounts: number;
};

/** Maximum number of high-risk accounts shown in the Risk Queue widget. */
const MAX_HIGH_RISK_ACCOUNTS_DISPLAY = 8;
/** Percentage bounds used for progress-bar clamping. */
const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

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

type WidgetItem = {
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
	icon: LucideIcon;
};

const widgetOrder: WidgetItem[] = [
	{
		key: "totalAccounts",
		labelKey: "totalAccounts",
		tone: "info",
		icon: Users,
	},
	{
		key: "activeAccounts",
		labelKey: "active",
		tone: "success",
		icon: CheckCircle2,
	},
	{
		key: "warningAccounts",
		labelKey: "warning",
		tone: "warning",
		icon: AlertTriangle,
	},
	{
		key: "exhaustedAccounts",
		labelKey: "exhausted",
		tone: "danger",
		icon: XCircle,
	},
	{ key: "providersCount", labelKey: "providers", tone: "info", icon: Cpu },
	{
		key: "nearResetCount",
		labelKey: "nearReset",
		tone: "warning",
		icon: Timer,
	},
	{
		key: "errorAccounts",
		labelKey: "error",
		tone: "danger",
		icon: AlertOctagon,
	},
];

const toneClasses = {
	info: {
		text: "text-info",
		bg: "bg-info/10",
		border: "border-info/20",
		icon: "text-info",
		bar: "bg-info",
	},
	success: {
		text: "text-success",
		bg: "bg-success/10",
		border: "border-success/20",
		icon: "text-success",
		bar: "bg-success",
	},
	warning: {
		text: "text-warning",
		bg: "bg-warning/10",
		border: "border-warning/20",
		icon: "text-warning",
		bar: "bg-warning",
	},
	danger: {
		text: "text-danger",
		bg: "bg-danger/10",
		border: "border-danger/20",
		icon: "text-danger",
		bar: "bg-danger",
	},
};

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
		riskQueueOverflow: (shown: number, total: number) =>
			text(
				`Exibindo ${shown} de ${total} contas em risco`,
				`Showing ${shown} of ${total} at-risk accounts`,
				`Mostrando ${shown} de ${total} cuentas en riesgo`,
				`显示 ${shown}/${total} 个高风险账号`,
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
	// The first tuple element is intentionally unused — calling setTick forces
	// a periodic re-render so reset countdowns stay up-to-date without a prop change.
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

	function statusTone(status: AccountView["status"]) {
		if (status === "active") return "success";
		if (status === "warning" || status === "limited") return "warning";
		return "danger";
	}

	return (
		<section className="space-y-5 page-enter">
			{/* Metric widgets — 7 items: 4 cols on xl, 2 on sm */}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{widgetOrder.map((item) => {
					const Icon = item.icon;
					const tone = toneClasses[item.tone];
					return (
						<article
							key={item.key}
							className={`card-hover relative overflow-hidden rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur ${tone.border}`}
						>
							{/* Colored top accent bar */}
							<div className={`absolute inset-x-0 top-0 h-0.5 ${tone.bar}`} />
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
										{ui[item.labelKey]}
									</p>
									<p
										className={`mt-2 text-2xl font-bold tabular-nums ${tone.text}`}
									>
										{summary[item.key]}
									</p>
								</div>
								<div className={`rounded-lg p-2 ${tone.bg}`}>
									<Icon className={`h-5 w-5 ${tone.icon}`} />
								</div>
							</div>
						</article>
					);
				})}
			</div>

			<div className="grid gap-5 xl:grid-cols-[2fr,1fr]">
				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">{ui.accountCards}</h2>
						<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
							{accountCards.length} {ui.accountCountSuffix}
						</span>
					</div>

					{accountCards.length === 0 ? (
						<p className="text-sm text-muted-foreground">{ui.noAccounts}</p>
					) : (
						<div className="grid gap-3 md:grid-cols-2">
							{accountCards.map((account) => {
								const pct = usagePercent(account);
								const tone = statusTone(account.status);
								const toneC = toneClasses[tone];
								return (
									<article
										key={account.id}
										className="card-hover rounded-xl border border-border bg-background/40 p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<h3 className="truncate text-base font-semibold">
													{account.displayName}
												</h3>
												<p className="truncate text-sm text-muted-foreground">
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
												className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
													tone === "success"
														? "bg-success/15 text-success"
														: tone === "warning"
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
												<span className={`font-medium ${toneC.text}`}>
													{pct.toFixed(1)}%
												</span>
											</div>
											<div className="h-1.5 overflow-hidden rounded-full bg-muted">
												<div
													className={`progress-fill progress-dynamic h-full rounded-full ${toneC.bar}`}
													style={
														{
															"--pw": `${Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct))}%`,
														} as CSSProperties
													}
												/>
											</div>
										</div>

										<div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
											<p>
												{ui.resetIn}:{" "}
												<span className="font-medium text-foreground">
													{resetCountdownByAccountId[account.id] ===
													"no-reset-window"
														? ui.noResetWindow
														: resetCountdownByAccountId[account.id] ===
																"reset-window-reached"
															? ui.resetReached
															: resetCountdownByAccountId[account.id]}
												</span>
											</p>
											<p>
												{ui.lastMeasure}:{" "}
												{formatDateTime(
													account.latestUsage?.measuredAt ?? null,
												)}
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
								);
							})}
						</div>
					)}
				</article>

				<div className="space-y-5">
					<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
						<div className="flex items-center gap-2">
							<AlertOctagon className="h-4 w-4 text-danger" />
							<h2 className="text-base font-semibold">{ui.riskQueue}</h2>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{ui.riskSubtitle}
						</p>
						{highRiskAccounts.length === 0 ? (
							<p className="mt-3 text-sm text-success">{ui.noHighRisk}</p>
						) : (
							<>
								<ul className="mt-3 space-y-2" aria-label={ui.riskQueue}>
									{highRiskAccounts
										.slice(0, MAX_HIGH_RISK_ACCOUNTS_DISPLAY)
										.map((account) => {
											const pct = usagePercent(account);
											return (
												<li
													key={account.id}
													className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
												>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium">
															{account.displayName}
														</p>
														<p className="text-xs text-muted-foreground">
															{statusLabel(account.status)} • {pct.toFixed(1)}%
														</p>
													</div>
													<div className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
														<div
															className={`progress-fill progress-dynamic h-full rounded-full ${
																pct >= 90 ? "bg-danger" : "bg-warning"
															}`}
															style={
																{
																	"--pw": `${Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, pct))}%`,
																} as CSSProperties
															}
														/>
													</div>
												</li>
											);
										})}
								</ul>
								{highRiskAccounts.length > MAX_HIGH_RISK_ACCOUNTS_DISPLAY ? (
									<p className="mt-2 text-center text-xs text-muted-foreground">
										{ui.riskQueueOverflow(
											MAX_HIGH_RISK_ACCOUNTS_DISPLAY,
											highRiskAccounts.length,
										)}
									</p>
								) : null}
							</>
						)}
					</article>

					<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
						<h2 className="text-base font-semibold">{ui.recentMeasurements}</h2>
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
										<p className="truncate text-sm font-medium">
											{snapshot.account?.displayName ?? ui.unknownAccount}
										</p>
										<p className="text-xs text-muted-foreground">
											<span className="font-medium text-foreground">
												{snapshot.usedPercent != null
													? `${snapshot.usedPercent.toFixed(1)}%`
													: "-"}
											</span>{" "}
											• {formatDateTime(snapshot.measuredAt)}
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
