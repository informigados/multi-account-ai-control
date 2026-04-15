import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { DataOperationsManager } from "@/features/imports-exports/components/data-operations-manager";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function DataPage() {
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
					currentPath="/data"
				/>
				<div>
					<h1 className="text-3xl font-semibold">{t.pages.data.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.data.description}
					</p>
				</div>
				<PageGuide
					title={text(
						"Guia de Importação, Exportação e Backup",
						"Import, Export, and Backup Guide",
						"Guía de importación, exportación y respaldo",
						"导入、导出与备份指南",
					)}
					items={[
						text(
							"Use exportação JSON/CSV para portabilidade e análise operacional.",
							"Use JSON/CSV export for portability and operational analysis.",
							"Usa la exportación JSON/CSV para portabilidad y análisis operativo.",
							"使用 JSON/CSV 导出实现数据可迁移与运营分析。",
						),
						text(
							"Backup criptografado preserva dados sensíveis com proteção em repouso.",
							"Encrypted backup preserves sensitive data with at-rest protection.",
							"La copia cifrada protege datos sensibles en reposo.",
							"加密备份可在静态存储时保护敏感数据。",
						),
						text(
							"Antes de restaurar, execute sempre a simulação (dry run). A restauração real substitui dados atuais.",
							"Before restoring, always run dry run. Real restore replaces current data.",
							"Antes de restaurar, ejecuta siempre la simulación (dry run). La restauración real reemplaza los datos actuales.",
							"恢复前请始终先执行模拟（dry run）。正式恢复会替换当前数据。",
						),
					]}
				/>
				<DataOperationsManager locale={user.locale} />
			</div>
		</main>
	);
}
