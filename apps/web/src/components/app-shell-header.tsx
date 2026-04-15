"use client";

import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
	BookOpenText,
	ChartNoAxesCombined,
	Database,
	FolderCog,
	type LucideIcon,
	ShieldCheck,
	UsersRound,
	Waypoints,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AppShellHeaderProps = {
	username: string;
	locale: AppLocale;
	currentPath:
		| "/"
		| "/providers"
		| "/accounts"
		| "/audit"
		| "/data"
		| "/settings"
		| "/about";
};

const navItems: Array<{
	href:
		| "/"
		| "/providers"
		| "/accounts"
		| "/audit"
		| "/data"
		| "/settings"
		| "/about";
	labelKey:
		| "dashboard"
		| "providers"
		| "accounts"
		| "data"
		| "audit"
		| "settings"
		| "about";
	icon: LucideIcon;
}> = [
	{ href: "/", labelKey: "dashboard", icon: ChartNoAxesCombined },
	{ href: "/providers", labelKey: "providers", icon: Waypoints },
	{ href: "/accounts", labelKey: "accounts", icon: UsersRound },
	{ href: "/data", labelKey: "data", icon: Database },
	{ href: "/audit", labelKey: "audit", icon: ShieldCheck },
	{ href: "/settings", labelKey: "settings", icon: FolderCog },
	{ href: "/about", labelKey: "about", icon: BookOpenText },
];

export function AppShellHeader({
	username,
	locale,
	currentPath,
}: AppShellHeaderProps) {
	const t = getDictionary(locale);
	const [menuOpen, setMenuOpen] = useState(false);
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		if (!menuOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		document.body.style.overflow = "hidden";

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = "";
		};
	}, [menuOpen]);

	const mobileMenu =
		menuOpen && isClient
			? createPortal(
					<>
						<button
							type="button"
							aria-label={t.shell.actions.closeMenu}
							className="fixed inset-0 z-[90] bg-black/45 md:hidden"
							onClick={() => setMenuOpen(false)}
						/>
						<aside className="fixed inset-y-0 right-0 z-[100] w-[min(82vw,340px)] max-w-full overflow-y-auto border-l border-border bg-card p-5 shadow-2xl md:hidden">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<img
										src="/favicon.svg"
										alt="Multi Account AI Control"
										className="h-5 w-5 shrink-0"
									/>
									<p className="text-sm font-semibold">{t.shell.productName}</p>
								</div>
								<button
									type="button"
									aria-label={t.shell.actions.closeMenu}
									className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
									onClick={() => setMenuOpen(false)}
								>
									<X className="h-4 w-4" />
								</button>
							</div>
							<p className="mt-2 text-sm text-muted-foreground">
								{t.shell.loggedInAs} {username}
							</p>

							<nav className="mt-4 flex flex-col gap-2">
								{navItems.map((item) => {
									const Icon = item.icon;
									return (
										<Link
											key={item.href}
											href={item.href}
											onClick={() => setMenuOpen(false)}
											className={cn(
												"rounded-md px-3 py-2 text-sm transition",
												currentPath === item.href
													? "bg-primary text-primary-foreground"
													: "bg-muted text-foreground hover:bg-muted/80",
											)}
										>
											<span className="inline-flex items-center gap-2">
												<Icon className="h-4 w-4" />
												{t.shell.nav[item.labelKey]}
											</span>
										</Link>
									);
								})}
							</nav>

							<div className="mt-6 space-y-2">
								<LogoutButton label={t.shell.actions.logout} />
							</div>
						</aside>
					</>,
					document.body,
				)
			: null;

	return (
		<>
			<CommandPalette locale={locale} />
			<header className="sticky top-0 z-40 rounded-xl border border-border bg-card/90 shadow-sm backdrop-blur-md">
				{/* Top row: logo + user + actions */}
				<div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
					<div className="flex items-center gap-2.5">
						<img
							src="/favicon.svg"
							alt="Multi Account AI Control"
							className="h-6 w-6 shrink-0"
						/>
						<div className="hidden sm:block">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80">
								{t.shell.productName}
							</p>
						</div>
					</div>

					{/* Desktop: user chip + search + actions */}
					<div className="hidden items-center gap-2 md:flex">
						<span className="rounded-md border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
							{t.shell.loggedInAs}{" "}
							<span className="font-semibold text-foreground">{username}</span>
						</span>
						{/* Search / Command Palette trigger */}
						<button
							type="button"
							aria-label="Open command palette (Ctrl+K)"
							onClick={() =>
								window.dispatchEvent(new Event("open-command-palette"))
							}
							className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
						>
							<svg
								viewBox="0 0 20 20"
								fill="currentColor"
								className="h-3.5 w-3.5"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="hidden lg:inline">
								{locale === "pt_BR" || locale === "pt_PT"
									? "Buscar..."
									: "Search..."}
							</span>
							<kbd className="hidden rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px] lg:inline">
								Ctrl+K
							</kbd>
						</button>
						<ThemeToggle />
						<LogoutButton label={t.shell.actions.logout} />
					</div>

					{/* Mobile: theme + hamburger */}
					<div className="flex items-center gap-2 md:hidden">
						<ThemeToggle />
						<button
							type="button"
							aria-label={
								menuOpen ? t.shell.actions.closeMenu : t.shell.actions.openMenu
							}
							onClick={() => setMenuOpen((value) => !value)}
							className="group inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/90 transition hover:bg-muted/60"
						>
							<span className="relative h-4 w-5">
								<span
									className={cn(
										"absolute left-0 top-0 h-0.5 w-5 bg-foreground transition",
										menuOpen ? "top-1.5 rotate-45" : "",
									)}
								/>
								<span
									className={cn(
										"absolute left-0 top-1.5 h-0.5 w-5 bg-foreground transition",
										menuOpen ? "opacity-0" : "",
									)}
								/>
								<span
									className={cn(
										"absolute left-0 top-3 h-0.5 w-5 bg-foreground transition",
										menuOpen ? "top-1.5 -rotate-45" : "",
									)}
								/>
							</span>
						</button>
					</div>
				</div>

				{/* Desktop nav — underline style */}
				<nav
					className="mt-1 hidden gap-0.5 px-3 pb-0 md:flex"
					aria-label="Main navigation"
				>
					{navItems.map((item) => {
						const Icon = item.icon;
						const isActive = currentPath === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
									isActive
										? "text-primary"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-3.5 w-3.5 shrink-0" />
								{t.shell.nav[item.labelKey]}
								{/* Animated bottom indicator */}
								{isActive && (
									<span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
								)}
							</Link>
						);
					})}
				</nav>
			</header>
			{mobileMenu}
		</>
	);
}
