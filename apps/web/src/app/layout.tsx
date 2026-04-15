import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IdleLockScreen } from "@/components/idle-lock-screen";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { getRequestLocale } from "@/lib/auth/locale";
import { toHtmlLang } from "@/lib/i18n";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Multi Account AI Control",
	description: "Local-first command center for managing AI accounts.",
	icons: {
		icon: "/favicon.svg",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f8fafc" },
		{ media: "(prefers-color-scheme: dark)", color: "#0f172a" },
	],
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getRequestLocale();

	return (
		<html lang={toHtmlLang(locale)} data-scroll-behavior="smooth" suppressHydrationWarning>
			<body className={spaceGrotesk.variable}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<div className="flex min-h-screen flex-col">
						<div className="flex-1">{children}</div>
						<SiteFooter locale={locale} />
					</div>
					<IdleLockScreen locale={locale} />
				</ThemeProvider>
			</body>
		</html>
	);
}
