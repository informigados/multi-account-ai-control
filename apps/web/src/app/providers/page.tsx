import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { ProvidersManager } from "@/features/providers/components/providers-manager";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function ProvidersPage() {
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
					currentPath="/providers"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.providers.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.providers.description}
					</p>
				</div>
				<PageGuide
					title={text(
						"Legenda de Provedores",
						"Providers Legend",
						"Leyenda de proveedores",
						"服务商说明",
					)}
					items={[
						text(
							"Slug identifica o provedor em integrações e fluxos de importação/exportação.",
							"Slug identifies the provider in integrations and import/export workflows.",
							"El slug identifica al proveedor en integraciones y flujos de importación/exportación.",
							"Slug 用于在集成及导入/导出流程中唯一标识服务商。",
						),
						text(
							"Tipo de conector define o modo operacional da conta (manual, API, sessão, automação).",
							"Connector type defines account operation mode (manual, API, session, automation).",
							"El tipo de conector define el modo operativo de la cuenta (manual, API, sesión, automatización).",
							"连接器类型决定账号运营模式（手动、API、会话、自动化）。",
						),
						text(
							"Provedor inativo deixa de ser opção para novos cadastros, mas mantém histórico.",
							"Inactive providers are removed from new registrations while keeping historical data.",
							"Un proveedor inactivo deja de ser opción para nuevos registros, pero conserva el historial.",
							"停用的服务商不会出现在新建选项中，但会保留历史数据。",
						),
					]}
				/>
				<ProvidersManager locale={user.locale} />
			</div>
		</main>
	);
}
