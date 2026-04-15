"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

type ActivityLog = {
	id: string;
	actorUserId: string | null;
	entityType: string;
	entityId: string | null;
	eventType: string;
	message: string;
	metadata: unknown;
	createdAt: string;
	actor: {
		id: string;
		username: string;
		email: string;
	} | null;
};

type AuditLogViewerProps = {
	initialEntityType?: string;
	initialEntityId?: string;
	title?: string;
	compact?: boolean;
	hideFilters?: boolean;
	locale?: AppLocale;
};

type FeedbackState = {
	type: "error";
	message: string;
};

function toInputDateTimeValue(value: Date) {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
	return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

async function parseApiErrorResponse(response: Response, fallback: string) {
	try {
		const payload = (await response.json()) as { message?: string };
		return payload.message ?? fallback;
	} catch {
		return fallback;
	}
}

export function AuditLogViewer({
	initialEntityType,
	initialEntityId,
	title,
	compact = false,
	hideFilters = false,
	locale = "pt_BR",
}: AuditLogViewerProps) {
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });
	const ui = {
		defaultTitle: text(
			"Logs de Atividade",
			"Activity Logs",
			"Registros de actividad",
			"活动日志",
		),
		refresh: text("Atualizar", "Refresh", "Actualizar", "刷新"),
		searchPlaceholder: text(
			"Buscar em mensagem/evento",
			"Search message/event",
			"Buscar por mensaje/evento",
			"按消息/事件搜索",
		),
		searchAria: text(
			"Buscar logs",
			"Search logs",
			"Buscar registros",
			"搜索日志",
		),
		eventTypePlaceholder: text(
			"Tipo de evento",
			"Event type",
			"Tipo de evento",
			"事件类型",
		),
		eventTypeAria: text(
			"Filtrar por tipo de evento",
			"Filter by event type",
			"Filtrar por tipo de evento",
			"按事件类型筛选",
		),
		entityTypePlaceholder: text(
			"Tipo de entidade",
			"Entity type",
			"Tipo de entidad",
			"实体类型",
		),
		entityTypeAria: text(
			"Filtrar por tipo de entidade",
			"Filter by entity type",
			"Filtrar por tipo de entidad",
			"按实体类型筛选",
		),
		pageSizeAria: text(
			"Tamanho da página de logs",
			"Logs page size",
			"Tamaño de página de registros",
			"日志分页大小",
		),
		last25: text("Últimos 25", "Last 25", "Últimos 25", "最近 25 条"),
		last50: text("Últimos 50", "Last 50", "Últimos 50", "最近 50 条"),
		last100: text("Últimos 100", "Last 100", "Últimos 100", "最近 100 条"),
		last200: text("Últimos 200", "Last 200", "Últimos 200", "最近 200 条"),
		fromDateAria: text(
			"Filtrar a partir de data",
			"Filter from date",
			"Filtrar desde fecha",
			"按起始日期筛选",
		),
		toDateAria: text(
			"Filtrar até data",
			"Filter to date",
			"Filtrar hasta fecha",
			"按结束日期筛选",
		),
		last24h: text("Últimas 24h", "Last 24h", "Últimas 24h", "最近 24 小时"),
		last7d: text("Últimos 7d", "Last 7d", "Últimos 7d", "最近 7 天"),
		last30d: text("Últimos 30d", "Last 30d", "Últimos 30d", "最近 30 天"),
		clearPeriod: text(
			"Limpar período",
			"Clear period",
			"Limpiar período",
			"清除时间范围",
		),
		filtersHint: text(
			"Dica: combine período + evento + entidade para investigações mais precisas.",
			"Tip: combine period + event + entity for more precise investigations.",
			"Consejo: combina período + evento + entidad para investigaciones más precisas.",
			"提示：组合时间范围 + 事件 + 实体可获得更精确的排查结果。",
		),
		failedLoadLogs: text(
			"Falha ao carregar logs.",
			"Failed to load logs.",
			"Error al cargar registros.",
			"加载日志失败。",
		),
		retryLoadLogs: text(
			"Tentar novamente",
			"Retry loading logs",
			"Reintentar carga",
			"重试加载日志",
		),
		loadingLogs: text(
			"Carregando logs",
			"Loading logs",
			"Cargando registros",
			"正在加载日志",
		),
		noLogsFound: text(
			"Nenhum log encontrado para os filtros atuais.",
			"No logs found for the current filters.",
			"No se encontraron registros para los filtros actuales.",
			"当前筛选条件下没有找到日志。",
		),
		clearFilters: text(
			"Limpar filtros",
			"Clear filters",
			"Limpiar filtros",
			"清除筛选",
		),
		thWhen: text("Quando", "When", "Cuándo", "时间"),
		thEvent: text("Evento", "Event", "Evento", "事件"),
		thEntity: text("Entidade", "Entity", "Entidad", "实体"),
		thActor: text("Ator", "Actor", "Actor", "操作者"),
		thMessage: text("Mensagem", "Message", "Mensaje", "消息"),
		system: text("sistema", "system", "sistema", "系统"),
		metadata: text("metadados", "metadata", "metadatos", "元数据"),
		loadMoreLogs: text(
			"Carregar mais logs",
			"Load more logs",
			"Cargar más registros",
			"加载更多日志",
		),
	};

	const [logs, setLogs] = useState<ActivityLog[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [feedback, setFeedback] = useState<FeedbackState | null>(null);
	const [search, setSearch] = useState("");
	const [eventType, setEventType] = useState("");
	const [entityType, setEntityType] = useState(initialEntityType ?? "");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [limit, setLimit] = useState(100);
	const [nextCursor, setNextCursor] = useState<string | null>(null);

	const applyPeriodPreset = useCallback(
		(preset: "24h" | "7d" | "30d" | "clear") => {
			if (preset === "clear") {
				setDateFrom("");
				setDateTo("");
				return;
			}

			const now = new Date();
			const from = new Date(now);

			if (preset === "24h") {
				from.setHours(from.getHours() - 24);
			} else if (preset === "7d") {
				from.setDate(from.getDate() - 7);
			} else {
				from.setDate(from.getDate() - 30);
			}

			setDateFrom(toInputDateTimeValue(from));
			setDateTo(toInputDateTimeValue(now));
		},
		[],
	);

	const buildQuery = useCallback(
		(cursor?: string | null) => {
			const query = new URLSearchParams();
			query.set("limit", String(limit));
			if (search) query.set("search", search);
			if (eventType) query.set("eventType", eventType);
			if (entityType) query.set("entityType", entityType);
			if (initialEntityId) query.set("entityId", initialEntityId);
			if (dateFrom) query.set("dateFrom", dateFrom);
			if (dateTo) query.set("dateTo", dateTo);
			if (cursor) query.set("cursor", cursor);
			return query.toString();
		},
		[dateFrom, dateTo, entityType, eventType, initialEntityId, limit, search],
	);

	const loadLogs = useCallback(
		async (cursor?: string | null) => {
			setIsLoading(true);
			setFeedback(null);

			try {
				const response = await fetch(`/api/logs?${buildQuery(cursor)}`);
				if (!response.ok) {
					throw new Error(
						await parseApiErrorResponse(response, ui.failedLoadLogs),
					);
				}

				const payload = (await response.json()) as {
					logs: ActivityLog[];
					page?: { nextCursor: string | null };
				};
				setLogs((previous) =>
					cursor ? [...previous, ...payload.logs] : payload.logs,
				);
				setNextCursor(payload.page?.nextCursor ?? null);
			} catch (error) {
				setFeedback({
					type: "error",
					message: error instanceof Error ? error.message : ui.failedLoadLogs,
				});
			} finally {
				setIsLoading(false);
			}
		},
		[buildQuery, ui.failedLoadLogs],
	);

	useEffect(() => {
		setLogs([]);
		setNextCursor(null);
		void loadLogs(null);
	}, [loadLogs]);

	return (
		<section className={compact ? "space-y-3" : "space-y-4"}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-lg font-semibold">{title ?? ui.defaultTitle}</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void loadLogs(null)}
					disabled={isLoading}
				>
					{ui.refresh}
				</Button>
			</div>

			{hideFilters ? null : (
				<div className="grid gap-2 md:grid-cols-6">
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={ui.searchPlaceholder}
						aria-label={ui.searchAria}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					/>
					<input
						value={eventType}
						onChange={(event) => setEventType(event.target.value)}
						placeholder={ui.eventTypePlaceholder}
						aria-label={ui.eventTypeAria}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					/>
					<input
						value={entityType}
						onChange={(event) => setEntityType(event.target.value)}
						placeholder={ui.entityTypePlaceholder}
						aria-label={ui.entityTypeAria}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						disabled={Boolean(initialEntityType)}
					/>
					<select
						value={limit}
						onChange={(event) => setLimit(Number(event.target.value))}
						aria-label={ui.pageSizeAria}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						<option value={25}>{ui.last25}</option>
						<option value={50}>{ui.last50}</option>
						<option value={100}>{ui.last100}</option>
						<option value={200}>{ui.last200}</option>
					</select>
					<input
						type="datetime-local"
						value={dateFrom}
						onChange={(event) => setDateFrom(event.target.value)}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						aria-label={ui.fromDateAria}
					/>
					<input
						type="datetime-local"
						value={dateTo}
						onChange={(event) => setDateTo(event.target.value)}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						aria-label={ui.toDateAria}
					/>
					<div className="md:col-span-6 flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => applyPeriodPreset("24h")}
						>
							{ui.last24h}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => applyPeriodPreset("7d")}
						>
							{ui.last7d}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => applyPeriodPreset("30d")}
						>
							{ui.last30d}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => applyPeriodPreset("clear")}
						>
							{ui.clearPeriod}
						</Button>
					</div>
					<p className="md:col-span-6 text-xs text-muted-foreground">
						{ui.filtersHint}
					</p>
				</div>
			)}

			{feedback ? (
				<div
					role="alert"
					aria-live="polite"
					className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
				>
					<p>{feedback.message}</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-2"
						onClick={() => void loadLogs(null)}
					>
						{ui.retryLoadLogs}
					</Button>
				</div>
			) : null}

			{isLoading ? (
				<output
					aria-live="polite"
					aria-label={ui.loadingLogs}
					className="space-y-2"
				>
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
				</output>
			) : logs.length === 0 ? (
				<div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
					<p>{ui.noLogsFound}</p>
					{hideFilters ? null : (
						<Button
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => {
								setSearch("");
								setEventType("");
								setDateFrom("");
								setDateTo("");
								if (!initialEntityType) {
									setEntityType("");
								}
								setNextCursor(null);
							}}
						>
							{ui.clearFilters}
						</Button>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border">
					<table className="min-w-full text-sm">
						<thead className="bg-muted/70 text-left text-muted-foreground">
							<tr>
								<th className="px-3 py-2">{ui.thWhen}</th>
								<th className="px-3 py-2">{ui.thEvent}</th>
								<th className="px-3 py-2">{ui.thEntity}</th>
								<th className="px-3 py-2">{ui.thActor}</th>
								<th className="px-3 py-2">{ui.thMessage}</th>
							</tr>
						</thead>
						<tbody>
							{logs.map((log) => (
								<tr key={log.id} className="border-t border-border/80">
									<td className="px-3 py-2 text-xs text-muted-foreground">
										{formatDateTime(log.createdAt)}
									</td>
									<td className="px-3 py-2">{log.eventType}</td>
									<td className="px-3 py-2 text-xs text-muted-foreground">
										{log.entityType}
										{log.entityId ? `:${log.entityId.slice(0, 8)}` : ""}
									</td>
									<td className="px-3 py-2 text-xs text-muted-foreground">
										{log.actor?.username ?? ui.system}
									</td>
									<td className="px-3 py-2">
										<div className="space-y-1">
											<p>{log.message}</p>
											{log.metadata ? (
												<details>
													<summary className="cursor-pointer text-xs text-muted-foreground">
														{ui.metadata}
													</summary>
													<pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
														{JSON.stringify(log.metadata, null, 2)}
													</pre>
												</details>
											) : null}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{!isLoading && logs.length > 0 && nextCursor ? (
				<div className="flex justify-end">
					<Button
						variant="outline"
						size="sm"
						onClick={() => void loadLogs(nextCursor)}
					>
						{ui.loadMoreLogs}
					</Button>
				</div>
			) : null}
		</section>
	);
}
