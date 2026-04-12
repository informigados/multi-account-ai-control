import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { SettingsHub } from "@/features/settings/components/settings-hub";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
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
					currentPath="/settings"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.settings.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.settings.description}
					</p>
				</div>
				<PageGuide
					title={isPtBr ? "Guia de Configurações" : "Settings Guide"}
					items={
						isPtBr
							? [
									"Perfil altera e-mail, senha e idioma da interface para o usuário atual.",
									"Somente administradores podem criar, editar e remover usuários do sistema.",
									"O admin protegido não pode ser excluído e mantém username imutável por segurança.",
								]
							: [
									"Profile updates email, password, and interface language for current user.",
									"Only administrators can create, edit, and remove system users.",
									"The protected admin cannot be deleted and keeps immutable username for security.",
								]
					}
				/>
				<SettingsHub currentUser={user} locale={user.locale} />
			</div>
		</main>
	);
}
