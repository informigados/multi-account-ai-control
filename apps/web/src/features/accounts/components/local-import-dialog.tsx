"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useEffect, useState } from "react";

/** Provider slugs that support local session import */
export type LocalImportProvider =
	| "gemini-cli"
	| "codex"
	| "zed"
	| "cursor"
	| "windsurf"
	| "github-copilot";

export type DetectedLocalAccount = {
	identifier: string;
	displayName: string;
	planName?: string;
	tokenPreview?: string;
	providerSlug: string;
};

const PROVIDER_LABELS: Record<LocalImportProvider, string> = {
	"gemini-cli": "Gemini CLI",
	codex: "Codex",
	zed: "Zed",
	cursor: "Cursor",
	windsurf: "Windsurf",
	"github-copilot": "GitHub Copilot",
};

type LocalImportDialogProps = {
	locale?: AppLocale;
	onImport?: (account: DetectedLocalAccount) => void;
};

/** Checks whether we're running inside a Tauri desktop app */
function isTauri(): boolean {
	return (
		typeof window !== "undefined" &&
		"__TAURI_INTERNALS__" in window &&
		(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !==
			undefined
	);
}

export function LocalImportDialog({
	locale = "pt_BR",
	onImport,
}: LocalImportDialogProps) {
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	const ui = {
		trigger: text("Importar do app local", "Import from local app"),
		title: text("Importar sessão local", "Import local session"),
		subtitle: text(
			"Detecta contas já logadas nos apps AI instalados nesta máquina.",
			"Detects accounts already logged into AI apps installed on this machine.",
		),
		webOnly: text(
			"Esta funcionalidade está disponível apenas no app desktop instalável.",
			"This feature is only available in the installable desktop app.",
		),
		webOnlyHint: text(
			"Baixe o executável (.msi) e use-o para importar sessões locais automaticamente.",
			"Download the executable (.msi) and use it to import local sessions automatically.",
		),
		selectProvider: text("Selecione o provedor:", "Select provider:"),
		detect: text("Detectar conta", "Detect account"),
		detecting: text("Detectando...", "Detecting..."),
		noAccount: text(
			"Nenhuma conta encontrada para este provedor.",
			"No account found for this provider.",
		),
		import: text("Importar esta conta", "Import this account"),
		close: text("Fechar", "Close"),
		identifier: text("Identificador:", "Identifier:"),
		plan: text("Plano:", "Plan:"),
		token: text("Token (prévia):", "Token (preview):"),
		errorDetect: text("Falha ao detectar.", "Detection failed."),
	};

	const [isOpen, setIsOpen] = useState(false);
	const [selectedProvider, setSelectedProvider] =
		useState<LocalImportProvider>("gemini-cli");
	const [detected, setDetected] = useState<DetectedLocalAccount | null>(null);
	const [isDetecting, setIsDetecting] = useState(false);
	const [detectError, setDetectError] = useState<string | null>(null);
	const isDesktop = isTauri();

	useEffect(() => {
		if (!isOpen) {
			setDetected(null);
			setDetectError(null);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen]);

	async function detect() {
		if (!isDesktop) return;
		setIsDetecting(true);
		setDetected(null);
		setDetectError(null);
		try {
			// Access Tauri's invoke via the injected global (avoids missing @tauri-apps/api package)
			type TauriInternals = {
				invoke: (
					cmd: string,
					args?: Record<string, unknown>,
				) => Promise<unknown>;
			};
			const tauriInternals = (
				window as unknown as { __TAURI_INTERNALS__?: TauriInternals }
			).__TAURI_INTERNALS__;
			if (!tauriInternals?.invoke) {
				throw new Error("Tauri invoke não disponível.");
			}
			const result = (await tauriInternals.invoke("detect_local_accounts", {
				provider: selectedProvider,
			})) as DetectedLocalAccount | null;

			if (!result) {
				setDetectError(ui.noAccount);
			} else {
				setDetected(result);
			}
		} catch (err) {
			setDetectError(err instanceof Error ? err.message : ui.errorDetect);
		} finally {
			setIsDetecting(false);
		}
	}

	function handleImport() {
		if (!detected) return;
		onImport?.(detected);
		setIsOpen(false);
	}

	function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
		if (e.target === e.currentTarget) setIsOpen(false);
	}

	function handleBackdropKey(e: React.KeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" || e.key === " ") setIsOpen(false);
	}

	return (
		<>
			{/* Trigger — always visible; click shows the dialog */}
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				title={ui.trigger}
				aria-label={ui.trigger}
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
					className="h-4 w-4"
					role="img"
					aria-label={ui.trigger}
				>
					<title>{ui.trigger}</title>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				{ui.trigger}
			</button>

			{isOpen && (
				<dialog
					open
					className="fixed inset-0 z-[110] m-0 h-full w-full max-w-none border-0 bg-transparent p-0"
					aria-labelledby="local-import-title"
					onClose={() => setIsOpen(false)}
				>
					<div
						className="flex min-h-full items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
						onClick={handleBackdropClick}
						onKeyDown={handleBackdropKey}
					>
						<div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
							{/* Header */}
							<div className="mb-1 flex items-center justify-between">
								<h2 id="local-import-title" className="text-base font-semibold">
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
							<p className="mb-4 text-xs text-muted-foreground">
								{ui.subtitle}
							</p>

							{/* Web-only notice */}
							{!isDesktop && (
								<div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
										className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50"
										role="img"
										aria-label="Desktop only"
									>
										<title>Desktop only</title>
										<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
										<line x1="8" y1="21" x2="16" y2="21" />
										<line x1="12" y1="17" x2="12" y2="21" />
									</svg>
									<p className="text-sm font-medium text-foreground">
										{ui.webOnly}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{ui.webOnlyHint}
									</p>
								</div>
							)}

							{/* Desktop: provider picker + detect */}
							{isDesktop && (
								<div className="space-y-4">
									<div className="space-y-1.5">
										<label
											htmlFor="li-provider"
											className="text-xs text-muted-foreground"
										>
											{ui.selectProvider}
										</label>
										<select
											id="li-provider"
											value={selectedProvider}
											onChange={(e) =>
												setSelectedProvider(
													e.target.value as LocalImportProvider,
												)
											}
											className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
										>
											{(
												Object.keys(PROVIDER_LABELS) as LocalImportProvider[]
											).map((slug) => (
												<option key={slug} value={slug}>
													{PROVIDER_LABELS[slug]}
												</option>
											))}
										</select>
									</div>

									<Button
										type="button"
										onClick={() => void detect()}
										disabled={isDetecting}
										className="w-full"
									>
										{isDetecting ? ui.detecting : ui.detect}
									</Button>

									{detectError && (
										<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
											{detectError}
										</p>
									)}

									{detected && (
										<div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
											<div className="space-y-1">
												<p>
													<span className="text-muted-foreground">
														{ui.identifier}
													</span>{" "}
													<span className="font-medium">
														{detected.identifier}
													</span>
												</p>
												{detected.planName && (
													<p>
														<span className="text-muted-foreground">
															{ui.plan}
														</span>{" "}
														<span>{detected.planName}</span>
													</p>
												)}
												{detected.tokenPreview && (
													<p>
														<span className="text-muted-foreground">
															{ui.token}
														</span>{" "}
														<span className="font-mono">
															{detected.tokenPreview}
														</span>
													</p>
												)}
											</div>
											<Button
												type="button"
												onClick={handleImport}
												className="mt-3 w-full"
												size="sm"
											>
												{ui.import}
											</Button>
										</div>
									)}
								</div>
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
