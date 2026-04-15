"use client";

import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useEffect, useRef } from "react";

type BatchActionBarProps = {
	count: number;
	locale?: AppLocale;
	onArchive: () => void;
	onDelete: () => void;
	onExport: () => void;
	onClear: () => void;
	isLoading?: boolean;
};

export function BatchActionBar({
	count,
	locale = "pt_BR",
	onArchive,
	onDelete,
	onExport,
	onClear,
	isLoading = false,
}: BatchActionBarProps) {
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	const ui = {
		selected: text(
			`${count} conta${count !== 1 ? "s" : ""} selecionada${count !== 1 ? "s" : ""}`,
			`${count} account${count !== 1 ? "s" : ""} selected`,
		),
		archive: text("Arquivar", "Archive"),
		delete: text("Excluir", "Delete"),
		export: text("Exportar JSON", "Export JSON"),
		clear: text("Cancelar seleção", "Clear selection"),
		loading: text("Processando...", "Processing..."),
	};

	const barRef = useRef<HTMLDivElement>(null);

	// Focus trap: when bar appears, focus first button
	useEffect(() => {
		if (count > 0) {
			const first = barRef.current?.querySelector<HTMLElement>("button");
			first?.focus();
		}
	}, [count]);

	if (count === 0) return null;

	return (
		<div
			ref={barRef}
			role="toolbar"
			aria-label={ui.selected}
			className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-2xl backdrop-blur-sm"
		>
			{/* Count badge */}
			<span className="mr-2 min-w-max rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
				{ui.selected}
			</span>

			{/* Export */}
			<button
				type="button"
				onClick={onExport}
				disabled={isLoading}
				className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3.5 w-3.5"
					role="img"
					aria-label={ui.export}
				>
					<title>{ui.export}</title>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				{ui.export}
			</button>

			{/* Archive */}
			<button
				type="button"
				onClick={onArchive}
				disabled={isLoading}
				className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3.5 w-3.5"
					role="img"
					aria-label={ui.archive}
				>
					<title>{ui.archive}</title>
					<polyline points="21 8 21 21 3 21 3 8" />
					<rect x="1" y="3" width="22" height="5" />
					<line x1="10" y1="12" x2="14" y2="12" />
				</svg>
				{ui.archive}
			</button>

			{/* Delete */}
			<button
				type="button"
				onClick={onDelete}
				disabled={isLoading}
				className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-card px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3.5 w-3.5"
					role="img"
					aria-label={ui.delete}
				>
					<title>{ui.delete}</title>
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
					<path d="M10 11v6" />
					<path d="M14 11v6" />
					<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
				</svg>
				{isLoading ? ui.loading : ui.delete}
			</button>

			{/* Divider */}
			<div className="mx-1 h-5 w-px bg-border" aria-hidden />

			{/* Clear */}
			<button
				type="button"
				onClick={onClear}
				disabled={isLoading}
				aria-label={ui.clear}
				className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-4 w-4"
					role="img"
					aria-label={ui.clear}
				>
					<title>{ui.clear}</title>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	);
}
