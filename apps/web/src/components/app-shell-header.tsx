"use client";

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
			<header className="sticky top-0 z-40 rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-1">
						<div className="flex items-center gap-2">
							<img
								src="/favicon.svg"
								alt="Multi Account AI Control"
								className="h-6 w-6 shrink-0"
							/>
							<p className="truncate text-xs uppercase tracking-[0.22em] text-muted-foreground">
								{t.shell.productName}
							</p>
						</div>
						<p className="truncate text-sm text-muted-foreground">
							{t.shell.loggedInAs} {username}
						</p>
					</div>

					<div className="hidden items-center gap-2 md:flex">
						<ThemeToggle />
						<LogoutButton label={t.shell.actions.logout} />
					</div>

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

				<nav className="mt-3 hidden flex-wrap gap-2 md:flex">
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"whitespace-nowrap rounded-md px-3 py-2 text-sm transition",
									currentPath === item.href
										? "bg-primary text-primary-foreground"
										: "bg-muted text-foreground hover:bg-muted/80",
								)}
							>
								<span className="inline-flex items-center gap-1.5">
									<Icon className="h-3.5 w-3.5" />
									{t.shell.nav[item.labelKey]}
								</span>
							</Link>
						);
					})}
				</nav>
			</header>
			{mobileMenu}
		</>
	);
}
