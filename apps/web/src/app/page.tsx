import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { presentAccount } from "@/features/accounts/account-presenter";
import { ScheduledBackupRunner } from "@/features/imports-exports/components/scheduled-backup-runner";
import { AutoSnapshotOrchestrator } from "@/features/usage/components/auto-snapshot-orchestrator";
import { DashboardCommandCenter } from "@/features/usage/components/dashboard-command-center";
import { presentUsageSnapshot } from "@/features/usage/usage-presenter";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Home() {
	const user = await getServerSessionUser();
	if (!user) {
		redirect("/login");
	}
	const t = getDictionary(user.locale);
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(user.locale, { pt, en, es, zhCN });

	const now = new Date();
	const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	const [
		statusGroups,
		providersCount,
		nearResetCount,
		accounts,
		recentSnapshots,
	] = await Promise.all([
		db.account.groupBy({
			by: ["status"],
			where: { archivedAt: null },
			_count: { _all: true },
		}),
		db.provider.count({ where: { isActive: true } }),
		db.account.count({
			where: {
				archivedAt: null,
				nextResetAt: {
					gte: now,
					lte: next24h,
				},
			},
		}),
		db.account.findMany({
			where: { archivedAt: null },
			orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
			take: 12,
			include: {
				provider: {
					select: {
						id: true,
						name: true,
						slug: true,
						icon: true,
						color: true,
					},
				},
				usageSnapshots: {
					orderBy: { measuredAt: "desc" },
					take: 1,
				},
			},
		}),
		db.usageSnapshot.findMany({
			orderBy: { measuredAt: "desc" },
			take: 10,
			include: {
				account: {
					select: {
						id: true,
						displayName: true,
						identifier: true,
						provider: {
							select: {
								id: true,
								name: true,
								slug: true,
								icon: true,
								color: true,
							},
						},
					},
				},
			},
		}),
	]);
	const statusCounts = new Map(
		statusGroups.map((entry) => [entry.status, entry._count._all]),
	);
	const totalAccounts = Array.from(statusCounts.values()).reduce(
		(acc, count) => acc + count,
		0,
	);
	const activeAccounts = statusCounts.get("active") ?? 0;
	const warningAccounts = statusCounts.get("warning") ?? 0;
	const exhaustedAccounts = statusCounts.get("exhausted") ?? 0;
	const errorAccounts = statusCounts.get("error") ?? 0;

	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<AppShellHeader
					username={user.username}
					locale={user.locale}
					currentPath="/"
				/>
				<div className="page-enter">
					<h1 className="text-3xl font-semibold md:text-4xl">
						{t.pages.dashboard.title}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.dashboard.description}
					</p>
				</div>
				<PageGuide
					title={text(
						"Guia Rápido do Dashboard",
						"Dashboard Quick Guide",
						"Guía rápida del panel",
						"仪表盘快速指南",
					)}
					items={[
						text(
							"Os cards superiores resumem risco operacional em tempo real por status e janela de reset.",
							"Top cards summarize real-time operational risk by status and reset window.",
							"Las tarjetas superiores resumen el riesgo operativo en tiempo real por estado y ventana de reinicio.",
							"顶部卡片按状态与重置窗口实时汇总运营风险。",
						),
						text(
							"Barras de uso: até 69% (normal), 70-89% (atenção), 90%+ (crítico).",
							"Usage bars: up to 69% (normal), 70-89% (warning), 90%+ (critical).",
							"Barras de uso: hasta 69% (normal), 70-89% (atención), 90%+ (crítico).",
							"用量条：≤69%（正常），70-89%（警告），90%+（高危）。",
						),
						text(
							"Use 'Atualizar uso' nos cards de conta para registrar medições sem sair da tela.",
							"Use 'Update usage' in account cards to register measurements without leaving this screen.",
							"Usa 'Actualizar uso' en las tarjetas de cuenta para registrar mediciones sin salir de la pantalla.",
							"在账号卡片中使用“更新用量”可直接记录测量，无需离开当前页面。",
						),
					]}
				/>
				{/* Auto-snapshot polling — saves usage snapshots every N minutes */}
				<AutoSnapshotOrchestrator accounts={accounts.map(presentAccount)} />
				{/* Scheduled backup — creates automatic backups every 24h in web mode */}
				<ScheduledBackupRunner />
				<DashboardCommandCenter
					summary={{
						totalAccounts,
						activeAccounts,
						warningAccounts,
						exhaustedAccounts,
						providersCount,
						nearResetCount,
						errorAccounts,
					}}
					accounts={accounts.map(presentAccount)}
					recentSnapshots={recentSnapshots.map(presentUsageSnapshot)}
					locale={user.locale}
				/>
			</div>
		</main>
	);
}
