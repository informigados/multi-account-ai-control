import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { DataOperationsManager } from "@/features/imports-exports/components/data-operations-manager";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function DataPage() {
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
					currentPath="/data"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.data.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.data.description}
					</p>
				</div>
				<PageGuide
					title={
						isPtBr
							? "Guia de Importação, Exportação e Backup"
							: "Import, Export, and Backup Guide"
					}
					items={
						isPtBr
							? [
									"Use exportação JSON/CSV para portabilidade e análise operacional.",
									"Backup criptografado preserva dados sensíveis com proteção em repouso.",
									"Antes de restaurar, execute sempre a simulação (dry run). A restauração real substitui dados atuais.",
								]
							: [
									"Use JSON/CSV export for portability and operational analysis.",
									"Encrypted backup preserves sensitive data with at-rest protection.",
									"Before restoring, always run dry run. Real restore replaces current data.",
								]
					}
				/>
				<DataOperationsManager locale={user.locale} />
			</div>
		</main>
	);
}
