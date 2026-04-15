"use client";

import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

type BackupMeta = {
	id: string;
	createdAt: string;
	label: string;
	sizeBytes: number;
	checksum: string;
};

type BackupManagerProps = { locale: AppLocale };

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Download a backup by fetching its payload from the server */
async function downloadBackup(id: string, label: string) {
	const res = await fetch(`/api/export/backup/schedule?id=${id}&download=1`);
	if (!res.ok) return;
	const data = (await res.json()) as { payload?: string };
	if (!data.payload) return;
	const blob = new Blob([data.payload], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${label}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

export function BackupManager({ locale }: BackupManagerProps) {
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });
	const isPt = locale === "pt_BR" || locale === "pt_PT";

	const [entries, setEntries] = useState<BackupMeta[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		msg: string;
	} | null>(null);
	const feedbackRef = useRef(feedback);
	feedbackRef.current = feedback;

	const loadErrMsg = text(
		"Falha ao carregar backups salvos.",
		"Failed to load saved backups.",
	);
	const loadErrMsgRef = useRef(loadErrMsg);
	loadErrMsgRef.current = loadErrMsg;

	const load = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/export/backup/schedule");
			if (!res.ok) throw new Error();
			const data = (await res.json()) as { entries: BackupMeta[] };
			setEntries(data.entries);
		} catch {
			setFeedback({
				type: "error",
				msg: loadErrMsgRef.current,
			});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function handleSaveNow() {
		setIsSaving(true);
		setFeedback(null);
		try {
			// Step 1: generate encrypted backup payload
			const backupRes = await fetch("/api/export/backup");
			if (!backupRes.ok)
				throw new Error(
					text("Falha ao gerar backup.", "Failed to generate backup."),
				);
			const payloadText = await backupRes.text();
			const label = `backup-${new Date().toISOString().slice(0, 10)}`;

			// Step 2: save into schedule store
			const saveRes = await fetch("/api/export/backup/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ payload: payloadText, label }),
			});
			if (!saveRes.ok)
				throw new Error(
					text("Falha ao salvar backup.", "Failed to save backup."),
				);
			void load();
			setFeedback({
				type: "success",
				msg: text("Backup salvo com sucesso.", "Backup saved successfully."),
			});
		} catch (err) {
			setFeedback({
				type: "error",
				msg:
					err instanceof Error
						? err.message
						: text("Erro desconhecido.", "Unknown error."),
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete(id: string) {
		setDeletingId(id);
		try {
			await fetch(`/api/export/backup/schedule?id=${id}`, { method: "DELETE" });
			setEntries((prev) => prev.filter((e) => e.id !== id));
		} finally {
			setDeletingId(null);
		}
	}

	const totalSize = entries.reduce((acc, e) => acc + e.sizeBytes, 0);

	return (
		<section className="space-y-4">
			{/* Header row */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="inline-flex items-center gap-2 text-lg font-semibold">
						<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
								className="h-4 w-4"
								aria-hidden="true"
							>
								<title>Backup icon</title>
								<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
						</span>
						{text("Backups Salvos", "Saved Backups")}
					</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">
						{text(
							"Snapshots criptografados gerados manualmente. Máximo de 30 entradas.",
							"Manually generated encrypted snapshots. Maximum 30 entries.",
						)}
					</p>
				</div>

				<div className="flex items-center gap-2">
					{entries.length > 0 && (
						<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
							{formatBytes(totalSize)} {text("total", "total")}
						</span>
					)}
					<button
						type="button"
						onClick={handleSaveNow}
						disabled={isSaving}
						className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-token-sm transition hover:opacity-90 disabled:opacity-60"
					>
						{isSaving ? (
							<>
								<svg
									className="h-4 w-4 animate-spin"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									aria-hidden="true"
								>
									<title>Loading</title>
									<circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
									<path d="M12 2a10 10 0 0 1 10 10" />
								</svg>
								{text("Salvando...", "Saving...")}
							</>
						) : (
							<>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									strokeLinecap="round"
									strokeLinejoin="round"
									className="h-4 w-4"
									aria-hidden="true"
								>
									<title>Save icon</title>
									<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
									<polyline points="17 21 17 13 7 13 7 21" />
									<polyline points="7 3 7 8 15 8" />
								</svg>
								{text("Salvar Backup Agora", "Save Backup Now")}
							</>
						)}
					</button>
				</div>
			</div>

			{/* Feedback */}
			{feedback && (
				<div
					className={`rounded-lg border px-4 py-2.5 text-sm ${
						feedback.type === "success"
							? "border-success/30 bg-success/10 text-success"
							: "border-danger/30 bg-danger/10 text-danger"
					}`}
				>
					{feedback.msg}
				</div>
			)}

			{/* List */}
			{isLoading ? (
				<div className="space-y-2">
					{[1, 2, 3].map((n) => (
						<div
							key={n}
							className="h-14 animate-shimmer rounded-xl border border-border"
						/>
					))}
				</div>
			) : entries.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border p-8 text-center">
					<p className="text-sm text-muted-foreground">
						{text(
							"Nenhum backup salvo. Clique em “Salvar Backup Agora” para criar o primeiro.",
							"No saved backups. Click “Save Backup Now” to create the first one.",
						)}
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-border">
					<table className="min-w-full text-sm">
						<thead className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground">
							<tr>
								<th className="px-4 py-2.5 font-medium">
									{text("Rótulo", "Label")}
								</th>
								<th className="px-4 py-2.5 font-medium">
									{text("Criado em", "Created")}
								</th>
								<th className="px-4 py-2.5 font-medium">
									{text("Tamanho", "Size")}
								</th>
								<th className="px-4 py-2.5 font-medium">
									{text("Checksum", "Checksum")}
								</th>
								<th className="px-4 py-2.5 font-medium" />
							</tr>
						</thead>
						<tbody>
							{entries.map((entry, i) => (
								<tr
									key={entry.id}
									className={`border-b border-border/60 transition-colors hover:bg-muted/20 ${i === 0 ? "bg-success/5" : ""}`}
								>
									<td className="px-4 py-3">
										<div className="flex items-center gap-2">
											{i === 0 && (
												<span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
													{isPt ? "RECENTE" : "LATEST"}
												</span>
											)}
											<span className="font-medium">{entry.label}</span>
										</div>
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{new Date(entry.createdAt).toLocaleString()}
									</td>
									<td className="px-4 py-3 tabular-nums text-muted-foreground">
										{formatBytes(entry.sizeBytes)}
									</td>
									<td className="px-4 py-3">
										{entry.checksum ? (
											<code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
												{entry.checksum.slice(0, 12)}…
											</code>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1.5">
											{/* Download */}
											<button
												type="button"
												onClick={() =>
													void downloadBackup(entry.id, entry.label)
												}
												aria-label={`${isPt ? "Baixar" : "Download"} ${entry.label}`}
												className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
											>
												<svg
													viewBox="0 0 20 20"
													fill="currentColor"
													className="h-3.5 w-3.5"
													aria-hidden="true"
												>
													<path
														fillRule="evenodd"
														d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
														clipRule="evenodd"
													/>
												</svg>
											</button>
											{/* Delete */}
											<button
												type="button"
												onClick={() => void handleDelete(entry.id)}
												disabled={deletingId === entry.id}
												aria-label={`${isPt ? "Excluir" : "Delete"} ${entry.label}`}
												className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-danger/30 hover:text-danger disabled:opacity-50"
											>
												<svg
													viewBox="0 0 20 20"
													fill="currentColor"
													className="h-3.5 w-3.5"
													aria-hidden="true"
												>
													<path
														fillRule="evenodd"
														d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
														clipRule="evenodd"
													/>
												</svg>
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<p className="text-xs text-muted-foreground">
				{text(
					"Os backups são armazenados localmente (AppSetting). Para backup externo, use “Exportar Backup Criptografado” e salve o arquivo manualmente.",
					"Backups are stored locally (AppSetting). For external backup, use “Export Encrypted Backup” and save the file manually.",
				)}
			</p>
		</section>
	);
}
