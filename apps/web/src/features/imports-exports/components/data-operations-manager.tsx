"use client";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApiFeedback = {
	type: "success" | "error";
	operation: string;
	message: string;
	payload?: unknown;
};

type ImportHistoryItem = {
	id: string;
	fileName: string;
	fileType: "csv" | "json";
	importedBy: string | null;
	importedAt: string;
	status: "pending" | "success" | "failed" | "partial";
	summaryJson: unknown;
};

type ImportHistoryResponse = {
	imports: ImportHistoryItem[];
	page?: {
		limit: number;
		nextCursor: string | null;
	};
};

function prettyJson(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function summarizeImportRow(summary: unknown) {
	if (!summary || typeof summary !== "object") return "-";

	const candidate = summary as {
		type?: string;
		accounts?: { created?: number; updated?: number; failed?: number };
		providers?: { created?: number; updated?: number; failed?: number };
		usageSnapshots?: { created?: number; failed?: number };
		summary?: {
			accounts?: number;
			providers?: number;
			usageSnapshots?: number;
		};
	};

	if (
		candidate.type === "backup_restore" ||
		candidate.type === "backup_restore_dry_run"
	) {
		const restoreSummary = candidate.summary;
		if (!restoreSummary) return candidate.type;
		return `restore P:${restoreSummary.providers ?? 0} A:${restoreSummary.accounts ?? 0} U:${restoreSummary.usageSnapshots ?? 0}`;
	}

	if (
		!candidate.accounts &&
		!candidate.providers &&
		!candidate.usageSnapshots
	) {
		return "-";
	}

	return [
		`P:${candidate.providers?.created ?? 0}/${candidate.providers?.updated ?? 0}/${candidate.providers?.failed ?? 0}`,
		`A:${candidate.accounts?.created ?? 0}/${candidate.accounts?.updated ?? 0}/${candidate.accounts?.failed ?? 0}`,
		`U:${candidate.usageSnapshots?.created ?? 0}/${candidate.usageSnapshots?.failed ?? 0}`,
	].join(" • ");
}

type DataOperationsManagerProps = {
	locale: AppLocale;
};

export function DataOperationsManager({ locale }: DataOperationsManagerProps) {
	const isPtBr = locale === "pt_BR";
	const ui = {
		operationFailed: isPtBr ? "Operação falhou." : "Operation failed.",
		operationSuccess: isPtBr
			? "Operação executada com sucesso."
			: "Operation executed successfully.",
		importJson: isPtBr ? "Importar JSON" : "Import JSON",
		importCsv: isPtBr ? "Importar CSV" : "Import CSV",
		restoreBackup: isPtBr ? "Restaurar Backup" : "Restore Backup",
		restoreBackupDryRun: isPtBr
			? "Restaurar Backup (Simulação)"
			: "Restore Backup (Dry Run)",
		importHistory: isPtBr ? "Histórico de Importações" : "Import History",
		invalidJsonPayload: isPtBr
			? "O payload de importação JSON não é um JSON válido."
			: "JSON import payload is not valid JSON.",
		csvRequired: isPtBr
			? "Conteúdo CSV é obrigatório."
			: "CSV content is required.",
		confirmRestorePhrase: isPtBr
			? 'Digite "RESTORE BACKUP" exatamente para confirmar a restauração destrutiva.'
			: 'Type "RESTORE BACKUP" exactly to confirm destructive restore.',
		backupMustBeJson: isPtBr
			? "O payload de backup deve ser JSON válido exportado por /api/export/backup."
			: "Backup payload must be valid JSON exported by /api/export/backup.",
		failedLoadHistory: isPtBr
			? "Falha ao carregar histórico de importações."
			: "Failed to load import history.",
		exportTitle: isPtBr ? "Exportação" : "Export",
		exportDescription: isPtBr
			? "Baixe dados operacionais em JSON/CSV ou backup criptografado completo."
			: "Download operational data in JSON/CSV or full encrypted backup.",
		includeArchived: isPtBr
			? "Incluir contas arquivadas"
			: "Include archived accounts",
		includeArchivedHint: isPtBr
			? "Ative para incluir contas arquivadas nos arquivos de exportação."
			: "Enable to include archived accounts in export files.",
		exportJson: isPtBr ? "Exportar JSON" : "Export JSON",
		exportCsv: isPtBr ? "Exportar CSV" : "Export CSV",
		exportEncryptedBackup: isPtBr
			? "Exportar Backup Criptografado"
			: "Export Encrypted Backup",
		importJsonDescription: isPtBr
			? "Aceita arrays de providers, accounts e usageSnapshots."
			: "Supports providers, accounts and usageSnapshots arrays.",
		importJsonHint: isPtBr
			? "Use para carga estruturada completa, preservando relacionamentos."
			: "Use for complete structured load while preserving relationships.",
		clear: isPtBr ? "Limpar" : "Clear",
		running: isPtBr ? "Executando..." : "Running...",
		runJsonImport: isPtBr ? "Executar Importação JSON" : "Run JSON Import",
		importCsvDescription: isPtBr
			? "Colunas esperadas: providerSlug/providerName, displayName, identifier, planName, accountType, status, priority, tags, notesText."
			: "Expected columns: providerSlug/providerName, displayName, identifier, planName, accountType, status, priority, tags, notesText.",
		importCsvHint: isPtBr
			? "Ideal para importação rápida em lote via planilhas."
			: "Ideal for quick bulk import from spreadsheets.",
		runCsvImport: isPtBr ? "Executar Importação CSV" : "Run CSV Import",
		restoreTitle: isPtBr
			? "Restaurar Backup Criptografado"
			: "Restore Encrypted Backup",
		restoreDescription: isPtBr
			? "A restauração substitui os dados atuais do banco. Use apenas artefatos de backup confiáveis."
			: "Restore replaces current database data. Use only trusted backup artifacts.",
		restoreDryRunHint: isPtBr
			? "A simulação valida estrutura e integridade sem alterar o banco."
			: "Dry run validates structure and integrity without changing the database.",
		restoreConfirmHint: isPtBr
			? "A restauração real exige a frase exata para evitar execução acidental."
			: "Real restore requires the exact phrase to prevent accidental execution.",
		restoreConfirmPlaceholder: isPtBr
			? "Frase de confirmação para restauração destrutiva: RESTORE BACKUP"
			: "Confirmation phrase for destructive restore: RESTORE BACKUP",
		dryRunRestore: isPtBr ? "Simular Restauração" : "Dry Run Restore",
		restoreNow: isPtBr ? "Restaurar Backup" : "Restore Backup",
		restoring: isPtBr ? "Restaurando..." : "Restoring...",
		historyDescription: isPtBr
			? "Execuções recentes de importação e restauração com status e resumo."
			: "Recent import and restore executions with status and summary.",
		historySummaryHint: isPtBr
			? "Resumo: P = providers, A = accounts, U = usage snapshots."
			: "Summary: P = providers, A = accounts, U = usage snapshots.",
		refresh: isPtBr ? "Atualizar" : "Refresh",
		searchFileName: isPtBr
			? "Buscar por nome do arquivo"
			: "Search by file name",
		allStatuses: isPtBr ? "Todos os status" : "All statuses",
		allFileTypes: isPtBr ? "Todos os tipos de arquivo" : "All file types",
		clearFilters: isPtBr ? "Limpar filtros" : "Clear filters",
		loadingHistory: isPtBr
			? "Carregando histórico de importações..."
			: "Loading import history...",
		noRecords: isPtBr
			? "Nenhum registro de importação encontrado para os filtros atuais."
			: "No import records found for current filters.",
		thWhen: isPtBr ? "Quando" : "When",
		thFile: isPtBr ? "Arquivo" : "File",
		thType: isPtBr ? "Tipo" : "Type",
		thStatus: isPtBr ? "Status" : "Status",
		thSummary: isPtBr ? "Resumo" : "Summary",
		loadMore: isPtBr ? "Carregar mais" : "Load more",
		loading: isPtBr ? "Carregando..." : "Loading...",
		statusPending: isPtBr ? "pendente" : "pending",
		statusSuccess: isPtBr ? "sucesso" : "success",
		statusPartial: isPtBr ? "parcial" : "partial",
		statusFailed: isPtBr ? "falha" : "failed",
	};

	const [includeArchived, setIncludeArchived] = useState(false);
	const [jsonImportText, setJsonImportText] = useState("");
	const [csvImportText, setCsvImportText] = useState("");
	const [backupImportText, setBackupImportText] = useState("");
	const [restoreConfirmPhrase, setRestoreConfirmPhrase] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<ApiFeedback | null>(null);
	const [importRows, setImportRows] = useState<ImportHistoryItem[]>([]);
	const [importRowsNextCursor, setImportRowsNextCursor] = useState<
		string | null
	>(null);
	const [importRowsHasMore, setImportRowsHasMore] = useState(false);
	const [isLoadingImports, setIsLoadingImports] = useState(true);
	const [isLoadingMoreImports, setIsLoadingMoreImports] = useState(false);
	const [importStatusFilter, setImportStatusFilter] = useState("");
	const [importFileTypeFilter, setImportFileTypeFilter] = useState("");
	const [importSearch, setImportSearch] = useState("");
	const [importRowsReloadToken, setImportRowsReloadToken] = useState(0);

	const exportQuery = useMemo(
		() => (includeArchived ? "?includeArchived=true" : ""),
		[includeArchived],
	);

	async function parseJsonResponse(response: Response) {
		try {
			return (await response.json()) as Record<string, unknown>;
		} catch {
			return null;
		}
	}

	function extractErrorMessage(payload: Record<string, unknown> | null) {
		if (payload && typeof payload.message === "string") {
			return payload.message;
		}
		return ui.operationFailed;
	}

	async function executeRequest(
		operation: string,
		path: string,
		body: unknown,
	) {
		setIsSubmitting(true);
		setFeedback(null);

		try {
			const response = await fetch(path, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const payload = await parseJsonResponse(response);

			if (!response.ok) {
				setFeedback({
					type: "error",
					operation,
					message: extractErrorMessage(payload),
					payload: payload ?? undefined,
				});
				return;
			}

			setFeedback({
				type: "success",
				operation,
				message: ui.operationSuccess,
				payload: payload ?? undefined,
			});
		} catch (error) {
			setFeedback({
				type: "error",
				operation,
				message: error instanceof Error ? error.message : ui.operationFailed,
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	function runJsonImport() {
		try {
			const parsed = JSON.parse(jsonImportText);
			void executeRequest(ui.importJson, "/api/import/json", parsed);
		} catch {
			setFeedback({
				type: "error",
				operation: ui.importJson,
				message: ui.invalidJsonPayload,
			});
		}
	}

	function runCsvImport() {
		if (!csvImportText.trim()) {
			setFeedback({
				type: "error",
				operation: ui.importCsv,
				message: ui.csvRequired,
			});
			return;
		}

		void executeRequest(ui.importCsv, "/api/import/csv", {
			csvText: csvImportText,
		});
	}

	function runBackupRestore(dryRun: boolean) {
		try {
			const parsed = JSON.parse(backupImportText);
			if (!dryRun && restoreConfirmPhrase !== "RESTORE BACKUP") {
				setFeedback({
					type: "error",
					operation: ui.restoreBackup,
					message: ui.confirmRestorePhrase,
				});
				return;
			}

			void executeRequest(
				dryRun ? ui.restoreBackupDryRun : ui.restoreBackup,
				"/api/import/backup",
				{
					artifact: parsed,
					dryRun,
					confirmPhrase: dryRun ? undefined : restoreConfirmPhrase,
				},
			);
		} catch {
			setFeedback({
				type: "error",
				operation: dryRun ? ui.restoreBackupDryRun : ui.restoreBackup,
				message: ui.backupMustBeJson,
			});
		}
	}

	const loadImportRows = useCallback(
		async (cursor?: string | null) => {
			void importRowsReloadToken;
			const isPaginating = Boolean(cursor);
			if (isPaginating) {
				setIsLoadingMoreImports(true);
			} else {
				setIsLoadingImports(true);
			}

			try {
				const query = new URLSearchParams();
				query.set("limit", "12");
				if (cursor) query.set("cursor", cursor);
				if (importStatusFilter) query.set("status", importStatusFilter);
				if (importFileTypeFilter) query.set("fileType", importFileTypeFilter);
				if (importSearch.trim()) query.set("search", importSearch.trim());

				const response = await fetch(`/api/imports?${query.toString()}`, {
					method: "GET",
				});
				if (!response.ok) {
					throw new Error(ui.failedLoadHistory);
				}

				const payload = (await response.json()) as ImportHistoryResponse;
				const nextCursor = payload.page?.nextCursor ?? null;

				setImportRows((previous) =>
					isPaginating ? [...previous, ...payload.imports] : payload.imports,
				);
				setImportRowsNextCursor(nextCursor);
				setImportRowsHasMore(Boolean(nextCursor));
			} catch (error) {
				setFeedback({
					type: "error",
					operation: ui.importHistory,
					message:
						error instanceof Error ? error.message : ui.failedLoadHistory,
				});
			} finally {
				if (isPaginating) {
					setIsLoadingMoreImports(false);
				} else {
					setIsLoadingImports(false);
				}
			}
		},
		[
			importFileTypeFilter,
			importRowsReloadToken,
			importSearch,
			importStatusFilter,
			ui.failedLoadHistory,
			ui.importHistory,
		],
	);

	useEffect(() => {
		setImportRows([]);
		setImportRowsNextCursor(null);
		setImportRowsHasMore(false);
		void loadImportRows(null);
	}, [loadImportRows]);

	return (
		<section className="space-y-6">
			<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<h2 className="text-lg font-semibold">{ui.exportTitle}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{ui.exportDescription}
				</p>
				<div className="mt-3 flex flex-wrap items-center gap-3">
					<label className="flex items-center gap-2 text-sm text-muted-foreground">
						<input
							type="checkbox"
							checked={includeArchived}
							onChange={(event) => setIncludeArchived(event.target.checked)}
						/>
						{ui.includeArchived}
					</label>
					<p className="text-xs text-muted-foreground">
						{ui.includeArchivedHint}
					</p>
					<a
						href={`/api/export/json${exportQuery}`}
						className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
					>
						{ui.exportJson}
					</a>
					<a
						href={`/api/export/csv${exportQuery}`}
						className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
					>
						{ui.exportCsv}
					</a>
					<a
						href="/api/export/backup"
						className="inline-flex h-9 items-center justify-center rounded-md border border-warning/40 bg-warning/10 px-3 text-sm font-medium text-warning transition hover:bg-warning/15"
					>
						{ui.exportEncryptedBackup}
					</a>
				</div>
			</article>

			<div className="grid gap-5 xl:grid-cols-2">
				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-lg font-semibold">{ui.importJson}</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{ui.importJsonDescription}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{ui.importJsonHint}
					</p>
					<textarea
						value={jsonImportText}
						onChange={(event) => setJsonImportText(event.target.value)}
						className="mt-3 min-h-40 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none ring-primary transition focus:ring-2 sm:min-h-48 lg:min-h-56"
						placeholder='{"providers":[],"accounts":[],"usageSnapshots":[]}'
					/>
					<div className="mt-3 flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => setJsonImportText("")}
							disabled={isSubmitting}
						>
							{ui.clear}
						</Button>
						<Button onClick={runJsonImport} disabled={isSubmitting}>
							{isSubmitting ? ui.running : ui.runJsonImport}
						</Button>
					</div>
				</article>

				<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-lg font-semibold">{ui.importCsv}</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{ui.importCsvDescription}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{ui.importCsvHint}
					</p>
					<textarea
						value={csvImportText}
						onChange={(event) => setCsvImportText(event.target.value)}
						className="mt-3 min-h-40 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none ring-primary transition focus:ring-2 sm:min-h-48 lg:min-h-56"
						placeholder="providerName,displayName,identifier,status,tags"
					/>
					<div className="mt-3 flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => setCsvImportText("")}
							disabled={isSubmitting}
						>
							{ui.clear}
						</Button>
						<Button onClick={runCsvImport} disabled={isSubmitting}>
							{isSubmitting ? ui.running : ui.runCsvImport}
						</Button>
					</div>
				</article>
			</div>

			<article className="rounded-xl border border-danger/40 bg-danger/5 p-5 shadow-sm backdrop-blur">
				<h2 className="text-lg font-semibold text-danger">{ui.restoreTitle}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{ui.restoreDescription}
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					{ui.restoreDryRunHint}
				</p>
				<textarea
					value={backupImportText}
					onChange={(event) => setBackupImportText(event.target.value)}
					className="mt-3 min-h-40 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none ring-primary transition focus:ring-2 sm:min-h-48 lg:min-h-56"
					placeholder='{"version":1,"exportType":"backup","encryptedPayload":"..."}'
				/>
				<input
					value={restoreConfirmPhrase}
					onChange={(event) => setRestoreConfirmPhrase(event.target.value)}
					className="mt-3 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					placeholder={ui.restoreConfirmPlaceholder}
				/>
				<p className="mt-1 text-xs text-muted-foreground">
					{ui.restoreConfirmHint}
				</p>
				<div className="mt-3 flex flex-wrap justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => {
							setBackupImportText("");
							setRestoreConfirmPhrase("");
						}}
						disabled={isSubmitting}
					>
						{ui.clear}
					</Button>
					<Button
						variant="outline"
						onClick={() => runBackupRestore(true)}
						disabled={isSubmitting}
					>
						{isSubmitting ? ui.running : ui.dryRunRestore}
					</Button>
					<Button
						onClick={() => runBackupRestore(false)}
						disabled={isSubmitting}
					>
						{isSubmitting ? ui.restoring : ui.restoreNow}
					</Button>
				</div>
			</article>

			<article className="rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold">{ui.importHistory}</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{ui.historyDescription}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{ui.historySummaryHint}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setImportRowsReloadToken((value) => value + 1)}
						disabled={isLoadingImports || isLoadingMoreImports}
					>
						{ui.refresh}
					</Button>
				</div>

				<div className="mt-3 grid gap-2 md:grid-cols-4">
					<input
						value={importSearch}
						onChange={(event) => setImportSearch(event.target.value)}
						placeholder={ui.searchFileName}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					/>
					<select
						value={importStatusFilter}
						onChange={(event) => setImportStatusFilter(event.target.value)}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						<option value="">{ui.allStatuses}</option>
						<option value="pending">{ui.statusPending}</option>
						<option value="success">{ui.statusSuccess}</option>
						<option value="partial">{ui.statusPartial}</option>
						<option value="failed">{ui.statusFailed}</option>
					</select>
					<select
						value={importFileTypeFilter}
						onChange={(event) => setImportFileTypeFilter(event.target.value)}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						<option value="">{ui.allFileTypes}</option>
						<option value="json">json</option>
						<option value="csv">csv</option>
					</select>
					<Button
						variant="ghost"
						onClick={() => {
							setImportSearch("");
							setImportStatusFilter("");
							setImportFileTypeFilter("");
						}}
					>
						{ui.clearFilters}
					</Button>
				</div>

				{isLoadingImports ? (
					<p className="mt-3 text-sm text-muted-foreground">
						{ui.loadingHistory}
					</p>
				) : importRows.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">{ui.noRecords}</p>
				) : (
					<div className="mt-3 space-y-3">
						<div className="overflow-x-auto rounded-lg border border-border">
							<table className="min-w-full text-sm">
								<thead className="bg-muted/70 text-left text-muted-foreground">
									<tr>
										<th className="px-3 py-2">{ui.thWhen}</th>
										<th className="px-3 py-2">{ui.thFile}</th>
										<th className="px-3 py-2">{ui.thType}</th>
										<th className="px-3 py-2">{ui.thStatus}</th>
										<th className="px-3 py-2">{ui.thSummary}</th>
									</tr>
								</thead>
								<tbody>
									{importRows.map((row) => (
										<tr key={row.id} className="border-t border-border/80">
											<td className="px-3 py-2 text-xs text-muted-foreground">
												{formatDateTime(row.importedAt)}
											</td>
											<td className="px-3 py-2 font-medium">{row.fileName}</td>
											<td className="px-3 py-2 text-muted-foreground">
												{row.fileType}
											</td>
											<td className="px-3 py-2">
												<span
													className={`rounded-md px-2 py-1 text-xs ${
														row.status === "success"
															? "bg-success/15 text-success"
															: row.status === "partial"
																? "bg-warning/15 text-warning"
																: row.status === "failed"
																	? "bg-danger/15 text-danger"
																	: "bg-muted text-muted-foreground"
													}`}
												>
													{row.status === "pending"
														? ui.statusPending
														: row.status === "success"
															? ui.statusSuccess
															: row.status === "partial"
																? ui.statusPartial
																: ui.statusFailed}
												</span>
											</td>
											<td className="px-3 py-2 text-xs text-muted-foreground">
												{summarizeImportRow(row.summaryJson)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{importRowsHasMore ? (
							<div className="flex justify-end">
								<Button
									variant="outline"
									size="sm"
									disabled={isLoadingMoreImports}
									onClick={() => {
										if (importRowsNextCursor) {
											void loadImportRows(importRowsNextCursor);
										}
									}}
								>
									{isLoadingMoreImports ? ui.loading : ui.loadMore}
								</Button>
							</div>
						) : null}
					</div>
				)}
			</article>

			{feedback ? (
				<article
					role={feedback.type === "error" ? "alert" : "status"}
					aria-live="polite"
					className={`rounded-xl border p-4 ${
						feedback.type === "success"
							? "border-success/40 bg-success/10"
							: "border-danger/40 bg-danger/10"
					}`}
				>
					<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
						{feedback.operation}
					</p>
					<p className="mt-1 text-sm font-medium">{feedback.message}</p>
					{feedback.payload ? (
						<pre className="mt-2 overflow-x-auto rounded-md bg-background/70 p-3 text-xs">
							{prettyJson(feedback.payload)}
						</pre>
					) : null}
				</article>
			) : null}
		</section>
	);
}
