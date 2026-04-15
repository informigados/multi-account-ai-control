"use client";

/**
 * CommandPalette
 *
 * Global Ctrl+K / Cmd+K command palette with:
 * - Navigation to all app pages
 * - Quick action shortcuts
 * - Arrow key navigation
 * - Premium glassmorphism design
 * - Accessible via keyboard (Escape to close, Enter to select)
 * - Opens programmatically via window event "open-command-palette"
 */
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CommandItem = {
	id: string;
	label: string;
	description?: string;
	icon: React.ReactNode;
	action: () => void;
	group: string;
	keywords?: string;
};

type CommandPaletteProps = {
	locale: AppLocale;
};

function NavIcon({ path }: { path: string }) {
	const paths: Record<string, string> = {
		"/": "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
		"/accounts":
			"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
		"/providers": "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
		"/audit":
			"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
		"/data":
			"M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7h16M9 3h6M7 13h2M11 13h6M7 17h5",
		"/settings":
			"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
		"/about":
			"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
	};
	const d = paths[path] ?? paths["/"];
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			className="h-4 w-4 shrink-0"
			aria-hidden="true"
		>
			{d
				.split("M")
				.filter(Boolean)
				.map((seg) => (
					<path key={seg.slice(0, 8)} d={`M${seg}`} />
				))}
		</svg>
	);
}

