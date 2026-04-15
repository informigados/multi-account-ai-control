"use client";

import { Button } from "@/components/ui/button";
import type { AccountView } from "@/features/accounts/account-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";

type ExportJsonDialogProps = {
	account: AccountView;
	locale?: AppLocale;
};

function buildExportPayload(account: AccountView) {
	return {
		id: account.id,
		displayName: account.displayName,
		identifier: account.identifier,
		planName: account.planName,
		accountType: account.accountType,
		status: account.status,
		priority: account.priority,
		tags: account.tags,
		provider: account.provider
			? { name: account.provider.name, slug: account.provider.slug }
			: null,
		nextResetAt: account.nextResetAt,
		lastSyncAt: account.lastSyncAt,
		createdAt: account.createdAt,
		updatedAt: account.updatedAt,
		latestUsage: account.latestUsage
			? {
					usedPercent: account.latestUsage.usedPercent,
					remainingPercent: account.latestUsage.remainingPercent,
					totalQuota: account.latestUsage.totalQuota,
					usedQuota: account.latestUsage.usedQuota,
					remainingQuota: account.latestUsage.remainingQuota,
					requestCount: account.latestUsage.requestCount,
					tokenCount: account.latestUsage.tokenCount,
					creditBalance: account.latestUsage.creditBalance,
					measuredAt: account.latestUsage.measuredAt,
					resetAt: account.latestUsage.resetAt,
					sourceType: account.latestUsage.sourceType,
				}
			: null,
	};
}

export function ExportJsonDialog({
	account,
	locale = "pt_BR",
}: ExportJsonDialogProps) {
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });

	const ui = {
		buttonLabel: text(
			"Exportar JSON",
			"Export JSON",
			"Exportar JSON",
			"导出 JSON",
		),
		title: text("Exportar JSON", "Export JSON", "Exportar JSON", "导出 JSON"),
		preview: text("Prévia", "Preview", "Vista previa", "预览"),
		hide: text("Ocultar", "Hide", "Ocultar", "隐藏"),
		copy: text("Copiar", "Copy", "Copiar", "复制"),
		download: text("Baixar", "Download", "Descargar", "下载"),
		copied: text("Copiado!", "Copied!", "¡Copiado!", "已复制！"),
		close: text("Fechar", "Close", "Cerrar", "关闭"),
	};

	const [isOpen, setIsOpen] = useState(false);
	const [showPreview, setShowPreview] = useState(true);
	const [copyLabel, setCopyLabel] = useState(ui.copy);
	const previewRef = useRef<HTMLPreElement>(null);

	const jsonText = JSON.stringify(buildExportPayload(account), null, 2);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen]);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(jsonText);
			setCopyLabel(ui.copied);
			setTimeout(() => setCopyLabel(ui.copy), 2000);
		} catch {
			previewRef.current?.focus();
			window.getSelection()?.selectAllChildren(previewRef.current as Node);
		}
	}

	function downloadJson() {
		const blob = new Blob([jsonText], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		const safeName = account.displayName
			.replace(/[^a-z0-9_-]/gi, "_")
			.toLowerCase();
		anchor.href = url;
		anchor.download = `${safeName}_${account.id.slice(0, 8)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) setIsOpen(false);
	}

	function handleBackdropKey(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Enter" || event.key === " ") setIsOpen(false);
	}

	return (
		<>
			{/* Trigger button */}
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				aria-label={`${ui.buttonLabel} — ${account.displayName}`}
				title={ui.buttonLabel}
				className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
					aria-label={ui.buttonLabel}
				>
					<title>{ui.buttonLabel}</title>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
			</button>

			{isOpen && (
				<dialog
					open
					className="fixed inset-0 z-[110] m-0 h-full w-full max-w-none border-0 bg-transparent p-0"
					aria-labelledby="export-json-title"
					onClose={() => setIsOpen(false)}
				>
					<div
						className="flex min-h-full items-start justify-center bg-background/80 px-4 py-8 backdrop-blur-sm"
						onClick={handleBackdropClick}
						onKeyDown={handleBackdropKey}
					>
						<div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-xl">
							{/* Header */}
							<div className="mb-4 flex items-center justify-between">
								<h2 id="export-json-title" className="text-base font-semibold">
									{ui.title}
								</h2>
								<button
									type="button"
									onClick={() => setIsOpen(false)}
									aria-label={ui.close}
									className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
										aria-label={ui.close}
									>
										<title>{ui.close}</title>
										<line x1="18" y1="6" x2="6" y2="18" />
										<line x1="6" y1="6" x2="18" y2="18" />
									</svg>
								</button>
							</div>

							{/* Action buttons */}
							<div className="mb-3 flex items-center gap-2">
								<button
									type="button"
									onClick={() => setShowPreview((v) => !v)}
									className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
								>
									{showPreview ? (
										<>
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
												aria-label={ui.hide}
											>
												<title>{ui.hide}</title>
												<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
												<line x1="1" y1="1" x2="23" y2="23" />
											</svg>
											{ui.hide}
										</>
									) : (
										<>
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
												aria-label={ui.preview}
											>
												<title>{ui.preview}</title>
												<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
												<circle cx="12" cy="12" r="3" />
											</svg>
											{ui.preview}
										</>
									)}
								</button>

								<button
									type="button"
									onClick={() => void copyToClipboard()}
									className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
										aria-label={ui.copy}
									>
										<title>{ui.copy}</title>
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
									</svg>
									{copyLabel}
								</button>

								<button
									type="button"
									onClick={downloadJson}
									className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
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
										aria-label={ui.download}
									>
										<title>{ui.download}</title>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="7 10 12 15 17 10" />
										<line x1="12" y1="15" x2="12" y2="3" />
									</svg>
									{ui.download}
								</button>
							</div>

							{/* JSON preview — region is keyboard accessible via tab */}
							{showPreview && (
								<pre
									ref={previewRef}
									// biome-ignore lint/a11y/noNoninteractiveTabindex: allows keyboard users to scroll monospace block
									tabIndex={0}
									className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground/90 outline-none"
								>
									{jsonText}
								</pre>
							)}

							<div className="mt-4 flex justify-end">
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									{ui.close}
								</Button>
							</div>
						</div>
					</div>
				</dialog>
			)}
		</>
	);
}
