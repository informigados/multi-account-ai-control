"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

type NoteType = "general" | "warning" | "operational" | "ownership";

type Note = {
	id: string;
	accountId: string;
	noteType: NoteType;
	content: string;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
	author: {
		id: string;
		username: string;
		email: string;
	} | null;
};

type AccountNotesManagerProps = {
	accountId: string;
	locale: AppLocale;
};

type NotesListResponse = {
	notes: Note[];
	page?: {
		limit: number;
		nextCursor: string | null;
	};
};

type FeedbackState = {
	type: "success" | "error";
	message: string;
};

async function parseApiErrorResponse(response: Response, fallback: string) {
	try {
		const payload = (await response.json()) as { message?: string };
		return payload.message ?? fallback;
	} catch {
		return fallback;
	}
}

export function AccountNotesManager({
	accountId,
	locale,
}: AccountNotesManagerProps) {
	const isPtBr = locale === "pt_BR";
	const ui = {
		notes: isPtBr ? "Notas" : "Notes",
		refresh: isPtBr ? "Atualizar" : "Refresh",
		failedLoad: isPtBr ? "Falha ao carregar notas." : "Failed to load notes.",
		failedSave: isPtBr ? "Falha ao salvar nota." : "Failed to save note.",
		failedDelete: isPtBr ? "Falha ao excluir nota." : "Failed to delete note.",
		noteUpdated: isPtBr ? "Nota atualizada." : "Note updated.",
		noteCreated: isPtBr ? "Nota criada." : "Note created.",
		noteDeleted: isPtBr ? "Nota excluída." : "Note deleted.",
		writePlaceholder: isPtBr
			? "Escreva uma nota operacional..."
			: "Write operational note...",
		saving: isPtBr ? "Salvando..." : "Saving...",
		updateNote: isPtBr ? "Atualizar Nota" : "Update Note",
		addNote: isPtBr ? "Adicionar Nota" : "Add Note",
		cancel: isPtBr ? "Cancelar" : "Cancel",
		loadingNotes: isPtBr ? "Carregando notas" : "Loading notes",
		noNotes: isPtBr
			? "Nenhuma nota registrada para esta conta."
			: "No notes registered for this account.",
		createFirstNote: isPtBr ? "Criar primeira nota" : "Create first note",
		system: isPtBr ? "sistema" : "system",
		edit: isPtBr ? "Editar" : "Edit",
		delete: isPtBr ? "Excluir" : "Delete",
		loadMore: isPtBr ? "Carregar mais notas" : "Load more notes",
		deleteTitle: isPtBr ? "Excluir nota" : "Delete note",
		deleteDescription: (type: string) =>
			isPtBr
				? `Excluir esta nota de tipo "${type}"? Esta ação não pode ser desfeita.`
				: `Delete this ${type} note? This action cannot be undone.`,
		deleteNoteAria: (id: string) =>
			isPtBr ? `Excluir nota ${id}` : `Delete note ${id}`,
		noteTypeGeneral: isPtBr ? "Geral" : "General",
		noteTypeWarning: isPtBr ? "Alerta" : "Warning",
		noteTypeOperational: isPtBr ? "Operacional" : "Operational",
		noteTypeOwnership: isPtBr ? "Propriedade do Cliente" : "Client Ownership",
	};
	const noteTypeOptions: Array<{ value: NoteType; label: string }> = [
		{ value: "general", label: ui.noteTypeGeneral },
		{ value: "warning", label: ui.noteTypeWarning },
		{ value: "operational", label: ui.noteTypeOperational },
		{ value: "ownership", label: ui.noteTypeOwnership },
	];

	function noteTypeLabel(type: NoteType) {
		if (type === "warning") return ui.noteTypeWarning;
		if (type === "operational") return ui.noteTypeOperational;
		if (type === "ownership") return ui.noteTypeOwnership;
		return ui.noteTypeGeneral;
	}
	const [notes, setNotes] = useState<Note[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<FeedbackState | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [noteType, setNoteType] = useState<NoteType>("general");
	const [content, setContent] = useState("");
	const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const contentInputRef = useRef<HTMLInputElement>(null);

	const loadNotes = useCallback(
		async (cursor?: string | null) => {
			setIsLoading(true);
			setFeedback(null);
			try {
				const query = new URLSearchParams();
				query.set("limit", "20");
				if (cursor) query.set("cursor", cursor);
				const response = await fetch(
					`/api/accounts/${accountId}/notes?${query}`,
				);
				if (!response.ok) {
					throw new Error(await parseApiErrorResponse(response, ui.failedLoad));
				}

				const payload = (await response.json()) as NotesListResponse;
				setNotes((previous) =>
					cursor ? [...previous, ...payload.notes] : payload.notes,
				);
				setNextCursor(payload.page?.nextCursor ?? null);
				setHasMore(Boolean(payload.page?.nextCursor));
			} catch (error) {
				setFeedback({
					type: "error",
					message: error instanceof Error ? error.message : ui.failedLoad,
				});
			} finally {
				setIsLoading(false);
			}
		},
		[accountId, ui.failedLoad],
	);

	useEffect(() => {
		setNotes([]);
		setNextCursor(null);
		setHasMore(false);
		void loadNotes(null);
	}, [loadNotes]);

	function resetForm() {
		setEditingId(null);
		setNoteType("general");
		setContent("");
	}

	function startEdit(note: Note) {
		setEditingId(note.id);
		setNoteType(note.noteType);
		setContent(note.content);
	}

	async function saveNote(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setFeedback(null);

		try {
			const response = await fetch(
				editingId
					? `/api/notes/${editingId}`
					: `/api/accounts/${accountId}/notes`,
				{
					method: editingId ? "PUT" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ noteType, content }),
				},
			);

			if (!response.ok) {
				throw new Error(await parseApiErrorResponse(response, ui.failedSave));
			}

			setFeedback({
				type: "success",
				message: editingId ? ui.noteUpdated : ui.noteCreated,
			});
			resetForm();
			await loadNotes(null);
		} catch (error) {
			setFeedback({
				type: "error",
				message: error instanceof Error ? error.message : ui.failedSave,
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function deleteNote(note: Note) {
		setFeedback(null);
		try {
			const response = await fetch(`/api/notes/${note.id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				throw new Error(await parseApiErrorResponse(response, ui.failedDelete));
			}

			setFeedback({
				type: "success",
				message: ui.noteDeleted,
			});
			setPendingDelete(null);
			if (editingId === note.id) {
				resetForm();
			}
			await loadNotes(null);
		} catch (error) {
			setFeedback({
				type: "error",
				message: error instanceof Error ? error.message : ui.failedDelete,
			});
		}
	}

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{ui.notes}</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void loadNotes(null)}
					disabled={isLoading || isSaving}
				>
					{ui.refresh}
				</Button>
			</div>

			<form
				onSubmit={saveNote}
				className="space-y-2 rounded-lg border border-border bg-muted/40 p-3"
			>
				<div className="grid gap-2 sm:grid-cols-[180px,1fr]">
					<select
						value={noteType}
						onChange={(event) => setNoteType(event.target.value as NoteType)}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
					>
						{noteTypeOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<input
						ref={contentInputRef}
						value={content}
						onChange={(event) => setContent(event.target.value)}
						placeholder={ui.writePlaceholder}
						className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
						required
					/>
				</div>
				<div className="flex gap-2">
					<Button type="submit" size="sm" disabled={isSaving}>
						{isSaving ? ui.saving : editingId ? ui.updateNote : ui.addNote}
					</Button>
					{editingId ? (
						<Button type="button" variant="ghost" size="sm" onClick={resetForm}>
							{ui.cancel}
						</Button>
					) : null}
				</div>
			</form>

			{feedback ? (
				<p
					role={feedback.type === "error" ? "alert" : "status"}
					aria-live="polite"
					className={`rounded-md border px-3 py-2 text-sm ${
						feedback.type === "success"
							? "border-success/30 bg-success/10 text-success"
							: "border-danger/30 bg-danger/10 text-danger"
					}`}
				>
					{feedback.message}
				</p>
			) : null}

			{isLoading ? (
				<output
					aria-live="polite"
					aria-label={ui.loadingNotes}
					className="space-y-2"
				>
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</output>
			) : notes.length === 0 ? (
				<div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
					<p>{ui.noNotes}</p>
					<Button
						size="sm"
						variant="outline"
						className="mt-2"
						onClick={() => contentInputRef.current?.focus()}
					>
						{ui.createFirstNote}
					</Button>
				</div>
			) : (
				<ul className="space-y-2">
					{notes.map((note) => (
						<li
							key={note.id}
							className="rounded-lg border border-border bg-background/40 p-3"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
										{noteTypeLabel(note.noteType)}
									</p>
									<p className="mt-1 text-sm">{note.content}</p>
									<p className="mt-2 text-xs text-muted-foreground">
										{note.author?.username ?? ui.system} •{" "}
										{formatDateTime(note.updatedAt)}
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => startEdit(note)}
									>
										{ui.edit}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										aria-label={ui.deleteNoteAria(note.id)}
										onClick={() => setPendingDelete(note)}
									>
										{ui.delete}
									</Button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
			{!isLoading && hasMore ? (
				<div className="flex justify-end">
					<Button
						variant="outline"
						size="sm"
						onClick={() => void loadNotes(nextCursor)}
					>
						{ui.loadMore}
					</Button>
				</div>
			) : null}
			<ConfirmDialog
				open={Boolean(pendingDelete)}
				title={ui.deleteTitle}
				description={
					pendingDelete ? ui.deleteDescription(pendingDelete.noteType) : ""
				}
				confirmLabel={ui.delete}
				tone="danger"
				onCancel={() => setPendingDelete(null)}
				onConfirm={() => {
					if (pendingDelete) {
						void deleteNote(pendingDelete);
					}
				}}
			/>
		</section>
	);
}