export function CommandPalette({ locale }: CommandPaletteProps) {
	const t = getDictionary(locale);
	const isPt = locale === "pt_BR" || locale === "pt_PT";

	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIdx, setActiveIdx] = useState(0);
	const [isClient, setIsClient] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => setIsClient(true), []);

	const navigate = useCallback((href: string) => {
		setIsOpen(false);
		setQuery("");
		window.location.href = href;
	}, []);

	const commands: CommandItem[] = [
		// Navigation
		{
			id: "nav-dash",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.dashboard,
			icon: <NavIcon path="/" />,
			action: () => navigate("/"),
			keywords: "dashboard home inicio",
		},
		{
			id: "nav-accounts",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.accounts,
			icon: <NavIcon path="/accounts" />,
			action: () => navigate("/accounts"),
			keywords: "accounts contas",
		},
		{
			id: "nav-providers",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.providers,
			icon: <NavIcon path="/providers" />,
			action: () => navigate("/providers"),
			keywords: "providers provedores",
		},
		{
			id: "nav-data",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.data,
			icon: <NavIcon path="/data" />,
			action: () => navigate("/data"),
			keywords: "data dados backup",
		},
		{
			id: "nav-audit",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.audit,
			icon: <NavIcon path="/audit" />,
			action: () => navigate("/audit"),
			keywords: "audit auditoria logs",
		},
		{
			id: "nav-settings",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.settings,
			icon: <NavIcon path="/settings" />,
			action: () => navigate("/settings"),
			keywords: "settings configuracoes",
		},
		{
			id: "nav-about",
			group: isPt ? "Navegar" : "Navigate",
			label: t.shell.nav.about,
			icon: <NavIcon path="/about" />,
			action: () => navigate("/about"),
			keywords: "about sobre health saude sistema",
		},
		// Quick actions
		{
			id: "action-new-account",
			group: isPt ? "Ações" : "Actions",
			label: isPt ? "Nova conta" : "New account",
			description: isPt ? "Abrir página de contas" : "Open accounts page",
			icon: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					className="h-4 w-4"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			),
			action: () => navigate("/accounts"),
			keywords: "new account nova conta criar",
		},
		{
			id: "action-backup",
			group: isPt ? "Ações" : "Actions",
			label: isPt ? "Criar backup agora" : "Create backup now",
			description: isPt ? "Ir para Dados > Backups" : "Go to Data > Backups",
			icon: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					className="h-4 w-4"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
					/>
				</svg>
			),
			action: () => navigate("/data"),
			keywords: "backup download export exportar",
		},
		{
			id: "action-totp",
			group: isPt ? "Ações" : "Actions",
			label: isPt ? "Gerenciar 2FA / TOTP" : "Manage 2FA / TOTP",
			description: isPt
				? "Ir para Configurações > TOTP"
				: "Go to Settings > TOTP",
			icon: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					className="h-4 w-4"
					aria-hidden="true"
				>
					<rect
						x="5"
						y="11"
						width="14"
						height="10"
						rx="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M8 11V7a4 4 0 018 0v4"
					/>
				</svg>
			),
			action: () => navigate("/settings"),
			keywords: "totp 2fa autenticacao segurança",
		},
		{
			id: "action-health",
			group: isPt ? "Ações" : "Actions",
			label: isPt ? "Ver status do sistema" : "View system status",
			description: isPt ? "Health check ao vivo" : "Live health check",
			icon: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					className="h-4 w-4"
					aria-hidden="true"
				>
					<polyline
						strokeLinecap="round"
						strokeLinejoin="round"
						points="22 12 18 12 15 21 9 3 6 12 2 12"
					/>
				</svg>
			),
			action: () => navigate("/about"),
			keywords: "health status saude sistema monitoramento",
		},
	];

	const filtered =
		query.trim() === ""
			? commands
			: commands.filter((c) => {
					const q = query.toLowerCase();
					return (
						c.label.toLowerCase().includes(q) ||
						c.description?.toLowerCase().includes(q) ||
						c.keywords?.toLowerCase().includes(q) ||
						c.group.toLowerCase().includes(q)
					);
				});

	// Group commands
	const groups = [...new Set(filtered.map((c) => c.group))];

	const open = useCallback(() => {
		setIsOpen(true);
		setQuery("");
		setActiveIdx(0);
		setTimeout(() => inputRef.current?.focus(), 50);
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setQuery("");
	}, []);

	// Keyboard global shortcut: Ctrl+K / Cmd+K
	useEffect(() => {
		function handler(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				e.stopPropagation();
				setIsOpen((prev) => {
					if (prev) {
						close();
						return false;
					}
					open();
					return true;
				});
			}
		}
		window.addEventListener("keydown", handler);
		// Also listen to custom event from trigger buttons
		function customHandler() {
			open();
		}
		window.addEventListener("open-command-palette", customHandler);
		return () => {
			window.removeEventListener("keydown", handler);
			window.removeEventListener("open-command-palette", customHandler);
		};
	}, [open, close]);

	// Escape to close + arrow navigation
	useEffect(() => {
		if (!isOpen) return;
		function handler(e: KeyboardEvent) {
			if (e.key === "Escape") {
				close();
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIdx((i) => Math.max(i - 1, 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				filtered[activeIdx]?.action();
			}
		}
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isOpen, filtered, activeIdx, close]);

	// Scroll active item into view
	useEffect(() => {
		const el = listRef.current?.querySelector(`[data-cmd-idx="${activeIdx}"]`);
		el?.scrollIntoView({ block: "nearest" });
	}, [activeIdx]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: setActiveIdx is stable, only need query
	useEffect(() => setActiveIdx(0), [query]);

	if (!isClient) return null;

	if (!isOpen) return null;

	return createPortal(
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop handled by keydown on window
		// biome-ignore lint/a11y/useSemanticElements: backdrop overlay requires div not article/section
		<div
			className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
			onClick={close}
		>
			<dialog
				open
				aria-label={isPt ? "Paleta de comandos" : "Command palette"}
				className="m-0 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl animate-[command-in_0.15s_ease-out]"
			>
				{/* Search input */}
				<div className="flex items-center gap-3 border-b border-border px-4 py-3">
					<svg
						viewBox="0 0 20 20"
						fill="currentColor"
						className="h-4 w-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
							clipRule="evenodd"
						/>
					</svg>
					<input
						ref={inputRef}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={
							isPt ? "Buscar páginas e ações..." : "Search pages and actions..."
						}
						className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						aria-label={isPt ? "Buscar comandos" : "Search commands"}
						autoComplete="off"
						autoCorrect="off"
						spellCheck={false}
					/>
					<kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
						ESC
					</kbd>
				</div>

				{/* Results */}
				{/* Results — navigation via keydown, no ARIA role needed */}
				<div
					ref={listRef as unknown as React.RefObject<HTMLDivElement>}
					className="max-h-[380px] overflow-y-auto py-2"
				>
					{filtered.length === 0 ? (
						<p className="px-4 py-6 text-center text-sm text-muted-foreground">
							{isPt ? "Nenhum resultado encontrado." : "No results found."}
						</p>
					) : (
						groups.map((group) => {
							const groupItems = filtered.filter((c) => c.group === group);
							return (
								<div key={group}>
									<p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
										{group}
									</p>
									{groupItems.map((cmd) => {
										const flatIdx = filtered.indexOf(cmd);
										const isActive = flatIdx === activeIdx;
										return (
											<button
												key={cmd.id}
												type="button"
												aria-selected={isActive}
												data-cmd-idx={flatIdx}
												onClick={cmd.action}
												onMouseEnter={() => setActiveIdx(flatIdx)}
												className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
											>
												<span
													className={`flex h-7 w-7 items-center justify-center rounded-lg border ${isActive ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"}`}
												>
													{cmd.icon}
												</span>
												<span className="min-w-0 flex-1">
													<span className="block font-medium">{cmd.label}</span>
													{cmd.description && (
														<span className="block truncate text-xs text-muted-foreground">
															{cmd.description}
														</span>
													)}
												</span>
												{isActive && (
													<kbd className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
														↵
													</kbd>
												)}
											</button>
										);
									})}
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-border px-4 py-2">
					<div className="flex items-center gap-3 text-[10px] text-muted-foreground">
						<span className="flex items-center gap-1">
							<kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
								↑↓
							</kbd>
							{isPt ? "navegar" : "navigate"}
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
								↵
							</kbd>
							{isPt ? "abrir" : "open"}
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
								ESC
							</kbd>
							{isPt ? "fechar" : "close"}
						</span>
					</div>
					<span className="text-[10px] text-muted-foreground">
						<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
							Ctrl
						</kbd>
						{" + "}
						<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
							K
						</kbd>
					</span>
				</div>
			</dialog>
		</div>,
		document.body,
	);
}
