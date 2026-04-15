import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { AccountsManager } from "@/features/accounts/components/accounts-manager";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AccountsPage() {
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
					currentPath="/accounts"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.accounts.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.accounts.description}
					</p>
				</div>
				<PageGuide
					title={text(
						"Legenda de Contas",
						"Accounts Legend",
						"Leyenda de cuentas",
						"账号说明",
					)}
					items={[
						text(
							"Cada conta é única por combinação Provedor + Identificador.",
							"Each account is unique by Provider + Identifier combination.",
							"Cada cuenta es única por la combinación Proveedor + Identificador.",
							"每个账号都由“服务商 + 标识”组合唯一确定。",
						),
						text(
							"Arquivar remove a conta da operação ativa, preservando auditoria e histórico.",
							"Archive removes the account from active operations while preserving audit/history.",
							"Archivar retira la cuenta de la operación activa, preservando auditoría e historial.",
							"归档会将账号移出活跃运营，但保留审计与历史。",
						),
						text(
							"Campos sensíveis são criptografados em repouso e não são exibidos em texto puro.",
							"Sensitive fields are encrypted at rest and never shown in plain text by default.",
							"Los campos sensibles se cifran en reposo y no se muestran en texto plano por defecto.",
							"敏感字段在静态存储时会被加密，默认不以明文显示。",
						),
					]}
				/>
				<AccountsManager locale={user.locale} />
			</div>
		</main>
	);
}
