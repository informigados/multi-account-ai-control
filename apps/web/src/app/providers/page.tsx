import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { ProvidersManager } from "@/features/providers/components/providers-manager";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function ProvidersPage() {
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
					currentPath="/providers"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.providers.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.providers.description}
					</p>
				</div>
				<PageGuide
					title={isPtBr ? "Legenda de Provedores" : "Providers Legend"}
					items={
						isPtBr
							? [
									"Slug identifica o provedor em integrações e fluxos de importação/exportação.",
									"Tipo de conector define o modo operacional da conta (manual, API, sessão, automação).",
									"Provedor inativo deixa de ser opção para novos cadastros, mas mantém histórico.",
								]
							: [
									"Slug identifies the provider in integrations and import/export workflows.",
									"Connector type defines account operation mode (manual, API, session, automation).",
									"Inactive providers are removed from new registrations while keeping historical data.",
								]
					}
				/>
				<ProvidersManager locale={user.locale} />
			</div>
		</main>
	);
}
