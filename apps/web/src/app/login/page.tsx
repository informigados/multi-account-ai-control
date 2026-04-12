import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n";
import { ShieldCheck } from "lucide-react";

export default async function LoginPage() {
	const locale = DEFAULT_LOCALE;
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
