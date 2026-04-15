import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { presentAccount } from "@/features/accounts/account-presenter";
import { AccountSecretViewer } from "@/features/accounts/components/account-secret-viewer";
import { AuditLogViewer } from "@/features/audit/components/audit-log-viewer";
import { AccountNotesManager } from "@/features/notes/components/account-notes-manager";
import { ProviderBrand } from "@/features/providers/components/provider-brand";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import { UsageSparkline } from "@/features/usage/components/usage-sparkline";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { pickLocaleText } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

type AccountDetailsPageProps = {
	params: Promise<{ id: string }>;
};

export default async function AccountDetailsPage({
	params,
}: AccountDetailsPageProps) {
	const user = await getServerSessionUser();
	if (!user) {
		redirect("/login");
	}
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(user.locale, { pt, en, es, zhCN });

	const { id } = await params;
	const parsedId = z.string().uuid().safeParse(id);
	if (!parsedId.success) {
		notFound();
	}

	const account = await db.account.findUnique({
		where: { id: parsedId.data },
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
	});

	if (!account) {
		notFound();
	}

	const view = presentAccount(account);
	const usagePercent = view.latestUsage?.usedPercent ?? 0;
	const ui = {
		accountDetails: text(
			"Detalhes da Conta",
			"Account Details",
			"Detalles de la cuenta",
			"账号详情",
		),
		unknownProvider: text(
			"Provedor desconhecido",
			"Unknown provider",
			"Proveedor desconocido",
			"未知服务商",
		),
		backToAccounts: text(
			"Voltar para Contas",
			"Back to Accounts",
			"Volver a cuentas",
			"返回账号",
		),
		updateUsage: text(
			"Atualizar uso",
			"Update Usage",
			"Actualizar uso",
			"更新用量",
		),
		accountGuide: text(
			"Guia da Conta",
			"Account Guide",
			"Guía de la cuenta",
			"账号指南",
		),
		status: text("Status", "Status", "Estado", "状态"),
		plan: text("Plano", "Plan", "Plan", "套餐"),
		priority: text("Prioridade", "Priority", "Prioridad", "优先级"),
		secretStorage: text(
			"Armazenamento de Segredo",
			"Secret Storage",
			"Almacenamiento de secreto",
			"密钥存储",
		),
		secretStored: text("Armazenado", "Stored", "Almacenado", "已存储"),
		secretNone: text("Nenhum", "None", "Ninguno", "无"),
		latestUsage: text(
			"Uso mais recente",
			"Latest usage",
			"Uso más reciente",
			"最近用量",
		),
		measured: text("Medição", "Measured", "Medición", "测量"),
		nextReset: text("Próx. reset", "Next reset", "Próx. reinicio", "下次重置"),
		lastSync: text(
			"Última sincronização",
			"Last sync",
			"Última sincronización",
			"最近同步",
		),
		accountActivity: text(
			"Atividade da Conta",
			"Account Activity",
			"Actividad de la cuenta",
			"账号活动",
		),
		statusActive: text("Ativa", "Active", "Activa", "活跃"),
		statusWarning: text("Atenção", "Warning", "Advertencia", "警告"),
		statusLimited: text("Limitada", "Limited", "Limitada", "受限"),
		statusExhausted: text("Esgotada", "Exhausted", "Agotada", "已耗尽"),
		statusDisabled: text("Desativada", "Disabled", "Desactivada", "已禁用"),
		statusError: text("Erro", "Error", "Error", "错误"),
		statusArchived: text("Arquivada", "Archived", "Archivada", "已归档"),
	};

	function statusLabel(status: string) {
		if (status === "active") return ui.statusActive;
		if (status === "warning") return ui.statusWarning;
		if (status === "limited") return ui.statusLimited;
		if (status === "exhausted") return ui.statusExhausted;
		if (status === "disabled") return ui.statusDisabled;
		if (status === "error") return ui.statusError;
		return ui.statusArchived;
	}

	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<AppShellHeader
					username={user.username}
					locale={user.locale}
					currentPath="/accounts"
				/>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
							{ui.accountDetails}
						</p>
						<h1 className="mt-1 text-3xl font-semibold">{view.displayName}</h1>
						<div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
							<span className="truncate">{view.identifier}</span>
							<span aria-hidden>•</span>
							<ProviderBrand
								name={view.provider?.name ?? ui.unknownProvider}
								icon={view.provider?.icon}
								color={view.provider?.color}
								size="sm"
							/>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link
							href="/accounts"
							className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted"
						>
							{ui.backToAccounts}
						</Link>
						<QuickUsageUpdate
							accountId={view.id}
							locale={user.locale}
							buttonLabel={ui.updateUsage}
						/>
					</div>
				</div>
				<PageGuide
					title={ui.accountGuide}
					items={[
						text(
							"Atualize uso para manter projeções de reset e risco operacional precisas.",
							"Update usage to keep reset projections and operational risk accurate.",
							"Actualiza el uso para mantener precisas las proyecciones de reinicio y riesgo operativo.",
							"更新用量可保持重置预测与运营风险判断的准确性。",
						),
						text(
							"Revelação de segredo exige reautenticação e deve ser usada apenas quando necessário.",
							"Secret reveal requires re-authentication and should be used only when necessary.",
							"La visualización de secretos exige reautenticación y debe usarse solo cuando sea necesario.",
							"查看密钥需要重新验证，仅应在必要时使用。",
						),
						text(
							"Notas registram contexto operacional e a auditoria mostra o histórico técnico desta conta.",
							"Notes record operational context while audit shows this account's technical history.",
							"Las notas registran contexto operativo y la auditoría muestra el historial técnico de esta cuenta.",
							"备注记录运营上下文，审计展示该账号的技术历史轨迹。",
						),
					]}
				/>

				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								{ui.status}
							</p>
							<p className="mt-1 text-sm font-medium">
								{statusLabel(view.status)}
							</p>
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								{ui.plan}
							</p>
							<p className="mt-1 text-sm font-medium">{view.planName ?? "-"}</p>
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								{ui.priority}
							</p>
							<p className="mt-1 text-sm font-medium">{view.priority}</p>
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								{ui.secretStorage}
							</p>
							<p className="mt-1 text-sm font-medium">
								{view.hasSecret ? ui.secretStored : ui.secretNone}
							</p>
						</div>
					</div>

					<div className="mt-4 space-y-2">
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>{ui.latestUsage}</span>
							<span>{usagePercent.toFixed(1)}%</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-muted">
							<div
								className={`h-full ${
									usagePercent >= 90
										? "bg-danger"
										: usagePercent >= 70
											? "bg-warning"
											: "bg-success"
								}`}
								style={{
									width: `${Math.min(100, Math.max(0, usagePercent))}%`,
								}}
							/>
						</div>
						{/* Trend sparkline */}
						<div className="flex items-center justify-between gap-3">
							<UsageSparkline
								accountId={view.id}
								currentPercent={usagePercent}
								width={240}
								height={44}
								limit={30}
								className="flex-1"
							/>
							<div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
								<span className="font-medium text-foreground">
									{usagePercent.toFixed(1)}%
								</span>
								<span>{text("usado", "used")}</span>
							</div>
						</div>
						<div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
							<p>
								{ui.measured}:{" "}
								{formatDateTime(view.latestUsage?.measuredAt ?? null)}
							</p>
							<p>
								{ui.nextReset}: {formatDateTime(view.nextResetAt)}
							</p>
							<p>
								{ui.lastSync}: {formatDateTime(view.lastSyncAt)}
							</p>
						</div>
						{view.tags.length > 0 ? (
							<div className="mt-1 flex flex-wrap gap-1">
								{view.tags.map((tag) => (
									<span
										key={`${view.id}-${tag}`}
										className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
									>
										{tag}
									</span>
								))}
							</div>
						) : null}
					</div>
				</article>

				<AccountSecretViewer
					accountId={view.id}
					hasSecret={view.hasSecret}
					locale={user.locale}
				/>

				<div className="grid gap-5 xl:grid-cols-2">
					<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
						<AccountNotesManager accountId={view.id} locale={user.locale} />
					</article>
					<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
						<AuditLogViewer
							title={ui.accountActivity}
							locale={user.locale}
							initialEntityType="account"
							initialEntityId={view.id}
						/>
					</article>
				</div>
			</div>
		</main>
	);
}
