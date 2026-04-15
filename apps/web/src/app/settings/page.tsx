import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { SettingsHub } from "@/features/settings/components/settings-hub";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
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
					currentPath="/settings"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.settings.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.settings.description}
					</p>
				</div>
				<PageGuide
					title={text(
						"Guia de Configurações",
						"Settings Guide",
						"Guía de configuración",
						"设置指南",
					)}
					items={[
						text(
							"Perfil altera e-mail, senha e idioma da interface para o usuário atual.",
							"Profile updates email, password, and interface language for current user.",
							"El perfil actualiza el correo, contraseña e idioma de la interfaz del usuario actual.",
							"个人资料可更新当前用户的邮箱、密码与界面语言。",
						),
						text(
							"Somente administradores podem criar, editar e remover usuários do sistema.",
							"Only administrators can create, edit, and remove system users.",
							"Solo administradores pueden crear, editar y eliminar usuarios del sistema.",
							"仅管理员可创建、编辑和删除系统用户。",
						),
						text(
							"O admin protegido não pode ser excluído e mantém username imutável por segurança.",
							"The protected admin cannot be deleted and keeps immutable username for security.",
							"El admin protegido no se puede eliminar y mantiene el nombre de usuario inmutable por seguridad.",
							"受保护管理员不可删除，且用户名出于安全原因不可修改。",
						),
					]}
				/>
				<SettingsHub currentUser={user} locale={user.locale} />
			</div>
		</main>
	);
}
