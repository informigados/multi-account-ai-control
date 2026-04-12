import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { AccountsManager } from "@/features/accounts/components/accounts-manager";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AccountsPage() {
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
					currentPath="/accounts"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.accounts.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.accounts.description}
					</p>
				</div>
				<PageGuide
					title={isPtBr ? "Legenda de Contas" : "Accounts Legend"}
					items={
						isPtBr
							? [
									"Cada conta é única por combinação Provedor + Identificador.",
									"Arquivar remove a conta da operação ativa, preservando auditoria e histórico.",
									"Campos sensíveis são criptografados em repouso e não são exibidos em texto puro.",
								]
							: [
									"Each account is unique by Provider + Identifier combination.",
									"Archive removes the account from active operations while preserving audit/history.",
									"Sensitive fields are encrypted at rest and never shown in plain text by default.",
								]
					}
				/>
				<AccountsManager locale={user.locale} />
			</div>
		</main>
	);
}
