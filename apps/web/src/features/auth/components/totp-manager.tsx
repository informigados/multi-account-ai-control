"use client";

import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────── */
type TotpEntryMasked = {
	id: string;
	label: string;
	issuer: string;
	createdAt: string;
	isFavorite: boolean;
	hasSecret: boolean;
};

type CodeState = {
	code: string;
	remainingSeconds: number;
	period: number;
};

type TotpManagerProps = { locale: AppLocale };

/* ─── Progress ring SVG ──────────────────────────────────────────────── */
function ProgressRing({
	value,
	max,
	size = 40,
	stroke = 3,
	tone = "success",
}: {
	value: number;
	max: number;
	size?: number;
	stroke?: number;
	tone?: "success" | "warning" | "danger";
}) {
	const r = (size - stroke * 2) / 2;
	const circ = 2 * Math.PI * r;
	const dash = circ * (value / max);
	const toneColor = {
		success: "hsl(var(--success))",
		warning: "hsl(var(--warning))",
		danger: "hsl(var(--danger))",
	}[tone];

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			aria-hidden="true"
			className="rotate-[-90deg]"
		>
			<title>Timer</title>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke="hsl(var(--muted))"
				strokeWidth={stroke}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={toneColor}
				strokeWidth={stroke}
				strokeDasharray={`${dash} ${circ}`}
				strokeLinecap="round"
				style={{ transition: "stroke-dasharray 1s linear" }}
			/>
		</svg>
	);
}

