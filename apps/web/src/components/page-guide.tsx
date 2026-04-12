import type { ReactNode } from "react";

type PageGuideProps = {
	title: string;
	items: string[];
	footer?: ReactNode;
};

export function PageGuide({ title, items, footer }: PageGuideProps) {
	return (
		<article className="rounded-xl border border-info/30 bg-info/10 p-4 text-sm text-foreground shadow-sm">
			<h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-info">
				{title}
			</h2>
			<ul className="mt-2 space-y-1.5 text-sm">
				{items.map((item) => (
					<li key={item} className="text-muted-foreground">
						• {item}
					</li>
				))}
			</ul>
			{footer ? (
				<div className="mt-2 text-xs text-muted-foreground">{footer}</div>
			) : null}
		</article>
	);
}
