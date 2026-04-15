import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";
import { DEFAULT_LOCALE, getDictionary, normalizeLocale } from "@/lib/i18n";
import { ShieldCheck } from "lucide-react";
import { headers } from "next/headers";

function detectLocaleFromAcceptLanguage(acceptLanguage: string | null) {
	if (!acceptLanguage) return DEFAULT_LOCALE;
	// Map common Accept-Language BCP 47 tags to AppLocale
	const mapping: Record<string, string> = {
		"pt-BR": "pt_BR",
		"pt-br": "pt_BR",
		"pt-PT": "pt_PT",
		"pt-pt": "pt_PT",
		pt: "pt_BR",
		en: "en",
		es: "es",
		"zh-CN": "zh_CN",
		"zh-cn": "zh_CN",
		zh: "zh_CN",
	};
	const langs = acceptLanguage
		.split(",")
		.map((l) => l.split(";")[0]?.trim() ?? "");
	for (const lang of langs) {
		// Try exact match first, then prefix (e.g. "en-US" → "en")
		if (mapping[lang]) return normalizeLocale(mapping[lang]);
		const prefix = lang.split("-")[0] ?? "";
		if (mapping[prefix]) return normalizeLocale(mapping[prefix]);
	}
	return DEFAULT_LOCALE;
}

export default async function LoginPage() {
	const headerList = await headers();
	const acceptLanguage = headerList.get("accept-language");
	const locale = detectLocaleFromAcceptLanguage(acceptLanguage);
	const t = getDictionary(locale);

	return (
		<main className="grid min-h-screen place-items-center px-6">
			<div className="w-full max-w-md rounded-2xl border border-border bg-card/90 p-6 shadow-lg backdrop-blur md:p-8">
				<div className="mb-6 flex items-start justify-between">
					<div>
						<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
							{t.login.localAuth}
						</p>
						<h1 className="mt-2 text-2xl font-semibold">{t.login.title}</h1>
					</div>
					<ThemeToggle />
				</div>

				<div className="mb-5 flex items-center gap-2 rounded-md border border-info/20 bg-info/10 px-3 py-2 text-xs text-info">
					<ShieldCheck className="h-4 w-4" />
					{t.login.badge}
				</div>

				<LoginForm locale={locale} />
			</div>
		</main>
	);
}
