import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { AuditLogViewer } from "@/features/audit/components/audit-log-viewer";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AuditPage() {
	const user = await getServerSessionUser();
	if (!user) {
		redirect("/login");
	}
	const t = getDictionary(user.locale);
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(user.locale, { pt, en, es, zhCN });

	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<AppShellHeader
					username={user.username}
					locale={user.locale}
					currentPath="/audit"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.audit.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.audit.description}
					</p>
				</div>
				<PageGuide
					title={text(
						"Guia de Auditoria",
						"Audit Guide",
						"Guía de auditoría",
						"审计指南",
					)}
					items={[
						text(
							"Filtre por período, evento e entidade para investigar incidentes com precisão.",
							"Filter by period, event, and entity to investigate incidents precisely.",
							"Filtra por período, evento y entidad para investigar incidentes con precisión.",
							"按时间范围、事件和实体筛选，以精准排查事件。",
						),
						text(
							"Use metadados para entender contexto técnico da ação registrada.",
							"Use metadata to understand technical context for each recorded action.",
							"Usa metadatos para entender el contexto técnico de cada acción registrada.",
							"使用元数据来理解每条记录的技术上下文。",
						),
						text(
							"Priorize eventos de login, alteração de dados e operações de restore/importação.",
							"Prioritize login, data changes, and restore/import operation events.",
							"Prioriza eventos de inicio de sesión, cambios de datos y operaciones de restauración/importación.",
							"优先关注登录、数据变更和恢复/导入操作事件。",
						),
					]}
				/>
				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<AuditLogViewer locale={user.locale} />
				</article>
			</div>
		</main>
	);
}
