import { Info } from "lucide-react";
import type { ReactNode } from "react";

type PageGuideProps = {
	title: string;
	items: string[];
	footer?: ReactNode;
};

export function PageGuide({ title, items, footer }: PageGuideProps) {
	return (
		<article className="rounded-xl border border-info/25 bg-info/8 px-5 py-4 shadow-sm">
			<div className="flex items-center gap-2">
				<Info className="h-3.5 w-3.5 shrink-0 text-info" />
				<h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-info">
					{title}
				</h2>
			</div>
			<ul className="mt-3 space-y-1.5">
				{items.map((item) => (
					<li
						key={item}
						className="flex items-start gap-2 text-sm text-muted-foreground"
					>
						<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-info/60" />
						{item}
					</li>
				))}
			</ul>
			{footer ? (
				<div className="mt-3 border-t border-info/15 pt-2 text-xs text-muted-foreground">
					{footer}
				</div>
			) : null}
		</article>
	);
}
