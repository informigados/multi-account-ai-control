import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { AuditLogViewer } from "@/features/audit/components/audit-log-viewer";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AuditPage() {
	const user = await getServerSessionUser();
	if (!user) {
		redirect("/login");
	}
	const t = getDictionary(user.locale);
	const isPtBr = user.locale === "pt_BR";

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
					title={isPtBr ? "Guia de Auditoria" : "Audit Guide"}
					items={
						isPtBr
							? [
									"Filtre por período, evento e entidade para investigar incidentes com precisão.",
									"Use metadados para entender contexto técnico da ação registrada.",
									"Priorize eventos de login, alteração de dados e operações de restore/importação.",
								]
							: [
									"Filter by period, event, and entity to investigate incidents precisely.",
									"Use metadata to understand technical context for each recorded action.",
									"Prioritize login, data changes, and restore/import operation events.",
								]
					}
				/>
				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<AuditLogViewer locale={user.locale} />
				</article>
			</div>
		</main>
	);
}
