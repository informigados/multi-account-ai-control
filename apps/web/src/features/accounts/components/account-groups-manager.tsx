"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, pickLocaleText } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

export type AccountGroup = {
	id: string;
	name: string;
	accountIds: string[];
};

type AccountGroupsManagerProps = {
	locale?: AppLocale;
	selectedGroupId: string;
	onSelectGroup: (groupId: string) => void;
};

export function AccountGroupsManager({
	locale = "pt_BR",
	selectedGroupId,
	onSelectGroup,
}: AccountGroupsManagerProps) {
	const text = (pt: string, en: string) => pickLocaleText(locale, { pt, en });

	const ui = {
		allAccounts: text("Todas as contas", "All accounts"),
		groups: text("Grupos", "Groups"),
		newGroup: text("Novo grupo", "New group"),
		placeholder: text("Nome do grupo...", "Group name..."),
		create: text("Criar", "Create"),
		rename: text("Renomear", "Rename"),
		delete: text("Excluir grupo", "Delete group"),
		confirmDelete: text(
			"Excluir este grupo? As contas não serão deletadas.",
			"Delete this group? Accounts will not be deleted.",
		),
		saving: text("Salvando...", "Saving..."),
	};

	const [groups, setGroups] = useState<AccountGroup[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newName, setNewName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [showInput, setShowInput] = useState(false);

	const loadGroups = useCallback(async () => {
		try {
			const res = await fetch("/api/settings/account-groups");
			if (!res.ok) return;
			const data = (await res.json()) as { groups: AccountGroup[] };
			setGroups(data.groups);
		} catch {
			setError("Falha ao carregar grupos.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadGroups();
	}, [loadGroups]);

	async function createGroup() {
		if (!newName.trim()) return;
		setIsCreating(true);
		try {
			const res = await fetch("/api/settings/account-groups", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: newName.trim() }),
			});
			if (!res.ok) throw new Error("Falha.");
			const data = (await res.json()) as { group: AccountGroup };
			setGroups((prev) => [...prev, data.group]);
			setNewName("");
			setShowInput(false);
		} catch {
			setError("Falha ao criar grupo.");
		} finally {
			setIsCreating(false);
		}
	}

	async function deleteGroup(id: string) {
		if (!window.confirm(ui.confirmDelete)) return;
		await fetch(`/api/settings/account-groups/${id}`, { method: "DELETE" });
		setGroups((prev) => prev.filter((g) => g.id !== id));
		if (selectedGroupId === id) onSelectGroup("");
	}

	if (error) {
		return <p className="text-xs text-danger">{error}</p>;
	}

	return (
		<div className="flex flex-col gap-1">
			{/* "All" option */}
			<button
				type="button"
				onClick={() => onSelectGroup("")}
				className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
					selectedGroupId === ""
						? "bg-primary/10 font-medium text-primary"
						: "text-muted-foreground hover:bg-muted hover:text-foreground"
				}`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="h-3.5 w-3.5 shrink-0"
					role="img"
					aria-label={ui.allAccounts}
				>
					<title>{ui.allAccounts}</title>
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
					<path d="M16 3.13a4 4 0 0 1 0 7.75" />
				</svg>
				{ui.allAccounts}
			</button>

			{/* Groups */}
			{!isLoading && groups.length > 0 && (
				<>
					<p className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						{ui.groups}
					</p>
					{groups.map((group) => (
						<div key={group.id} className="group flex items-center gap-1">
							<button
								type="button"
								onClick={() => onSelectGroup(group.id)}
								className={`flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
									selectedGroupId === group.id
										? "bg-primary/10 font-medium text-primary"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								}`}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									strokeLinecap="round"
									strokeLinejoin="round"
									className="h-3.5 w-3.5 shrink-0"
									role="img"
									aria-label={group.name}
								>
									<title>{group.name}</title>
									<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
								</svg>
								<span className="truncate">{group.name}</span>
								<span className="ml-auto text-[10px] opacity-60">
									{group.accountIds.length}
								</span>
							</button>

							{/* Delete group button (shows on hover) */}
							<button
								type="button"
								onClick={() => void deleteGroup(group.id)}
								aria-label={`${ui.delete} "${group.name}"`}
								className="hidden shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100 group-hover:block"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									strokeLinecap="round"
									strokeLinejoin="round"
									className="h-3 w-3"
									role="img"
									aria-label={ui.delete}
								>
									<title>{ui.delete}</title>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
					))}
				</>
			)}

			{/* Create group */}
			{showInput ? (
				<div className="mt-2 flex gap-1">
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") void createGroup();
							if (e.key === "Escape") setShowInput(false);
						}}
						placeholder={ui.placeholder}
						maxLength={50}
						// biome-ignore lint/a11y/noAutofocus: intentional — user just clicked "new group"
						autoFocus
						className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-xs outline-none ring-primary transition focus:ring-2"
					/>
					<Button
						type="button"
						size="sm"
						onClick={() => void createGroup()}
						disabled={isCreating || !newName.trim()}
						className="h-8 px-2 text-xs"
					>
						{ui.create}
					</Button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setShowInput(true)}
					className="mt-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="h-3 w-3"
						role="img"
						aria-label={ui.newGroup}
					>
						<title>{ui.newGroup}</title>
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					{ui.newGroup}
				</button>
			)}
		</div>
	);
}