/* ─── Individual TOTP card ───────────────────────────────────────────── */
function TotpCard({
	entry,
	locale,
	onDelete,
	onToggleFavorite,
}: {
	entry: TotpEntryMasked;
	locale: AppLocale;
	onDelete: (id: string) => void;
	onToggleFavorite: (id: string, current: boolean) => void;
}) {
	const isPt = locale === "pt_BR" || locale === "pt_PT";
	const [codeState, setCodeState] = useState<CodeState | null>(null);
	const [isLoadingCode, setIsLoadingCode] = useState(false);
	const [copied, setCopied] = useState(false);
	const [showCode, setShowCode] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchCode = useCallback(async () => {
		setIsLoadingCode(true);
		try {
			const res = await fetch(`/api/totp/${entry.id}/code`);
			if (!res.ok) return;
			const data = (await res.json()) as CodeState;
			setCodeState(data);
		} finally {
			setIsLoadingCode(false);
		}
	}, [entry.id]);

	useEffect(() => {
		if (!showCode) {
			if (intervalRef.current) clearInterval(intervalRef.current);
			return;
		}
		void fetchCode();

		// Tick every second: update remainingSeconds + refetch when window turns
		intervalRef.current = setInterval(() => {
			setCodeState((prev) => {
				if (!prev) return prev;
				const next = prev.remainingSeconds - 1;
				if (next <= 0) {
					void fetchCode();
					return prev;
				}
				return { ...prev, remainingSeconds: next };
			});
		}, 1000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [showCode, fetchCode]);

	async function handleCopy() {
		if (!codeState) return;
		await navigator.clipboard.writeText(codeState.code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	const ringTone =
		codeState && codeState.remainingSeconds <= 5
			? "danger"
			: codeState && codeState.remainingSeconds <= 10
				? "warning"
				: "success";

	// Format code with space in middle for readability: 123 456
	const formattedCode = codeState
		? `${codeState.code.slice(0, 3)} ${codeState.code.slice(3)}`
		: "--- ---";

	return (
		<article className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card/80 p-4 shadow-token-sm backdrop-blur transition-[box-shadow] hover:border-primary/30">
			{/* Accent bar */}
			<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 to-info/60" />

			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						{/* Favorite star */}
						<button
							type="button"
							onClick={() => onToggleFavorite(entry.id, entry.isFavorite)}
							aria-label={
								entry.isFavorite
									? isPt
										? "Remover dos favoritos"
										: "Remove from favorites"
									: isPt
										? "Marcar como favorito"
										: "Mark as favorite"
							}
							className="shrink-0 text-warning transition-transform hover:scale-110"
						>
							<svg
								viewBox="0 0 20 20"
								className={`h-4 w-4 ${entry.isFavorite ? "fill-warning" : "fill-none stroke-current stroke-[1.5]"}`}
								aria-hidden="true"
							>
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
						</button>
						<h3 className="truncate text-sm font-semibold">{entry.label}</h3>
					</div>
					{entry.issuer && (
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{entry.issuer}
						</p>
					)}
				</div>

				{/* Delete */}
				<button
					type="button"
					onClick={() => onDelete(entry.id)}
					aria-label={isPt ? `Excluir ${entry.label}` : `Delete ${entry.label}`}
					className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
				>
					<svg
						viewBox="0 0 20 20"
						fill="currentColor"
						className="h-4 w-4"
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

			{/* Code section */}
			<div className="mt-3">
				{showCode ? (
					<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
						{/* Ring + code */}
						<div className="flex items-center gap-2">
							{codeState && (
								<ProgressRing
									value={codeState.remainingSeconds}
									max={codeState.period}
									tone={ringTone}
								/>
							)}
							<span
								className={`font-mono text-2xl font-bold tabular-nums tracking-widest ${
									ringTone === "danger"
										? "text-danger"
										: ringTone === "warning"
											? "text-warning"
											: "text-foreground"
								}`}
							>
								{isLoadingCode ? "--- ---" : formattedCode}
							</span>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-1.5">
							{/* Copy */}
							<button
								type="button"
								onClick={handleCopy}
								disabled={!codeState}
								aria-label={isPt ? "Copiar código" : "Copy code"}
								className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary disabled:opacity-40"
							>
								{copied ? (
									<svg
										viewBox="0 0 20 20"
										fill="currentColor"
										className="h-3.5 w-3.5 text-success"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								) : (
									<svg
										viewBox="0 0 20 20"
										fill="currentColor"
										className="h-3.5 w-3.5"
										aria-hidden="true"
									>
										<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
										<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
									</svg>
								)}
							</button>
							{/* Hide */}
							<button
								type="button"
								onClick={() => setShowCode(false)}
								aria-label={isPt ? "Ocultar código" : "Hide code"}
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
										d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
										clipRule="evenodd"
									/>
									<path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
								</svg>
							</button>
						</div>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setShowCode(true)}
						className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
					>
						{isPt ? "Gerar código OTP" : "Generate OTP code"}
					</button>
				)}
			</div>

			<p className="mt-2 text-right text-[10px] text-muted-foreground">
				{isPt ? "Criado em" : "Created"}{" "}
				{new Date(entry.createdAt).toLocaleDateString()}
			</p>
		</article>
	);
}

/* ─── Add form ───────────────────────────────────────────────────────── */
function AddTotpForm({
	locale,
	onCreated,
}: {
	locale: AppLocale;
	onCreated: (entry: TotpEntryMasked) => void;
}) {
	const isPt = locale === "pt_BR" || locale === "pt_PT";
	const [label, setLabel] = useState("");
	const [issuer, setIssuer] = useState("");
	const [secret, setSecret] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/totp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label, issuer, secret }),
			});
			if (!res.ok) {
				const payload = (await res.json()) as { message?: string };
				throw new Error(
					payload.message ?? (isPt ? "Erro ao criar." : "Error creating."),
				);
			}
			const payload = (await res.json()) as { entry: TotpEntryMasked };
			onCreated(payload.entry);
			setLabel("");
			setIssuer("");
			setSecret("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-xl border border-border bg-card/80 p-5 shadow-token-sm backdrop-blur"
		>
			<h3 className="mb-4 text-base font-semibold">
				{isPt ? "Adicionar entrada TOTP" : "Add TOTP entry"}
			</h3>
			<div className="space-y-3">
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1">
						<label
							htmlFor="totp-label"
							className="text-xs text-muted-foreground"
						>
							{isPt ? "Rótulo *" : "Label *"}
						</label>
						<input
							id="totp-label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder={
								isPt ? "ex: GitHub — trabalho" : "e.g. GitHub — work"
							}
							required
							disabled={isSaving}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:opacity-70"
						/>
					</div>
					<div className="space-y-1">
						<label
							htmlFor="totp-issuer"
							className="text-xs text-muted-foreground"
						>
							{isPt ? "Emissor (opcional)" : "Issuer (optional)"}
						</label>
						<input
							id="totp-issuer"
							value={issuer}
							onChange={(e) => setIssuer(e.target.value)}
							placeholder="GitHub, Google, Anthropic..."
							disabled={isSaving}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:opacity-70"
						/>
					</div>
				</div>
				<div className="space-y-1">
					<label
						htmlFor="totp-secret"
						className="text-xs text-muted-foreground"
					>
						{isPt
							? "Segredo Base32 * (do QR code / chave manual)"
							: "Base32 Secret * (from QR code / manual key)"}
					</label>
					<input
						id="totp-secret"
						value={secret}
						onChange={(e) => setSecret(e.target.value)}
						placeholder="JBSWY3DPEHPK3PXP"
						required
						disabled={isSaving}
						autoComplete="off"
						spellCheck={false}
						className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-sm outline-none ring-primary transition focus:ring-2 disabled:opacity-70"
					/>
					<p className="text-[10px] text-muted-foreground">
						{isPt
							? "Entre espaços e maiúsculas/minúsculas são normalizados automaticamente."
							: "Spaces and case are normalized automatically."}
					</p>
				</div>

				{error && (
					<p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={isSaving}
					className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
				>
					{isSaving
						? isPt
							? "Salvando..."
							: "Saving..."
						: isPt
							? "Adicionar"
							: "Add entry"}
				</button>
			</div>
		</form>
	);
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function TotpManager({ locale }: TotpManagerProps) {
	const isPt = locale === "pt_BR" || locale === "pt_PT";
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	// Stable ref so load useEffect needs no external deps
	const loadErrorMsgRef = useRef(
		isPt ? "Falha ao carregar entradas TOTP." : "Failed to load TOTP entries.",
	);

	const [entries, setEntries] = useState<TotpEntryMasked[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | "favorites">("all");
	const [search, setSearch] = useState("");
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importFeedback, setImportFeedback] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		async function load() {
			setIsLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/totp");
				if (!res.ok) throw new Error();
				const data = (await res.json()) as { entries: TotpEntryMasked[] };
				setEntries(data.entries);
			} catch {
				setError(loadErrorMsgRef.current);
			} finally {
				setIsLoading(false);
			}
		}
		void load();
	}, []);

	function handleCreated(entry: TotpEntryMasked) {
		setEntries((prev) => [entry, ...prev]);
	}

	async function handleDelete(id: string) {
		await fetch(`/api/totp/${id}`, { method: "DELETE" });
		setEntries((prev) => prev.filter((e) => e.id !== id));
	}

	async function handleToggleFavorite(id: string, current: boolean) {
		await fetch(`/api/totp/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isFavorite: !current }),
		});
		setEntries((prev) =>
			prev.map((e) => (e.id === id ? { ...e, isFavorite: !current } : e)),
		);
	}

	/** Export all entries (with secrets) as a downloadable JSON file */
	async function handleExport() {
		setIsExporting(true);
		try {
			const res = await fetch("/api/totp/export");
			if (!res.ok) throw new Error();
			const data = await res.json();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `totp-export-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			// silent — export errors are non-critical
		} finally {
			setIsExporting(false);
		}
	}

	/** Import entries from a JSON file (merge, no overwrite of existing IDs) */
	function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (ev) => {
			setIsImporting(true);
			setImportFeedback(null);
			try {
				const raw = JSON.parse(ev.target?.result as string) as unknown;
				// Accept both { entries: [...] } and raw array
				const arr = Array.isArray(raw)
					? raw
					: Array.isArray((raw as { entries?: unknown }).entries)
						? (raw as { entries: unknown[] }).entries
						: [];
				if (arr.length === 0)
					throw new Error(
						isPt
							? "Arquivo vazio ou formato inválido."
							: "Empty file or invalid format.",
					);
				const res = await fetch("/api/totp/export", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ entries: arr }),
				});
				if (!res.ok) throw new Error();
				const result = (await res.json()) as {
					importedCount: number;
					totalEntries: number;
				};
				// Reload entries list
				const listRes = await fetch("/api/totp");
				if (listRes.ok) {
					const listData = (await listRes.json()) as {
						entries: TotpEntryMasked[];
					};
					setEntries(listData.entries);
				}
				setImportFeedback(
					isPt
						? `${result.importedCount} entrada(s) importada(s) com sucesso.`
						: `${result.importedCount} entry/entries imported successfully.`,
				);
				setTimeout(() => setImportFeedback(null), 4000);
			} catch (err) {
				setImportFeedback(
					err instanceof Error
						? err.message
						: isPt
							? "Falha na importação."
							: "Import failed.",
				);
			} finally {
				setIsImporting(false);
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		};
		reader.readAsText(file);
	}

	const filtered = entries
		.filter((e) => filter === "all" || e.isFavorite)
		.filter(
			(e) =>
				search === "" ||
				e.label.toLowerCase().includes(search.toLowerCase()) ||
				e.issuer.toLowerCase().includes(search.toLowerCase()),
		)
		.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));

	return (
		<section className="space-y-5">
			{/* Header */}
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
								<title>TOTP icon</title>
								<rect x="5" y="11" width="14" height="10" rx="2" />
								<path d="M8 11V7a4 4 0 018 0v4" />
							</svg>
						</span>
						{text("2FA / TOTP Manager", "2FA / TOTP Manager")}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{text(
							"Gere e gerencie códigos de autenticação de dois fatores para qualquer serviço.",
							"Generate and manage two-factor authentication codes for any service.",
						)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
						{entries.length} {text("entradas", "entries")}
					</span>
					{/* Import JSON */}
					<input
						ref={fileInputRef}
						type="file"
						accept=".json,application/json"
						className="sr-only"
						aria-label={text("Importar JSON", "Import JSON")}
						onChange={handleImportFileChange}
					/>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={isImporting}
						title={text("Importar JSON", "Import JSON")}
						className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
					>
						<svg
							viewBox="0 0 20 20"
							fill="currentColor"
							className="h-3.5 w-3.5"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
								clipRule="evenodd"
							/>
						</svg>
						{isImporting ? "..." : text("Importar", "Import")}
					</button>
					{/* Export JSON */}
					<button
						type="button"
						onClick={() => void handleExport()}
						disabled={isExporting || entries.length === 0}
						title={text("Exportar JSON", "Export JSON")}
						className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
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
						{isExporting ? "..." : text("Exportar", "Export")}
					</button>
				</div>
			</div>
			{/* Import feedback */}
			{importFeedback && (
				<p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
					{importFeedback}
				</p>
			)}

			{/* Add form */}
			<AddTotpForm locale={locale} onCreated={handleCreated} />

			{/* Filter + search toolbar */}
			{entries.length > 0 && (
				<div className="flex flex-wrap gap-2">
					<div className="flex rounded-lg border border-border bg-card/60 p-0.5">
						{(["all", "favorites"] as const).map((f) => (
							<button
								key={f}
								type="button"
								onClick={() => setFilter(f)}
								className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
									filter === f
										? "bg-primary text-primary-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{f === "all"
									? text("Todas", "All")
									: text("Favoritas", "Favorites")}
							</button>
						))}
					</div>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={text("Buscar...", "Search...")}
						aria-label={text("Buscar entradas TOTP", "Search TOTP entries")}
						className="h-9 min-w-[160px] flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					/>
				</div>
			)}

			{/* Entries grid */}
			{isLoading ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((n) => (
						<div
							key={n}
							className="h-36 animate-shimmer rounded-xl border border-border"
						/>
					))}
				</div>
			) : error ? (
				<p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
					{error}
				</p>
			) : filtered.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{entries.length === 0
						? text(
								"Nenhuma entrada cadastrada. Adicione seu primeiro código TOTP acima.",
								"No entries registered. Add your first TOTP code above.",
							)
						: text(
								"Nenhuma entrada corresponde ao filtro.",
								"No entries match the filter.",
							)}
				</p>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((entry) => (
						<TotpCard
							key={entry.id}
							entry={entry}
							locale={locale}
							onDelete={handleDelete}
							onToggleFavorite={handleToggleFavorite}
						/>
					))}
				</div>
			)}
		</section>
	);
}
