"use client";

/**
 * SystemHealthPanel
 *
 * Fetches GET /api/health and renders a premium live system status panel.
 * Updates automatically every 60 seconds.
 * Shows: DB status, version, uptime, account counts, providers, snapshots,
 *        quota alerts (last 24h), TOTP entries, backups stored.
 */
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

type HealthMetrics = {
	accounts: { total: number; active: number; archived: number };
	providers: { total: number; active: number };
	snapshots: { total: number; last24h: number };
	alerts: { last24h: number };
	totp: { entries: number };
	backups: { stored: number };
};

type HealthData = {
	status: "ok" | "degraded" | "error";
	version: string;
	timestamp: string;
	uptime: number;
	db: "ok" | "error";
	metrics?: HealthMetrics;
};

type SystemHealthPanelProps = {
	locale?: AppLocale;
};

function UptimeDisplay({ seconds }: { seconds: number }) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0)
		return (
			<>
				{h}h {m}m
			</>
		);
	if (m > 0)
		return (
			<>
				{m}m {s}s
			</>
		);
	return <>{s}s</>;
}

function StatusDot({
	status,
}: { status: "ok" | "degraded" | "error" | "loading" }) {
	const cls =
		status === "ok"
			? "bg-success"
			: status === "degraded"
				? "bg-warning"
				: status === "loading"
					? "bg-muted-foreground/50 animate-pulse"
					: "bg-danger";
	return (
		<span
			className={`inline-block h-2 w-2 rounded-full ${cls}`}
			aria-hidden="true"
		/>
	);
}

function MetricCard({
	label,
	value,
	sub,
	accent,
}: {
	label: string;
	value: string | number;
	sub?: string;
	accent?: "success" | "warning" | "danger" | "info";
}) {
	const accentMap: Record<"success" | "warning" | "danger" | "info", string> = {
		success: "text-success",
		warning: "text-warning",
		danger: "text-danger",
		info: "text-info",
	};
	const accentCls = accent ? accentMap[accent] : "";

	return (
		<div className="rounded-lg border border-border bg-card/60 p-3 transition hover:bg-card/80">
			<p className="text-xs uppercase tracking-widest text-muted-foreground">
				{label}
			</p>
			<p className={`mt-1 text-2xl font-bold tabular-nums ${accentCls}`}>
				{value}
			</p>
			{sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
		</div>
	);
}

export function SystemHealthPanel({
	locale = "pt_BR",
}: SystemHealthPanelProps) {
	const isPt = locale === "pt_BR" || locale === "pt_PT";
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	const [health, setHealth] = useState<HealthData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [lastFetched, setLastFetched] = useState<Date | null>(null);

	const fetchHealth = useCallback(async () => {
		try {
			const res = await fetch("/api/health");
			if (res.ok) {
				const data = (await res.json()) as HealthData;
				setHealth(data);
				setLastFetched(new Date());
			}
		} catch {
			// silent
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchHealth();
		const interval = setInterval(() => void fetchHealth(), 60_000);
		return () => clearInterval(interval);
	}, [fetchHealth]);

	const ui = {
		title: text("Status do Sistema", "System Status"),
		desc: text(
			"Métricas ao vivo do servidor. Atualiza a cada 60 segundos.",
			"Live server metrics. Updates every 60 seconds.",
		),
		loading: text("Carregando...", "Loading..."),
		db: text("Banco de Dados", "Database"),
		version: text("Versão", "Version"),
		uptime: text("Uptime", "Uptime"),
		accounts: text("Contas", "Accounts"),
		providers: text("Provedores", "Providers"),
		snapshots: text("Snapshots", "Snapshots"),
		alerts24h: text("Alertas (24h)", "Alerts (24h)"),
		totp: text("TOTP", "TOTP"),
		backups: text("Backups", "Backups"),
		active: isPt ? "ativas" : "active",
		archived: isPt ? "arquivadas" : "archived",
		last24h: isPt ? "últ. 24h" : "last 24h",
		stored: isPt ? "armazenados" : "stored",
		lastUpdated: text("Última atualização", "Last updated"),
		refresh: text("Atualizar", "Refresh"),
	};

	const statusLabel =
		health?.status === "ok"
			? text("Operacional", "Operational")
			: health?.status === "degraded"
				? text("Degradado", "Degraded")
				: isLoading
					? text("Verificando...", "Checking...")
					: text("Erro", "Error");

	const m = health?.metrics;

	return (
		<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="inline-flex items-center gap-2 text-xl font-semibold">
						<StatusDot
							status={isLoading ? "loading" : (health?.status ?? "error")}
						/>
						{ui.title}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">{ui.desc}</p>
				</div>
				<div className="flex items-center gap-2">
					{lastFetched && (
						<span className="text-xs text-muted-foreground">
							{ui.lastUpdated}:{" "}
							{lastFetched.toLocaleTimeString(isPt ? "pt-BR" : "en-US")}
						</span>
					)}
					<button
						type="button"
						onClick={() => {
							setIsLoading(true);
							void fetchHealth();
						}}
						className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
					>
						<svg
							viewBox="0 0 20 20"
							fill="currentColor"
							className="h-3.5 w-3.5"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
								clipRule="evenodd"
							/>
						</svg>
						{ui.refresh}
					</button>
				</div>
			</div>

			{isLoading && !health ? (
				<div className="mt-4 grid animate-pulse gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((n) => (
						<div
							key={n}
							className="h-20 rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : (
				<>
					{/* Top row: infra metrics */}
					<div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
						<MetricCard
							label={text("Status", "Status")}
							value={statusLabel}
							accent={
								health?.status === "ok"
									? "success"
									: health?.status === "degraded"
										? "warning"
										: "danger"
							}
						/>
						<MetricCard
							label={ui.db}
							value={
								health?.db === "ok" ? (isPt ? "Online" : "Online") : "Offline"
							}
							accent={health?.db === "ok" ? "success" : "danger"}
						/>
						<MetricCard
							label={ui.version}
							value={`v${health?.version ?? "—"}`}
						/>
						<MetricCard
							label={ui.uptime}
							value={
								health?.uptime !== undefined
									? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`
									: "—"
							}
						/>
					</div>

					{/* Detailed metrics (authenticated) */}
					{m && (
						<div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
							<MetricCard
								label={ui.accounts}
								value={m.accounts.active}
								sub={`${m.accounts.archived} ${ui.archived}`}
								accent="info"
							/>
							<MetricCard
								label={ui.providers}
								value={m.providers.active}
								sub={`${m.providers.total} total`}
							/>
							<MetricCard
								label={ui.snapshots}
								value={m.snapshots.total}
								sub={`${m.snapshots.last24h} ${ui.last24h}`}
							/>
							<MetricCard
								label={ui.alerts24h}
								value={m.alerts.last24h}
								accent={m.alerts.last24h > 0 ? "warning" : undefined}
							/>
							<MetricCard label={ui.totp} value={m.totp.entries} />
							<MetricCard
								label={ui.backups}
								value={m.backups.stored}
								sub={ui.stored}
								accent={m.backups.stored > 0 ? "success" : undefined}
							/>
						</div>
					)}
				</>
			)}
		</section>
	);
}
