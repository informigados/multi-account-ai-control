import type { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

type SiteFooterProps = {
	locale: AppLocale;
};

export function SiteFooter({ locale }: SiteFooterProps) {
	const t = getDictionary(locale);
	const year = new Date().getFullYear();
	const version = "1.2.0";

	return (
		<footer className="mt-8 border-t border-border/50 bg-card/40 px-6 py-6 backdrop-blur-sm">
			<div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1.5 text-center text-xs text-muted-foreground md:px-10">
				<p className="flex items-center gap-1.5">
					<span>{year} © Multi Account AI Control</span>
					<span aria-hidden className="opacity-40">
						•
					</span>
					<span className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
						v{version}
					</span>
				</p>
				<p>
					{t.footer.designedBy}{" "}
					<a
						href="https://informigados.github.io/"
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium text-foreground/80 transition hover:text-foreground hover:underline"
					>
						INformigados
					</a>
					.
				</p>
			</div>
		</footer>
	);
}
