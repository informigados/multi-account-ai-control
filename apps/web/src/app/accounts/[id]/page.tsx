import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { presentAccount } from "@/features/accounts/account-presenter";
import { AccountSecretViewer } from "@/features/accounts/components/account-secret-viewer";
import { AuditLogViewer } from "@/features/audit/components/audit-log-viewer";
import { AccountNotesManager } from "@/features/notes/components/account-notes-manager";
import { QuickUsageUpdate } from "@/features/usage/components/quick-usage-update";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
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
	const isPtBr = user.locale === "pt_BR";

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
		accountDetails: isPtBr ? "Detalhes da Conta" : "Account Details",
		unknownProvider: isPtBr ? "Provedor desconhecido" : "Unknown provider",
		backToAccounts: isPtBr ? "Voltar para Contas" : "Back to Accounts",
		updateUsage: isPtBr ? "Atualizar uso" : "Update Usage",
		status: isPtBr ? "Status" : "Status",
		plan: isPtBr ? "Plano" : "Plan",
		priority: isPtBr ? "Prioridade" : "Priority",
		secretStorage: isPtBr ? "Armazenamento de Segredo" : "Secret Storage",
		secretStored: isPtBr ? "Armazenado" : "Stored",
		secretNone: isPtBr ? "Nenhum" : "None",
		latestUsage: isPtBr ? "Uso mais recente" : "Latest usage",
		measured: isPtBr ? "Medição" : "Measured",
		nextReset: isPtBr ? "Próx. reset" : "Next reset",
		lastSync: isPtBr ? "Última sincronização" : "Last sync",
		accountActivity: isPtBr ? "Atividade da Conta" : "Account Activity",
		statusActive: isPtBr ? "Ativa" : "Active",
		statusWarning: isPtBr ? "Atenção" : "Warning",
		statusLimited: isPtBr ? "Limitada" : "Limited",
		statusExhausted: isPtBr ? "Esgotada" : "Exhausted",
		statusDisabled: isPtBr ? "Desativada" : "Disabled",
		statusError: isPtBr ? "Erro" : "Error",
		statusArchived: isPtBr ? "Arquivada" : "Archived",
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
						<p className="mt-1 text-sm text-muted-foreground">
							{view.identifier} • {view.provider?.name ?? ui.unknownProvider}
						</p>
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
					title={isPtBr ? "Guia da Conta" : "Account Guide"}
					items={
						isPtBr
							? [
									"Atualize uso para manter projeções de reset e risco operacional precisas.",
									"Revelação de segredo exige reautenticação e deve ser usada apenas quando necessário.",
									"Notas registram contexto operacional e a auditoria mostra o histórico técnico desta conta.",
								]
							: [
									"Update usage to keep reset projections and operational risk accurate.",
									"Secret reveal requires re-authentication and should be used only when necessary.",
									"Notes record operational context while audit shows this account's technical history.",
								]
					}
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
