import type { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

type SiteFooterProps = {
	locale: AppLocale;
};

export function SiteFooter({ locale }: SiteFooterProps) {
	const t = getDictionary(locale);
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-border/70 bg-card/60 px-6 py-5 text-center text-sm text-muted-foreground">
			<p>{year} © Multi Account AI Control.</p>
			<p className="mt-1">
				{t.footer.designedBy}{" "}
				<a
					href="https://informigados.github.io/"
					target="_blank"
					rel="noreferrer"
					className="font-medium text-foreground hover:underline"
				>
					INformigados
				</a>
				.
			</p>
		</footer>
	);
}
