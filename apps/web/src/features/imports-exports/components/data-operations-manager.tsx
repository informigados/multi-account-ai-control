"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
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
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });

	const ui = {
		operationFailed: text(
			"Operação falhou.",
			"Operation failed.",
			"La operación falló.",
			"操作失败。",
		),
		operationSuccess: text(
			"Operação executada com sucesso.",
			"Operation executed successfully.",
			"Operación ejecutada correctamente.",
			"操作执行成功。",
		),
		importJson: text(
			"Importar JSON",
			"Import JSON",
			"Importar JSON",
			"导入 JSON",
		),
		importCsv: text("Importar CSV", "Import CSV", "Importar CSV", "导入 CSV"),
		restoreBackup: text(
			"Restaurar Backup",
			"Restore Backup",
			"Restaurar copia de seguridad",
			"恢复备份",
		),
		restoreBackupDryRun: text(
			"Restaurar Backup (Simulação)",
			"Restore Backup (Dry Run)",
			"Restaurar copia (simulación)",
			"恢复备份（模拟）",
		),
		importHistory: text(
			"Histórico de Importações",
			"Import History",
			"Historial de importaciones",
			"导入历史",
		),
		invalidJsonPayload: text(
			"O payload de importação JSON não é um JSON válido.",
			"JSON import payload is not valid JSON.",
			"El payload de importación JSON no es válido.",
			"JSON 导入内容无效。",
		),
		csvRequired: text(
			"Conteúdo CSV é obrigatório.",
			"CSV content is required.",
			"El contenido CSV es obligatorio.",
			"CSV 内容是必填项。",
		),
		confirmRestorePhrase: text(
			'Digite "RESTORE BACKUP" exatamente para confirmar a restauração destrutiva.',
			'Type "RESTORE BACKUP" exactly to confirm destructive restore.',
			'Escribe "RESTORE BACKUP" exactamente para confirmar la restauración destructiva.',
			'请准确输入 "RESTORE BACKUP" 以确认破坏性恢复。',
		),
		backupMustBeJson: text(
			"O payload de backup deve ser JSON válido exportado por /api/export/backup.",
			"Backup payload must be valid JSON exported by /api/export/backup.",
			"El payload de respaldo debe ser un JSON válido exportado por /api/export/backup.",
			"备份内容必须是由 /api/export/backup 导出的有效 JSON。",
		),
		failedLoadHistory: text(
			"Falha ao carregar histórico de importações.",
			"Failed to load import history.",
			"Error al cargar el historial de importaciones.",
			"加载导入历史失败。",
		),
		exportTitle: text("Exportação", "Export", "Exportación", "导出"),
		exportDescription: text(
			"Baixe dados operacionais em JSON/CSV ou backup criptografado completo.",
			"Download operational data in JSON/CSV or full encrypted backup.",
			"Descarga datos operativos en JSON/CSV o una copia cifrada completa.",
			"可下载 JSON/CSV 运营数据或完整加密备份。",
		),
		includeArchived: text(
			"Incluir contas arquivadas",
			"Include archived accounts",
			"Incluir cuentas archivadas",
			"包含已归档账号",
		),
		includeArchivedHint: text(
			"Ative para incluir contas arquivadas nos arquivos de exportação.",
			"Enable to include archived accounts in export files.",
			"Activa para incluir cuentas archivadas en los archivos de exportación.",
			"启用后，导出文件将包含已归档账号。",
		),
		exportJson: text(
			"Exportar JSON",
			"Export JSON",
			"Exportar JSON",
			"导出 JSON",
		),
		exportCsv: text("Exportar CSV", "Export CSV", "Exportar CSV", "导出 CSV"),
		exportEncryptedBackup: text(
			"Exportar Backup Criptografado",
			"Export Encrypted Backup",
			"Exportar copia cifrada",
			"导出加密备份",
		),
		importJsonDescription: text(
			"Aceita arrays de providers, accounts e usageSnapshots.",
			"Supports providers, accounts and usageSnapshots arrays.",
			"Admite arrays de providers, accounts y usageSnapshots.",
			"支持 providers、accounts 和 usageSnapshots 数组。",
		),
		importJsonHint: text(
			"Use para carga estruturada completa, preservando relacionamentos.",
			"Use for complete structured load while preserving relationships.",
			"Úsalo para una carga estructurada completa preservando relaciones.",
			"用于完整结构化导入并保留关联关系。",
		),
		clear: text("Limpar", "Clear", "Limpiar", "清空"),
		running: text("Executando...", "Running...", "Ejecutando...", "执行中..."),
		runJsonImport: text(
			"Executar Importação JSON",
			"Run JSON Import",
			"Ejecutar importación JSON",
			"执行 JSON 导入",
		),
		importCsvDescription: text(
			"Colunas esperadas: providerSlug/providerName, displayName, identifier, planName, accountType, status, priority, tags, notesText.",
			"Expected columns: providerSlug/providerName, displayName, identifier, planName, accountType, status, priority, tags, notesText.",
			"Columnas esperadas: providerSlug/providerName, displayName, identifier, planName, accountType, status, priority, tags, notesText.",
			"预期列：providerSlug/providerName、displayName、identifier、planName、accountType、status、priority、tags、notesText。",
		),
		importCsvHint: text(
			"Ideal para importação rápida em lote via planilhas.",
			"Ideal for quick bulk import from spreadsheets.",
			"Ideal para importación masiva rápida desde hojas de cálculo.",
			"适合从表格快速批量导入。",
		),
		runCsvImport: text(
			"Executar Importação CSV",
			"Run CSV Import",
			"Ejecutar importación CSV",
			"执行 CSV 导入",
		),
		restoreTitle: text(
			"Restaurar Backup Criptografado",
			"Restore Encrypted Backup",
			"Restaurar copia cifrada",
			"恢复加密备份",
		),
		restoreDescription: text(
			"A restauração substitui os dados atuais do banco. Use apenas artefatos de backup confiáveis.",
			"Restore replaces current database data. Use only trusted backup artifacts.",
			"La restauración reemplaza los datos actuales de la base. Usa solo respaldos confiables.",
			"恢复会替换当前数据库数据。仅使用可信备份文件。",
		),
		restoreDryRunHint: text(
			"A simulação valida estrutura e integridade sem alterar o banco.",
			"Dry run validates structure and integrity without changing the database.",
			"La simulación valida estructura e integridad sin alterar la base.",
			"模拟恢复会校验结构和完整性，不会修改数据库。",
		),
		restoreConfirmHint: text(
			"A restauração real exige a frase exata para evitar execução acidental.",
			"Real restore requires the exact phrase to prevent accidental execution.",
			"La restauración real exige la frase exacta para evitar ejecución accidental.",
			"正式恢复要求输入准确短语，以防误操作。",
		),
		restoreConfirmPlaceholder: text(
			"Frase de confirmação para restauração destrutiva: RESTORE BACKUP",
			"Confirmation phrase for destructive restore: RESTORE BACKUP",
			"Frase de confirmación para restauración destructiva: RESTORE BACKUP",
			"破坏性恢复确认短语：RESTORE BACKUP",
		),
		dryRunRestore: text(
			"Simular Restauração",
			"Dry Run Restore",
			"Simular restauración",
			"模拟恢复",
		),
		restoreNow: text(
			"Restaurar Backup",
			"Restore Backup",
			"Restaurar copia de seguridad",
			"立即恢复备份",
		),
		restoring: text(
			"Restaurando...",
			"Restoring...",
			"Restaurando...",
			"恢复中...",
		),
		historyDescription: text(
			"Execuções recentes de importação e restauração com status e resumo.",
			"Recent import and restore executions with status and summary.",
			"Ejecuciones recientes de importación y restauración con estado y resumen.",
			"最近的导入与恢复执行记录（含状态与摘要）。",
		),
		historySummaryHint: text(
			"Resumo: P = providers, A = accounts, U = usage snapshots.",
			"Summary: P = providers, A = accounts, U = usage snapshots.",
			"Resumen: P = providers, A = accounts, U = usage snapshots.",
			"摘要：P = providers，A = accounts，U = usage snapshots。",
		),
		refresh: text("Atualizar", "Refresh", "Actualizar", "刷新"),
		searchFileName: text(
			"Buscar por nome do arquivo",
			"Search by file name",
			"Buscar por nombre de archivo",
			"按文件名搜索",
		),
		allStatuses: text(
			"Todos os status",
			"All statuses",
			"Todos los estados",
			"全部状态",
		),
		allFileTypes: text(
			"Todos os tipos de arquivo",
			"All file types",
			"Todos los tipos de archivo",
			"全部文件类型",
		),
		clearFilters: text(
			"Limpar filtros",
			"Clear filters",
			"Limpiar filtros",
			"清除筛选",
		),
		loadingHistory: text(
			"Carregando histórico de importações...",
			"Loading import history...",
			"Cargando historial de importaciones...",
			"正在加载导入历史...",
		),
		noRecords: text(
			"Nenhum registro de importação encontrado para os filtros atuais.",
			"No import records found for current filters.",
			"No se encontraron registros de importación para los filtros actuales.",
			"当前筛选条件下未找到导入记录。",
		),
		thWhen: text("Quando", "When", "Cuándo", "时间"),
		thFile: text("Arquivo", "File", "Archivo", "文件"),
		thType: text("Tipo", "Type", "Tipo", "类型"),
		thStatus: text("Status", "Status", "Estado", "状态"),
		thSummary: text("Resumo", "Summary", "Resumen", "摘要"),
		loadMore: text("Carregar mais", "Load more", "Cargar más", "加载更多"),
		loading: text("Carregando...", "Loading...", "Cargando...", "加载中..."),
		statusPending: text("pendente", "pending", "pendiente", "待处理"),
		statusSuccess: text("sucesso", "success", "éxito", "成功"),
		statusPartial: text("parcial", "partial", "parcial", "部分成功"),
		statusFailed: text("falha", "failed", "fallido", "失败"),
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
