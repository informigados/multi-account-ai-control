import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary, pickLocaleText } from "@/lib/i18n";
import {
	ExternalLink,
	LayoutGrid,
	PackageCheck,
	ShieldCheck,
	Zap,
} from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function AboutPage() {
	const user = await getServerSessionUser();
	if (!user) {
		redirect("/login");
	}

	const t = getDictionary(user.locale);
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(user.locale, { pt, en, es, zhCN });

	const version = process.env.npm_package_version ?? "1.1.0";
	const lastReview = "2026-04-15";

	const ui = {
		platformGuideTitle: text(
			"Guia da Plataforma",
			"Platform Guide",
			"Guía de la plataforma",
			"平台指南",
		),
		platformGuideItems: [
			text(
				"Cada aba foi desenhada para um fluxo operacional: cadastro, uso, auditoria e resiliência.",
				"Each tab is designed for an operational flow: registry, usage, auditing, and resilience.",
				"Cada pestaña fue diseñada para un flujo operativo: registro, uso, auditoría y resiliencia.",
				"每个标签页都围绕运营流程设计：登记、用量、审计与韧性。",
			),
			text(
				"Dados sensíveis são protegidos com criptografia e acesso condicionado por segurança.",
				"Sensitive data is protected with encryption and security-gated access.",
				"Los datos sensibles se protegen con cifrado y acceso condicionado por seguridad.",
				"敏感数据通过加密与安全门控访问进行保护。",
			),
			text(
				"A evolução do sistema deve priorizar rastreabilidade, simplicidade e operação local confiável.",
				"System evolution should prioritize traceability, simplicity, and trustworthy local-first operation.",
				"La evolución del sistema debe priorizar trazabilidad, simplicidad y operación local confiable.",
				"系统演进应优先保障可追溯性、简洁性与可靠的本地化运行。",
			),
		],
		aboutTitle: text(
			"Sobre o Multi Account AI Control",
			"About Multi Account AI Control",
			"Sobre Multi Account AI Control",
			"关于 Multi Account AI Control",
		),
		aboutDescription: text(
			"Controle múltiplas contas de IA com segurança, rastreabilidade e operação local de alta confiança.",
			"Manage multiple AI accounts with security, traceability, and high-trust local operations.",
			"Gestiona múltiples cuentas de IA con seguridad, trazabilidad y operación local de alta confianza.",
			"以高可信本地运营方式安全、可追溯地管理多平台 AI 账号。",
		),
		privacy: text("Privacidade", "Privacy", "Privacidad", "隐私"),
		privacyDescription: text(
			"Seus dados permanecem sob seu controle, com backup criptografado e operação local.",
			"Your data stays under your control with encrypted backups and local-first operation.",
			"Tus datos permanecen bajo tu control, con respaldo cifrado y operación local.",
			"你的数据始终由你掌控，支持加密备份和本地优先运行。",
		),
		productivity: text(
			"Produtividade",
			"Productivity",
			"Productividad",
			"效率",
		),
		productivityDescription: text(
			"Gerencie contas, consumo e auditoria em uma interface objetiva e rápida.",
			"Manage accounts, usage, and auditing in a focused, fast interface.",
			"Gestiona cuentas, consumo y auditoría en una interfaz ágil y objetiva.",
			"在简洁高效的界面中管理账号、用量与审计。",
		),
		scalability: text(
			"Escalabilidade",
			"Scalability",
			"Escalabilidad",
			"可扩展性",
		),
		scalabilityDescription: text(
			"Arquitetura modular preparada para novas integrações e automações.",
			"Modular architecture ready for new integrations and automations.",
			"Arquitectura modular preparada para nuevas integraciones y automatizaciones.",
			"模块化架构已准备好支持新的集成与自动化。",
		),
		systemUpdates: text(
			"Atualizações do Sistema",
			"System Updates",
			"Actualizaciones del sistema",
			"系统更新",
		),
		systemUpdatesDescription: text(
			"Status da versão local instalada e preparação para evolução segura.",
			"Status of the installed local version and readiness for safe evolution.",
			"Estado de la versión local instalada y preparación para una evolución segura.",
			"本地安装版本状态与安全演进准备情况。",
		),
		upToDate: text("Atualizado", "Up to date", "Actualizado", "已是最新"),
		checkUpdates: text(
			"Verificar atualizações",
			"Check for updates",
			"Buscar actualizaciones",
			"检查更新",
		),
		installedVersion: text(
			"Versão instalada",
			"Installed version",
			"Versión instalada",
			"已安装版本",
		),
		channel: text("Canal", "Channel", "Canal", "渠道"),
		stable: text("Estável", "Stable", "Estable", "稳定"),
		lastReview: text(
			"Última revisão",
			"Last review",
			"Última revisión",
			"最近审查",
		),
		status: text("Status", "Status", "Estado", "状态"),
		inProduction: text(
			"Em produção",
			"In production",
			"En producción",
			"生产中",
		),
		authors: text("Autores", "Authors", "Autores", "作者"),
		developmentCompany: text(
			"Empresa Desenvolvedora",
			"Development Company",
			"Empresa desarrolladora",
			"开发公司",
		),
		professionalDeveloper: text(
			"Profissional Desenvolvedor",
			"Professional Developer",
			"Desarrollador profesional",
			"专业开发者",
		),
		collaboratorsArea: text(
			"Espaço para colaboradores",
			"Collaborators area",
			"Espacio para colaboradores",
			"协作者区域",
		),
		collaboratorsDescription: text(
			"Contribuições futuras podem ser destacadas aqui com créditos e histórico de participação.",
			"Future contributions can be highlighted here with credits and participation history.",
			"Aquí se pueden destacar futuras contribuciones con créditos e historial de participación.",
			"未来贡献可在此展示，并附带署名与参与记录。",
		),
		viewRepository: text(
			"Ver repositório",
			"View repository",
			"Ver repositorio",
			"查看仓库",
		),
	};

	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8 md:px-10">
				<AppShellHeader
					username={user.username}
					locale={user.locale}
					currentPath="/about"
				/>

				<div>
					<h1 className="text-3xl font-semibold">{t.pages.about.title}</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.pages.about.description}
					</p>
				</div>
				<PageGuide
					title={ui.platformGuideTitle}
					items={ui.platformGuideItems}
				/>

				<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-2xl font-semibold">{ui.aboutTitle}</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{ui.aboutDescription}
					</p>

					<div className="mt-4 grid gap-3 md:grid-cols-3">
						<article className="card-hover rounded-lg border border-border bg-background/60 p-4">
							<ShieldCheck className="mb-2 h-6 w-6 text-success" />
							<h3 className="font-semibold">{ui.privacy}</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{ui.privacyDescription}
							</p>
						</article>
						<article className="card-hover rounded-lg border border-border bg-background/60 p-4">
							<Zap className="mb-2 h-6 w-6 text-warning" />
							<h3 className="font-semibold">{ui.productivity}</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{ui.productivityDescription}
							</p>
						</article>
						<article className="card-hover rounded-lg border border-border bg-background/60 p-4">
							<LayoutGrid className="mb-2 h-6 w-6 text-info" />
							<h3 className="font-semibold">{ui.scalability}</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{ui.scalabilityDescription}
							</p>
						</article>
					</div>
				</section>

				<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold">{ui.systemUpdates}</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								{ui.systemUpdatesDescription}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span className="flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1 text-sm text-success">
								<PackageCheck className="h-3.5 w-3.5" />
								{ui.upToDate}
							</span>
							<button
								type="button"
								className="rounded-md border border-border bg-card px-3 py-1.5 text-sm transition hover:bg-muted"
							>
								{ui.checkUpdates}
							</button>
						</div>
					</div>

					<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{ui.installedVersion}
							</p>
							<p className="mt-1 font-medium">{version}</p>
						</div>
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{ui.channel}
							</p>
							<p className="mt-1 font-medium">{ui.stable}</p>
						</div>
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{ui.lastReview}
							</p>
							<p className="mt-1 font-medium">{lastReview}</p>
						</div>
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{ui.status}
							</p>
							<p className="mt-1 font-medium">{ui.inProduction}</p>
						</div>
					</div>
				</section>

				<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-xl font-semibold">{ui.authors}</h2>
					<div className="mt-3 grid gap-3 md:grid-cols-2">
						<article className="card-hover rounded-lg border border-border bg-background/60 p-4">
							<div className="flex items-center gap-3">
								<Image
									src="/authors/informigados.webp"
									alt="INformigados"
									width={56}
									height={56}
									className="h-14 w-14 rounded-full border border-border object-cover"
								/>
								<div>
									<p className="font-medium">INformigados</p>
									<p className="text-xs text-muted-foreground">
										{ui.developmentCompany}
									</p>
								</div>
							</div>
							<a
								href="https://github.com/informigados/"
								target="_blank"
								rel="noreferrer"
								className="mt-1 inline-block text-sm text-primary hover:underline"
							>
								github.com/informigados
							</a>
							<a
								href="https://informigados.github.io/"
								target="_blank"
								rel="noreferrer"
								className="mt-1 block text-xs text-muted-foreground hover:underline"
							>
								informigados.github.io
							</a>
						</article>
						<article className="card-hover rounded-lg border border-border bg-background/60 p-4">
							<div className="flex items-center gap-3">
								<Image
									src="/authors/alex-brito-dev.webp"
									alt="Alex Brito"
									width={56}
									height={56}
									className="h-14 w-14 rounded-full border border-border object-cover"
								/>
								<div>
									<p className="font-medium">Alex Brito</p>
									<p className="text-xs text-muted-foreground">
										{ui.professionalDeveloper}
									</p>
								</div>
							</div>
							<a
								href="https://github.com/alexbritodev"
								target="_blank"
								rel="noreferrer"
								className="mt-1 inline-block text-sm text-primary hover:underline"
							>
								github.com/alexbritodev
							</a>
							<a
								href="https://alexbritodev.github.io/"
								target="_blank"
								rel="noreferrer"
								className="mt-1 block text-xs text-muted-foreground hover:underline"
							>
								alexbritodev.github.io
							</a>
						</article>
					</div>
					<article className="mt-3 rounded-lg border border-border bg-background/60 p-4 text-center">
						<p className="font-medium">{ui.collaboratorsArea}</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{ui.collaboratorsDescription}
						</p>
						<a
							href="https://github.com/informigados/multi-account-ai-control/"
							target="_blank"
							rel="noreferrer"
							className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-5 text-sm font-medium text-primary transition-all hover:bg-primary/20"
						>
							{ui.viewRepository}
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
					</article>
				</section>
			</div>
		</main>
	);
}
