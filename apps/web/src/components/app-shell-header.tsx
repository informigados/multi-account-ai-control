"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

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
}> = [
	{ href: "/", labelKey: "dashboard" },
	{ href: "/providers", labelKey: "providers" },
	{ href: "/accounts", labelKey: "accounts" },
	{ href: "/data", labelKey: "data" },
	{ href: "/audit", labelKey: "audit" },
	{ href: "/settings", labelKey: "settings" },
	{ href: "/about", labelKey: "about" },
];

export function AppShellHeader({
	username,
	locale,
	currentPath,
}: AppShellHeaderProps) {
	const t = getDictionary(locale);
	const [menuOpen, setMenuOpen] = useState(false);

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

	return (
		<header className="relative rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
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
				{navItems.map((item) => (
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
						{t.shell.nav[item.labelKey]}
					</Link>
				))}
			</nav>

			{menuOpen ? (
				<>
					<button
						type="button"
						aria-label={t.shell.actions.closeMenu}
						className="fixed inset-0 z-40 bg-black/45 md:hidden"
						onClick={() => setMenuOpen(false)}
					/>
					<aside className="fixed inset-y-0 right-0 z-50 w-[min(82vw,340px)] max-w-full overflow-y-auto border-l border-border bg-card p-5 shadow-2xl md:hidden">
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
								className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
								onClick={() => setMenuOpen(false)}
							>
								X
							</button>
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							{t.shell.loggedInAs} {username}
						</p>

						<nav className="mt-4 flex flex-col gap-2">
							{navItems.map((item) => (
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
									{t.shell.nav[item.labelKey]}
								</Link>
							))}
						</nav>

						<div className="mt-6 space-y-2">
							<LogoutButton label={t.shell.actions.logout} />
						</div>
					</aside>
				</>
			) : null}
		</header>
	);
}
