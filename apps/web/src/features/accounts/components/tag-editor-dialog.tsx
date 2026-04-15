"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 20;

type TagEditorDialogProps = {
	accountId: string;
	accountName: string;
	initialTags: string[];
	locale?: AppLocale;
	onSaved?: (tags: string[]) => void;
};

export function TagEditorDialog({
	accountId,
	accountName,
	initialTags,
	locale = "pt_BR",
	onSaved,
}: TagEditorDialogProps) {
	const text = (pt: string, en: string, es?: string, zhCN?: string) =>
		pickLocaleText(locale, { pt, en, es, zhCN });

	const ui = {
		buttonLabel: text("Tags", "Tags", "Etiquetas", "标签"),
		title: text(
			"Tags da conta",
			"Account tags",
			"Etiquetas de cuenta",
			"账号标签",
		),
		subtitle: text(
			`Até ${MAX_TAGS} tags. Cada tag pode ter no máximo ${MAX_TAG_LENGTH} caracteres.`,
			`Up to ${MAX_TAGS} tags. Each tag can have at most ${MAX_TAG_LENGTH} characters.`,
			`Hasta ${MAX_TAGS} etiquetas. Cada etiqueta puede tener hasta ${MAX_TAG_LENGTH} caracteres.`,
			`最多 ${MAX_TAGS} 个标签，每个标签最多 ${MAX_TAG_LENGTH} 个字符。`,
		),
		noTags: text("Sem tags", "No tags", "Sin etiquetas", "无标签"),
		inputPlaceholder: (remaining: number) =>
			text(
				`Digite uma tag (restam ${remaining})`,
				`Type a tag (${remaining} remaining)`,
				`Escribe una etiqueta (quedan ${remaining})`,
				`输入标签（还剩 ${remaining}）`,
			),
		add: text("+ Adicionar", "+ Add", "+ Agregar", "+ 添加"),
		save: text("Salvar tags", "Save tags", "Guardar etiquetas", "保存标签"),
		saving: text("Salvando...", "Saving...", "Guardando...", "保存中..."),
		cancel: text("Cancelar", "Cancel", "Cancelar", "取消"),
		saved: text(
			"Tags salvas.",
			"Tags saved.",
			"Etiquetas guardadas.",
			"标签已保存。",
		),
		close: text("Fechar", "Close", "Cerrar", "关闭"),
		errorDuplicate: text(
			"Essa tag já existe.",
			"That tag already exists.",
			"Esa etiqueta ya existe.",
			"该标签已存在。",
		),
		errorTooLong: text(
			`Máximo ${MAX_TAG_LENGTH} caracteres.`,
			`Maximum ${MAX_TAG_LENGTH} characters.`,
			`Máximo ${MAX_TAG_LENGTH} caracteres.`,
			`最多 ${MAX_TAG_LENGTH} 个字符。`,
		),
		errorMaxTags: text(
			`Máximo ${MAX_TAGS} tags.`,
			`Maximum ${MAX_TAGS} tags.`,
			`Máximo ${MAX_TAGS} etiquetas.`,
			`最多 ${MAX_TAGS} 个标签。`,
		),
		errorSave: text(
			"Falha ao salvar tags.",
			"Failed to save tags.",
			"Error al guardar etiquetas.",
			"保存标签失败。",
		),
	};

	const [isOpen, setIsOpen] = useState(false);
	const [tags, setTags] = useState<string[]>(initialTags);
	const [inputValue, setInputValue] = useState("");
	const [inputError, setInputError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<{
		tone: "success" | "error";
		message: string;
	} | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isOpen) {
			setTags(initialTags);
		}
	}, [initialTags, isOpen]);

	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	function close() {
		setIsOpen(false);
		setInputValue("");
		setInputError(null);
		setFeedback(null);
		setTags(initialTags);
	}

	function addTag() {
		const trimmed = inputValue.trim().toLowerCase();
		if (!trimmed) return;

		if (trimmed.length > MAX_TAG_LENGTH) {
			setInputError(ui.errorTooLong);
			return;
		}
		if (tags.length >= MAX_TAGS) {
			setInputError(ui.errorMaxTags);
			return;
		}
		if (tags.includes(trimmed)) {
			setInputError(ui.errorDuplicate);
			return;
		}

		setTags((prev) => [...prev, trimmed]);
		setInputValue("");
		setInputError(null);
	}

	function removeTag(tag: string) {
		setTags((prev) => prev.filter((t) => t !== tag));
	}

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			event.preventDefault();
			addTag();
		}
	}

	function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) close();
	}

	function handleBackdropKey(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Enter" || event.key === " ") close();
	}

	async function save() {
		setIsSaving(true);
		setFeedback(null);

		try {
			const response = await fetch(`/api/accounts/${accountId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tags }),
			});

			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.errorSave);
			}

			setFeedback({ tone: "success", message: ui.saved });
			onSaved?.(tags);
			setTimeout(() => setIsOpen(false), 700);
		} catch (error) {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : ui.errorSave,
			});
		} finally {
			setIsSaving(false);
		}
	}

	const remaining = MAX_TAGS - tags.length;

	return (
		<>
			{/* Trigger button */}
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				aria-label={`${ui.buttonLabel} — ${accountName}`}
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
					<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.29-7.29a1 1 0 0 0 0-1.41L12 2Z" />
					<path d="M7 7h.01" />
				</svg>
			</button>

			{isOpen && (
				<dialog
					open
					className="fixed inset-0 z-[110] m-0 h-full w-full max-w-none border-0 bg-transparent p-0"
					aria-labelledby="tag-editor-title"
					onClose={close}
				>
					<div
						className="flex min-h-full items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
						onClick={handleBackdropClick}
						onKeyDown={handleBackdropKey}
					>
						<div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
							{/* Header */}
							<div className="mb-1 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-4 w-4 text-primary"
										role="img"
										aria-label={ui.title}
									>
										<title>{ui.title}</title>
										<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.29-7.29a1 1 0 0 0 0-1.41L12 2Z" />
										<path d="M7 7h.01" />
									</svg>
									<h2 id="tag-editor-title" className="text-base font-semibold">
										{ui.title}
									</h2>
								</div>
								<button
									type="button"
									onClick={close}
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

							{/* Current tags */}
							<div className="min-h-10 rounded-md border border-dashed border-border bg-muted/30 p-2">
								{tags.length === 0 ? (
									<span className="text-xs text-muted-foreground">
										{ui.noTags}
									</span>
								) : (
									<div className="flex flex-wrap gap-1.5">
										{tags.map((tag) => (
											<span
												key={tag}
												className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium"
											>
												{tag}
												<button
													type="button"
													onClick={() => removeTag(tag)}
													aria-label={`Remover tag ${tag}`}
													className="ml-0.5 rounded-sm text-muted-foreground transition hover:text-danger"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth={2.5}
														strokeLinecap="round"
														strokeLinejoin="round"
														className="h-3 w-3"
														role="img"
														aria-label={`Remover tag ${tag}`}
													>
														<title>Remover tag {tag}</title>
														<line x1="18" y1="6" x2="6" y2="18" />
														<line x1="6" y1="6" x2="18" y2="18" />
													</svg>
												</button>
											</span>
										))}
									</div>
								)}
							</div>

							{/* Add tag input */}
							<div className="mt-3 flex gap-2">
								<input
									ref={inputRef}
									type="text"
									value={inputValue}
									onChange={(e) => {
										setInputValue(e.target.value);
										setInputError(null);
									}}
									onKeyDown={handleInputKeyDown}
									placeholder={ui.inputPlaceholder(remaining)}
									maxLength={MAX_TAG_LENGTH + 5}
									disabled={tags.length >= MAX_TAGS}
									className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:opacity-50"
								/>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={addTag}
									disabled={tags.length >= MAX_TAGS || !inputValue.trim()}
								>
									{ui.add}
								</Button>
							</div>
							{inputError && (
								<p className="mt-1 text-xs text-danger">{inputError}</p>
							)}

							{/* Feedback */}
							{feedback && (
								<p
									role={feedback.tone === "error" ? "alert" : "status"}
									aria-live="polite"
									className={`mt-3 rounded-md border px-3 py-2 text-sm ${
										feedback.tone === "error"
											? "border-danger/30 bg-danger/10 text-danger"
											: "border-success/30 bg-success/10 text-success"
									}`}
								>
									{feedback.message}
								</p>
							)}

							{/* Footer */}
							<div className="mt-4 flex justify-end gap-2">
								<Button variant="outline" onClick={close} disabled={isSaving}>
									{ui.cancel}
								</Button>
								<Button onClick={() => void save()} disabled={isSaving}>
									{isSaving ? ui.saving : ui.save}
								</Button>
							</div>
						</div>
					</div>
				</dialog>
			)}
		</>
	);
}
