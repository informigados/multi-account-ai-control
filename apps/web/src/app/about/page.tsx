import { AppShellHeader } from "@/components/app-shell-header";
import { PageGuide } from "@/components/page-guide";
import { getServerSessionUser } from "@/lib/auth/require-auth";
import { getDictionary } from "@/lib/i18n";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function AboutPage() {
	const user = await getServerSessionUser();
	if (!user) {
		redirect("/login");
	}

	const t = getDictionary(user.locale);
	const isPtBr = user.locale === "pt_BR";
	const version = "1.0.0";

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
					title={isPtBr ? "Guia da Plataforma" : "Platform Guide"}
					items={
						isPtBr
							? [
									"Cada aba foi desenhada para um fluxo operacional: cadastro, uso, auditoria e resiliência.",
									"Dados sensíveis são protegidos com criptografia e acesso condicionado por segurança.",
									"A evolução do sistema deve priorizar rastreabilidade, simplicidade e operação local confiável.",
								]
							: [
									"Each tab is designed for an operational flow: registry, usage, auditing, and resilience.",
									"Sensitive data is protected with encryption and security-gated access.",
									"System evolution should prioritize traceability, simplicity, and trustworthy local-first operation.",
								]
					}
				/>

				<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-2xl font-semibold">
						{isPtBr
							? "Sobre o Multi Account AI Control"
							: "About Multi Account AI Control"}
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{isPtBr
							? "Controle múltiplas contas de IA com segurança, rastreabilidade e operação local de alta confiança."
							: "Manage multiple AI accounts with security, traceability, and high-trust local operations."}
					</p>

					<div className="mt-4 grid gap-3 md:grid-cols-3">
						<article className="rounded-lg border border-border bg-background/60 p-4">
							<h3 className="font-medium">
								{isPtBr ? "Privacidade" : "Privacy"}
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{isPtBr
									? "Seus dados permanecem sob seu controle, com backup criptografado e operação local."
									: "Your data stays under your control with encrypted backups and local-first operation."}
							</p>
						</article>
						<article className="rounded-lg border border-border bg-background/60 p-4">
							<h3 className="font-medium">
								{isPtBr ? "Produtividade" : "Productivity"}
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{isPtBr
									? "Gerencie contas, consumo e auditoria em uma interface objetiva e rápida."
									: "Manage accounts, usage, and auditing in a focused, fast interface."}
							</p>
						</article>
						<article className="rounded-lg border border-border bg-background/60 p-4">
							<h3 className="font-medium">
								{isPtBr ? "Escalabilidade" : "Scalability"}
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{isPtBr
									? "Arquitetura modular preparada para novas integrações e automações."
									: "Modular architecture ready for new integrations and automations."}
							</p>
						</article>
					</div>
				</section>

				<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold">
								{isPtBr ? "Atualizações do Sistema" : "System Updates"}
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								{isPtBr
									? "Status da versão local instalada e preparação para evolução segura."
									: "Status of the installed local version and readiness for safe evolution."}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<span className="rounded-md border border-success/40 bg-success/10 px-3 py-1 text-sm text-success">
								{isPtBr ? "Atualizado" : "Up to date"}
							</span>
							<button
								type="button"
								className="rounded-md border border-border bg-card px-3 py-1.5 text-sm transition hover:bg-muted"
							>
								{isPtBr ? "Verificar atualizações" : "Check for updates"}
							</button>
						</div>
					</div>

					<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{isPtBr ? "Versão instalada" : "Installed version"}
							</p>
							<p className="mt-1 font-medium">{version}</p>
						</div>
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{isPtBr ? "Canal" : "Channel"}
							</p>
							<p className="mt-1 font-medium">
								{isPtBr ? "Estável" : "Stable"}
							</p>
						</div>
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{isPtBr ? "Última revisão" : "Last review"}
							</p>
							<p className="mt-1 font-medium">2026-04-12</p>
						</div>
						<div className="rounded-lg border border-border bg-background/60 p-3">
							<p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
								{isPtBr ? "Status" : "Status"}
							</p>
							<p className="mt-1 font-medium">
								{isPtBr ? "Em produção" : "In production"}
							</p>
						</div>
					</div>
				</section>

				<section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-xl font-semibold">
						{isPtBr ? "Autores" : "Authors"}
					</h2>
					<div className="mt-3 grid gap-3 md:grid-cols-2">
						<article className="rounded-lg border border-border bg-background/60 p-4">
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
										{isPtBr ? "Empresa Desenvolvedora" : "Development Company"}
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
						<article className="rounded-lg border border-border bg-background/60 p-4">
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
										{isPtBr
											? "Profissional Desenvolvedor"
											: "Professional Developer"}
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
						<p className="font-medium">
							{isPtBr ? "Espaço para colaboradores" : "Collaborators area"}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{isPtBr
								? "Contribuições futuras podem ser destacadas aqui com créditos e histórico de participação."
								: "Future contributions can be highlighted here with credits and participation history."}
						</p>
						<a
							href="https://github.com/informigados/multi-account-ai-control/"
							target="_blank"
							rel="noreferrer"
							className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm transition hover:bg-muted"
						>
							{isPtBr ? "Ver repositório" : "View repository"}
						</a>
					</article>
				</section>
			</div>
		</main>
	);
}
