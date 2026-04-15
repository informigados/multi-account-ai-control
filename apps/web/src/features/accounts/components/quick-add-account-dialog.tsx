"use client";

import type { ProviderSummary } from "@/features/accounts/account-types";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { FileJson2, Plus, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type QuickAddTab = "manual" | "json";

type QuickAddAccountDialogProps = {
	locale: AppLocale;
	providers: ProviderSummary[];
	onSuccess: () => void;
};

type ManualForm = {
	providerId: string;
	displayName: string;
	identifier: string;
	planName: string;
	accountType: string;
};

const emptyManual: ManualForm = {
	providerId: "",
	displayName: "",
	identifier: "",
	planName: "",
	accountType: "",
};

export function QuickAddAccountDialog({
	locale,
	providers,
	onSuccess,
}: QuickAddAccountDialogProps) {
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	const ui = {
		trigger: text("Adicionar Conta", "Add Account"),
		title: text("Adicionar Conta", "Add Account"),
		tabManual: text("Cadastro Manual", "Manual"),
		tabJson: text("Importar JSON", "Import JSON"),
		fieldProvider: text("Provedor", "Provider"),
		fieldName: text("Nome de exibição", "Display name"),
		fieldIdentifier: text(
			"Identificador (e-mail / login)",
			"Identifier (email / login)",
		),
		fieldPlan: text("Plano (opcional)", "Plan (optional)"),
		fieldType: text("Tipo de conta (opcional)", "Account type (optional)"),
		btnCreate: text("Criar Conta", "Create Account"),
		btnImport: text("Importar", "Import"),
		creating: text("Criando...", "Creating..."),
		importing: text("Importando...", "Importing..."),
		success: text("Conta criada com sucesso!", "Account created!"),
		importSuccess: text("Importado com sucesso!", "Imported successfully!"),
		jsonLabel: text(
			"Cole JSON de conta(s) abaixo",
			"Paste account(s) JSON below",
		),
		jsonPlaceholder: text(
			'{"identifier":"email@exemplo.com","displayName":"Minha Conta","providerId":"..."}',
			'{"identifier":"email@example.com","displayName":"My Account","providerId":"..."}',
		),
		jsonExample: text("Ver exemplos de formato", "See format examples"),
		jsonEx1: text("Conta única:", "Single account:"),
		jsonEx2: text("Múltiplas contas (array):", "Multiple accounts (array):"),
		noProviders: text(
			"Nenhum provedor ativo. Cadastre um provedor primeiro.",
			"No active providers. Register a provider first.",
		),
		close: text("Fechar", "Close"),
	};

	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<QuickAddTab>("manual");
	const [form, setForm] = useState<ManualForm>(emptyManual);
	const [jsonText, setJsonText] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<{
		tone: "success" | "error";
		message: string;
	} | null>(null);
	const [showExamples, setShowExamples] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (open) {
			dialogRef.current?.showModal();
			setForm({ ...emptyManual, providerId: providers[0]?.id ?? "" });
			setJsonText("");
			setFeedback(null);
			setTab("manual");
		} else {
			dialogRef.current?.close();
		}
	}, [open, providers]);

	// Close on backdrop click
	function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
		if (e.target === dialogRef.current) setOpen(false);
	}

	async function handleManualSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsSaving(true);
		setFeedback(null);
		try {
			const response = await fetch("/api/accounts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					providerId: form.providerId,
					displayName: form.displayName,
					identifier: form.identifier,
					planName: form.planName || undefined,
					accountType: form.accountType || undefined,
					status: "active",
					priority: 5,
					tags: [],
				}),
			});
			if (!response.ok) {
				const err = (await response.json()) as { message?: string };
				throw new Error(err.message ?? "Falha ao criar conta.");
			}
			setFeedback({ tone: "success", message: ui.success });
			setTimeout(() => {
				setOpen(false);
				onSuccess();
			}, 900);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : "Erro desconhecido.",
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function handleJsonImport(e: React.FormEvent) {
		e.preventDefault();
		setIsSaving(true);
		setFeedback(null);
		try {
			// Parse JSON — accept single object or array
			let parsed: unknown;
			try {
				parsed = JSON.parse(jsonText.trim());
			} catch {
				throw new Error("JSON inválido. Verifique a formatação.");
			}
			const items = Array.isArray(parsed) ? parsed : [parsed];
			// Submit each account sequentially
			for (const item of items) {
				const body = item as Record<string, unknown>;
				const response = await fetch("/api/accounts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						providerId: body.providerId ?? providers[0]?.id ?? "",
						displayName: body.displayName ?? body.identifier ?? "Importado",
						identifier: body.identifier ?? body.email ?? "",
						planName: body.planName ?? undefined,
						accountType: body.accountType ?? undefined,
						status: "active",
						priority: 5,
						tags: Array.isArray(body.tags) ? body.tags : [],
					}),
				});
				if (!response.ok) {
					const err = (await response.json()) as { message?: string };
					throw new Error(err.message ?? "Falha ao importar.");
				}
			}
			setFeedback({
				tone: "success",
				message: `${ui.importSuccess} (${items.length})`,
			});
			setTimeout(() => {
				setOpen(false);
				onSuccess();
			}, 900);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : "Erro desconhecido.",
			});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			{/* Trigger button */}
			<button
				type="button"
				id="quick-add-account-btn"
				onClick={() => setOpen(true)}
				className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary transition-all hover:bg-primary/20"
				aria-label={ui.trigger}
			>
				<Plus className="h-4 w-4" />
				{ui.trigger}
			</button>

			{/* Modal */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: dialog handles keyboard natively */}
			<dialog
				ref={dialogRef}
				onClick={onDialogClick}
				className="m-auto w-full max-w-lg rounded-2xl border border-border bg-card p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-[dialog-in_0.2s_ease-out]"
				aria-modal="true"
				aria-label={ui.title}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border px-6 py-4">
					<h2 className="text-lg font-semibold">{ui.title}</h2>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="rounded-md p-1 text-muted-foreground transition hover:text-foreground"
						aria-label={ui.close}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-border">
					<button
						type="button"
						onClick={() => setTab("manual")}
						className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
							tab === "manual"
								? "border-b-2 border-primary text-primary"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<UserPlus className="h-3.5 w-3.5" />
						{ui.tabManual}
					</button>
					<button
						type="button"
						onClick={() => setTab("json")}
						className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
							tab === "json"
								? "border-b-2 border-primary text-primary"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<FileJson2 className="h-3.5 w-3.5" />
						{ui.tabJson}
					</button>
				</div>

				{/* Body */}
				<div className="px-6 py-5">
					{providers.length === 0 ? (
						<p className="text-sm text-muted-foreground">{ui.noProviders}</p>
					) : tab === "manual" ? (
						<form className="space-y-3" onSubmit={handleManualSubmit}>
							<div className="space-y-1">
								<label
									htmlFor="qa-provider"
									className="text-xs text-muted-foreground"
								>
									{ui.fieldProvider}
								</label>
								<select
									id="qa-provider"
									value={form.providerId}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, providerId: e.target.value }))
									}
									className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
									required
								>
									{providers.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>

							<div className="space-y-1">
								<label
									htmlFor="qa-name"
									className="text-xs text-muted-foreground"
								>
									{ui.fieldName}
								</label>
								<input
									id="qa-name"
									value={form.displayName}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											displayName: e.target.value,
										}))
									}
									className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
									required
								/>
							</div>

							<div className="space-y-1">
								<label
									htmlFor="qa-identifier"
									className="text-xs text-muted-foreground"
								>
									{ui.fieldIdentifier}
								</label>
								<input
									id="qa-identifier"
									value={form.identifier}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, identifier: e.target.value }))
									}
									className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
									required
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label
										htmlFor="qa-plan"
										className="text-xs text-muted-foreground"
									>
										{ui.fieldPlan}
									</label>
									<input
										id="qa-plan"
										value={form.planName}
										onChange={(e) =>
											setForm((prev) => ({ ...prev, planName: e.target.value }))
										}
										className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
									/>
								</div>
								<div className="space-y-1">
									<label
										htmlFor="qa-type"
										className="text-xs text-muted-foreground"
									>
										{ui.fieldType}
									</label>
									<input
										id="qa-type"
										value={form.accountType}
										onChange={(e) =>
											setForm((prev) => ({
												...prev,
												accountType: e.target.value,
											}))
										}
										className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
									/>
								</div>
							</div>

							{feedback ? (
								<p
									className={`rounded-md border px-3 py-2 text-xs ${
										feedback.tone === "success"
											? "border-success/30 bg-success/10 text-success"
											: "border-danger/30 bg-danger/10 text-danger"
									}`}
								>
									{feedback.message}
								</p>
							) : null}

							<button
								type="submit"
								disabled={isSaving}
								className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
							>
								{isSaving ? ui.creating : ui.btnCreate}
							</button>
						</form>
					) : (
						<form className="space-y-3" onSubmit={handleJsonImport}>
							<div>
								<label
									htmlFor="qa-json"
									className="block text-xs text-muted-foreground"
								>
									{ui.jsonLabel}
								</label>

								{/* Examples toggle */}
								<button
									type="button"
									onClick={() => setShowExamples((v) => !v)}
									className="mt-1 text-xs text-primary hover:underline"
								>
									{showExamples ? "▾" : "▸"} {ui.jsonExample}
								</button>

								{showExamples ? (
									<div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
										<p className="font-medium">{ui.jsonEx1}</p>
										<pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
											{`{"identifier":"email@exemplo.com","displayName":"Minha Conta","providerId":"<id>"}`}
										</pre>
										<p className="mt-2 font-medium">{ui.jsonEx2}</p>
										<pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
											{`[\n  {"identifier":"conta1@ex.com","displayName":"Conta 1","providerId":"<id>"},\n  {"identifier":"conta2@ex.com","displayName":"Conta 2","providerId":"<id>"}\n]`}
										</pre>
									</div>
								) : null}
							</div>

							<textarea
								id="qa-json"
								value={jsonText}
								onChange={(e) => setJsonText(e.target.value)}
								placeholder={ui.jsonPlaceholder}
								rows={6}
								className="min-h-[120px] w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none ring-primary transition focus:ring-2"
								required
							/>

							{feedback ? (
								<p
									className={`rounded-md border px-3 py-2 text-xs ${
										feedback.tone === "success"
											? "border-success/30 bg-success/10 text-success"
											: "border-danger/30 bg-danger/10 text-danger"
									}`}
								>
									{feedback.message}
								</p>
							) : null}

							<button
								type="submit"
								disabled={isSaving}
								className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
							>
								{isSaving ? ui.importing : ui.btnImport}
							</button>
						</form>
					)}
				</div>
			</dialog>
		</>
	);
}
