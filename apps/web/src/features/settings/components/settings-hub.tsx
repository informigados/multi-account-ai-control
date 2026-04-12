"use client";

import { Button } from "@/components/ui/button";
import { type AppLocale, getDictionary } from "@/lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "admin" | "operator";
type Locale = "pt_BR" | "en";
type AuditRetentionDays = 30 | 60 | 90 | 180 | 360;

type AuthUser = {
	id: string;
	username: string;
	email: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
	isSystemAdmin: boolean;
};

type ManagedUser = {
	id: string;
	username: string;
	email: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
	isSystemAdmin: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt: string | null;
};

type UserDraft = {
	username: string;
	email: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
};

type CreateUserState = {
	username: string;
	email: string;
	password: string;
	role: Role;
	locale: Locale;
	isActive: boolean;
};

type SettingsHubProps = {
	currentUser: AuthUser;
	locale: AppLocale;
};

type AuditRetentionConfig = {
	enabled: boolean;
	days: AuditRetentionDays | null;
};

const initialCreateUserState: CreateUserState = {
	username: "",
	email: "",
	password: "",
	role: "operator",
	locale: "pt_BR",
	isActive: true,
};

const auditRetentionDaysOptions: AuditRetentionDays[] = [30, 60, 90, 180, 360];

function normalizeAuditRetentionDays(value: unknown): AuditRetentionDays {
	if (
		typeof value === "number" &&
		auditRetentionDaysOptions.includes(value as AuditRetentionDays)
	) {
		return value as AuditRetentionDays;
	}

	return auditRetentionDaysOptions[0];
}

function toUserDraft(user: ManagedUser): UserDraft {
	return {
		username: user.username,
		email: user.email,
		role: user.role,
		locale: user.locale,
		isActive: user.isActive,
	};
}

export function SettingsHub({ currentUser, locale }: SettingsHubProps) {
	const t = getDictionary(locale);
	const isPtBr = locale === "pt_BR";
	const isAdmin = currentUser.role === "admin";
	const ui = {
		profilePasswordHint: isPtBr
			? "Use no mínimo 12 caracteres para manter o padrão de segurança."
			: "Use at least 12 characters to keep the security standard.",
		profileLocaleHint: isPtBr
			? "O admin protegido mantém idioma fixo para estabilidade operacional."
			: "Protected admin keeps fixed locale for operational stability.",
		createPasswordHint: isPtBr
			? "Senha inicial obrigatória (mínimo de 12 caracteres)."
			: "Initial password is required (minimum 12 characters).",
		roleHint: isPtBr
			? "operator = operação diária, admin = gestão completa de usuários e configurações."
			: "operator = daily operations, admin = full user and settings management.",
		protectedAdminHint: isPtBr
			? "Usuário admin protegido: username imutável e exclusão bloqueada por segurança."
			: "Protected admin user: immutable username and blocked deletion for security.",
		roleOperatorLabel: isPtBr ? "Operador" : "Operator",
		roleAdminLabel: isPtBr ? "Administrador" : "Administrator",
		loadingUsers: isPtBr ? "Carregando usuários..." : "Loading users...",
		emptyUsers: isPtBr ? "Nenhum usuário cadastrado." : "No users registered.",
		failedUpdateProfile: isPtBr
			? "Falha ao atualizar perfil."
			: "Failed to update profile.",
		failedCreateUser: isPtBr
			? "Falha ao criar usuário."
			: "Failed to create user.",
		failedUpdateUser: isPtBr
			? "Falha ao atualizar usuário."
			: "Failed to update user.",
		failedDeleteUser: isPtBr
			? "Falha ao excluir usuário."
			: "Failed to delete user.",
		failedLoadAuditRetention: isPtBr
			? "Falha ao carregar política de retenção."
			: "Failed to load retention policy.",
		failedUpdateAuditRetention: isPtBr
			? "Falha ao atualizar política de retenção."
			: "Failed to update retention policy.",
	};

	const [profileEmail, setProfileEmail] = useState(currentUser.email);
	const [profilePassword, setProfilePassword] = useState("");
	const [profileLocale, setProfileLocale] = useState<Locale>(
		currentUser.locale,
	);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
	const [profileError, setProfileError] = useState<string | null>(null);

	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
	const [isLoadingUsers, setIsLoadingUsers] = useState(false);
	const [usersFeedback, setUsersFeedback] = useState<string | null>(null);
	const [usersError, setUsersError] = useState<string | null>(null);
	const [createUserState, setCreateUserState] = useState<CreateUserState>(
		initialCreateUserState,
	);
	const [isCreatingUser, setIsCreatingUser] = useState(false);
	const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
	const [deletingRows, setDeletingRows] = useState<Record<string, boolean>>({});
	const [auditRetention, setAuditRetention] = useState<AuditRetentionConfig>({
		enabled: false,
		days: null,
	});
	const [auditRetentionOptions, setAuditRetentionOptions] = useState<
		AuditRetentionDays[]
	>(auditRetentionDaysOptions);
	const [isLoadingAuditRetention, setIsLoadingAuditRetention] = useState(false);
	const [isSavingAuditRetention, setIsSavingAuditRetention] = useState(false);
	const [auditRetentionFeedback, setAuditRetentionFeedback] = useState<
		string | null
	>(null);
	const [auditRetentionError, setAuditRetentionError] = useState<string | null>(
		null,
	);

	const localeOptions = useMemo(
		() => [
			{ value: "pt_BR" as const, label: "Português (Brasil)" },
			{ value: "en" as const, label: "English" },
		],
		[],
	);

	const loadUsers = useCallback(async () => {
		if (!isAdmin) {
			return;
		}

		setIsLoadingUsers(true);
		setUsersError(null);
		setUsersFeedback(null);

		try {
			const response = await fetch("/api/users?limit=200", { method: "GET" });
			if (response.status === 403) {
				setUsersError(t.settings.forbidden);
				return;
			}
			if (!response.ok) {
				throw new Error(t.settings.loadError);
			}

			const payload = (await response.json()) as { users: ManagedUser[] };
			setUsers(payload.users);
			setDrafts(
				Object.fromEntries(
					payload.users.map((user) => [user.id, toUserDraft(user)]),
				),
			);
		} catch {
			setUsersError(t.settings.loadError);
		} finally {
			setIsLoadingUsers(false);
		}
	}, [isAdmin, t.settings.forbidden, t.settings.loadError]);

	const loadAuditRetention = useCallback(async () => {
		if (!isAdmin) {
			return;
		}

		setIsLoadingAuditRetention(true);
		setAuditRetentionError(null);
		setAuditRetentionFeedback(null);

		try {
			const response = await fetch("/api/settings/audit-retention", {
				method: "GET",
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(
					payload.message ??
						t.settings.auditRetentionLoadError ??
						ui.failedLoadAuditRetention,
				);
			}

			const payload = (await response.json()) as {
				config?: { enabled?: boolean; days?: number | null };
				options?: number[];
			};

			const nextOptions = Array.isArray(payload.options)
				? payload.options
						.map((value) => normalizeAuditRetentionDays(value))
						.filter(
							(value, index, array) =>
								array.findIndex((item) => item === value) === index,
						)
				: auditRetentionDaysOptions;
			const normalizedOptions =
				nextOptions.length > 0 ? nextOptions : auditRetentionDaysOptions;
			setAuditRetentionOptions(normalizedOptions);

			const normalizedDays = normalizeAuditRetentionDays(payload.config?.days);
			const enabled = Boolean(payload.config?.enabled);
			setAuditRetention({
				enabled,
				days: enabled ? normalizedDays : null,
			});
		} catch (error) {
			setAuditRetentionError(
				error instanceof Error
					? error.message
					: (t.settings.auditRetentionLoadError ?? ui.failedLoadAuditRetention),
			);
		} finally {
			setIsLoadingAuditRetention(false);
		}
	}, [
		isAdmin,
		t.settings.auditRetentionLoadError,
		ui.failedLoadAuditRetention,
	]);

	useEffect(() => {
		void loadUsers();
	}, [loadUsers]);

	useEffect(() => {
		void loadAuditRetention();
	}, [loadAuditRetention]);

	async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSavingProfile(true);
		setProfileFeedback(null);
		setProfileError(null);

		const body: { email?: string; password?: string; locale?: Locale } = {};
		if (profileEmail !== currentUser.email) body.email = profileEmail;
		if (profilePassword.length > 0) body.password = profilePassword;
		if (!currentUser.isSystemAdmin && profileLocale !== currentUser.locale) {
			body.locale = profileLocale;
		}

		if (Object.keys(body).length === 0) {
			setIsSavingProfile(false);
			setProfileFeedback(t.settings.profileSaved);
			return;
		}

		try {
			const response = await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.failedUpdateProfile);
			}

			setProfilePassword("");
			setProfileFeedback(t.settings.profileSaved);
		} catch (error) {
			setProfileError(
				error instanceof Error ? error.message : ui.failedUpdateProfile,
			);
		} finally {
			setIsSavingProfile(false);
		}
	}

	async function createUser(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsCreatingUser(true);
		setUsersFeedback(null);
		setUsersError(null);

		try {
			const response = await fetch("/api/users", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(createUserState),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.failedCreateUser);
			}

			setCreateUserState(initialCreateUserState);
			setUsersFeedback(t.settings.createSuccess);
			await loadUsers();
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : ui.failedCreateUser,
			);
		} finally {
			setIsCreatingUser(false);
		}
	}

	async function saveManagedUser(userId: string) {
		const original = users.find((user) => user.id === userId);
		const draft = drafts[userId];
		if (!original || !draft) return;

		const payload: {
			username?: string;
			email?: string;
			role?: Role;
			locale?: Locale;
			isActive?: boolean;
		} = {};
		if (draft.username !== original.username) payload.username = draft.username;
		if (draft.email !== original.email) payload.email = draft.email;
		if (draft.role !== original.role) payload.role = draft.role;
		if (draft.locale !== original.locale) payload.locale = draft.locale;
		if (draft.isActive !== original.isActive) payload.isActive = draft.isActive;

		if (Object.keys(payload).length === 0) {
			return;
		}

		setSavingRows((previous) => ({ ...previous, [userId]: true }));
		setUsersFeedback(null);
		setUsersError(null);

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorPayload = (await response.json()) as { message?: string };
				throw new Error(errorPayload.message ?? ui.failedUpdateUser);
			}

			const updated = (await response.json()) as { user: ManagedUser };
			setUsers((previous) =>
				previous.map((user) =>
					user.id === updated.user.id ? updated.user : user,
				),
			);
			setDrafts((previous) => ({
				...previous,
				[updated.user.id]: toUserDraft(updated.user),
			}));
			setUsersFeedback(t.settings.updateSuccess);
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : ui.failedUpdateUser,
			);
		} finally {
			setSavingRows((previous) => ({ ...previous, [userId]: false }));
		}
	}

	async function deleteManagedUser(userId: string) {
		if (userId === currentUser.id) {
			setUsersError(t.settings.cannotDeleteSelf);
			return;
		}

		setDeletingRows((previous) => ({ ...previous, [userId]: true }));
		setUsersFeedback(null);
		setUsersError(null);

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload.message ?? ui.failedDeleteUser);
			}

			setUsers((previous) => previous.filter((user) => user.id !== userId));
			setDrafts((previous) => {
				const nextDrafts = { ...previous };
				delete nextDrafts[userId];
				return nextDrafts;
			});
			setUsersFeedback(t.settings.deleteSuccess);
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : ui.failedDeleteUser,
			);
		} finally {
			setDeletingRows((previous) => ({ ...previous, [userId]: false }));
		}
	}

	async function saveAuditRetention(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isAdmin) {
			return;
		}

		setIsSavingAuditRetention(true);
		setAuditRetentionError(null);
		setAuditRetentionFeedback(null);

		const retentionDaysDefault = auditRetentionOptions[0] ?? 30;
		const body = {
			enabled: auditRetention.enabled,
			days: auditRetention.enabled
				? (auditRetention.days ?? retentionDaysDefault)
				: null,
		};

		try {
			const response = await fetch("/api/settings/audit-retention", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(
					payload.message ??
						t.settings.auditRetentionUpdateError ??
						ui.failedUpdateAuditRetention,
				);
			}

			const payload = (await response.json()) as {
				config?: { enabled?: boolean; days?: number | null };
			};

			const normalizedDays = normalizeAuditRetentionDays(payload.config?.days);
			const enabled = Boolean(payload.config?.enabled);
			setAuditRetention({
				enabled,
				days: enabled ? normalizedDays : null,
			});
			setAuditRetentionFeedback(t.settings.auditRetentionSaved);
		} catch (error) {
			setAuditRetentionError(
				error instanceof Error
					? error.message
					: (t.settings.auditRetentionUpdateError ??
							ui.failedUpdateAuditRetention),
			);
		} finally {
			setIsSavingAuditRetention(false);
		}
	}

	return (
		<section className="grid min-w-0 gap-5">
			<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
				<h2 className="text-lg font-semibold">{t.settings.profileCardTitle}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{t.settings.profileCardDescription}
				</p>

				<form className="mt-4 space-y-3" onSubmit={saveProfile}>
					<div className="space-y-1.5">
						<label
							className="text-sm text-muted-foreground"
							htmlFor="profile-email"
						>
							{t.settings.emailLabel}
						</label>
						<input
							id="profile-email"
							value={profileEmail}
							onChange={(event) => setProfileEmail(event.target.value)}
							type="email"
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							required
						/>
					</div>
					<div className="space-y-1.5">
						<label
							className="text-sm text-muted-foreground"
							htmlFor="profile-password"
						>
							{t.settings.passwordLabel}
						</label>
						<input
							id="profile-password"
							value={profilePassword}
							onChange={(event) => setProfilePassword(event.target.value)}
							type="password"
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							placeholder={t.settings.passwordPlaceholder}
						/>
						<p className="text-xs text-muted-foreground">
							{ui.profilePasswordHint}
						</p>
					</div>
					<div className="space-y-1.5">
						<label
							className="text-sm text-muted-foreground"
							htmlFor="profile-locale"
						>
							{t.settings.languageLabel}
						</label>
						<select
							id="profile-locale"
							value={profileLocale}
							onChange={(event) =>
								setProfileLocale(event.target.value as Locale)
							}
							disabled={currentUser.isSystemAdmin}
							className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
						>
							{localeOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						{currentUser.isSystemAdmin ? (
							<p className="text-xs text-muted-foreground">
								{ui.profileLocaleHint}
							</p>
						) : null}
					</div>

					<Button type="submit" disabled={isSavingProfile}>
						{isSavingProfile ? t.settings.saving : t.settings.saveProfile}
					</Button>
				</form>

				{profileFeedback ? (
					<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
						{profileFeedback}
					</p>
				) : null}
				{profileError ? (
					<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
						{profileError}
					</p>
				) : null}
			</article>

			{isAdmin ? (
				<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-lg font-semibold">
						{t.settings.auditRetentionCardTitle}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{t.settings.auditRetentionCardDescription}
					</p>

					<form className="mt-4 space-y-3" onSubmit={saveAuditRetention}>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="audit-retention-mode"
							>
								{t.settings.auditRetentionModeLabel}
							</label>
							<select
								id="audit-retention-mode"
								value={auditRetention.enabled ? "enabled" : "disabled"}
								onChange={(event) =>
									setAuditRetention((previous) => ({
										...previous,
										enabled: event.target.value === "enabled",
										days:
											event.target.value === "enabled"
												? (previous.days ??
													auditRetentionOptions[0] ??
													auditRetentionDaysOptions[0])
												: null,
									}))
								}
								disabled={isLoadingAuditRetention || isSavingAuditRetention}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							>
								<option value="disabled">
									{t.settings.auditRetentionModeDisabled}
								</option>
								<option value="enabled">
									{t.settings.auditRetentionModeEnabled}
								</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="audit-retention-days"
							>
								{t.settings.auditRetentionDaysLabel}
							</label>
							<select
								id="audit-retention-days"
								value={String(
									auditRetention.days ??
										auditRetentionOptions[0] ??
										auditRetentionDaysOptions[0],
								)}
								onChange={(event) =>
									setAuditRetention((previous) => ({
										...previous,
										days: normalizeAuditRetentionDays(
											Number(event.target.value),
										),
									}))
								}
								disabled={
									!auditRetention.enabled ||
									isLoadingAuditRetention ||
									isSavingAuditRetention
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{auditRetentionOptions.map((days) => (
									<option key={days} value={days}>
										{isPtBr ? `${days} dias` : `${days} days`}
									</option>
								))}
							</select>
							<p className="text-xs text-muted-foreground">
								{t.settings.auditRetentionHint}
							</p>
						</div>

						<Button
							type="submit"
							disabled={isLoadingAuditRetention || isSavingAuditRetention}
						>
							{isSavingAuditRetention
								? t.settings.saving
								: t.settings.auditRetentionSave}
						</Button>
					</form>

					{auditRetentionFeedback ? (
						<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
							{auditRetentionFeedback}
						</p>
					) : null}
					{auditRetentionError ? (
						<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
							{auditRetentionError}
						</p>
					) : null}
				</article>
			) : null}

			{isAdmin ? (
				<article className="min-w-0 rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
					<h2 className="text-lg font-semibold">{t.settings.usersCardTitle}</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{t.settings.usersCardDescription}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						{ui.protectedAdminHint}
					</p>

					<form
						className="mt-4 grid gap-3 md:grid-cols-2"
						onSubmit={createUser}
					>
						<h3 className="md:col-span-2 text-base font-medium">
							{t.settings.createUserTitle}
						</h3>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-username"
							>
								{t.settings.usernameLabel}
							</label>
							<input
								id="create-username"
								value={createUserState.username}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										username: event.target.value,
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-email"
							>
								{t.settings.emailLabel}
							</label>
							<input
								id="create-email"
								value={createUserState.email}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										email: event.target.value,
									}))
								}
								type="email"
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-password"
							>
								{t.settings.passwordLabel}
							</label>
							<input
								id="create-password"
								value={createUserState.password}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										password: event.target.value,
									}))
								}
								type="password"
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
								required
							/>
							<p className="text-xs text-muted-foreground">
								{ui.createPasswordHint}
							</p>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-role"
							>
								{t.settings.userRoleLabel}
							</label>
							<select
								id="create-role"
								value={createUserState.role}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										role: event.target.value as Role,
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								<option value="operator">{ui.roleOperatorLabel}</option>
								<option value="admin">{ui.roleAdminLabel}</option>
							</select>
							<p className="text-xs text-muted-foreground">{ui.roleHint}</p>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-locale"
							>
								{t.settings.languageLabel}
							</label>
							<select
								id="create-locale"
								value={createUserState.locale}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										locale: event.target.value as Locale,
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								{localeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-sm text-muted-foreground"
								htmlFor="create-status"
							>
								{t.settings.userStatusLabel}
							</label>
							<select
								id="create-status"
								value={createUserState.isActive ? "active" : "inactive"}
								onChange={(event) =>
									setCreateUserState((previous) => ({
										...previous,
										isActive: event.target.value === "active",
									}))
								}
								className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary transition focus:ring-2"
							>
								<option value="active">{t.settings.activeStatus}</option>
								<option value="inactive">{t.settings.inactiveStatus}</option>
							</select>
						</div>
						<div className="md:col-span-2">
							<Button type="submit" disabled={isCreatingUser}>
								{isCreatingUser ? t.settings.saving : t.settings.createUser}
							</Button>
						</div>
					</form>

					<div className="mt-6 w-full max-w-full overflow-x-auto rounded-lg border border-border">
						<table className="w-full min-w-[64rem] text-sm">
							<thead className="bg-muted/70 text-left text-muted-foreground">
								<tr>
									<th className="px-3 py-2">{t.settings.usernameLabel}</th>
									<th className="px-3 py-2">{t.settings.usersTableEmail}</th>
									<th className="px-3 py-2">{t.settings.usersTableRole}</th>
									<th className="px-3 py-2">{t.settings.usersTableLocale}</th>
									<th className="px-3 py-2">{t.settings.usersTableStatus}</th>
									<th className="px-3 py-2">
										{t.settings.usersTableProtected}
									</th>
									<th className="px-3 py-2 text-right">
										{t.settings.usersTableActions}
									</th>
								</tr>
							</thead>
							<tbody>
								{isLoadingUsers ? (
									<tr>
										<td className="px-3 py-4 text-muted-foreground" colSpan={7}>
											{ui.loadingUsers}
										</td>
									</tr>
								) : users.length === 0 ? (
									<tr>
										<td className="px-3 py-4 text-muted-foreground" colSpan={7}>
											{ui.emptyUsers}
										</td>
									</tr>
								) : (
									users.map((user) => {
										const draft = drafts[user.id] ?? toUserDraft(user);
										const isSaving = savingRows[user.id] ?? false;
										const isDeleting = deletingRows[user.id] ?? false;
										const disableProtectedFields = user.isSystemAdmin;

										return (
											<tr key={user.id} className="border-t border-border/80">
												<td className="px-3 py-2">
													<input
														value={draft.username}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	username: event.target.value,
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 w-40 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													/>
												</td>
												<td className="px-3 py-2">
													<input
														value={draft.email}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	email: event.target.value,
																},
															}))
														}
														type="email"
														className="h-9 w-56 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2"
													/>
												</td>
												<td className="px-3 py-2">
													<select
														value={draft.role}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	role: event.target.value as Role,
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													>
														<option value="operator">
															{ui.roleOperatorLabel}
														</option>
														<option value="admin">{ui.roleAdminLabel}</option>
													</select>
												</td>
												<td className="px-3 py-2">
													<select
														value={draft.locale}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	locale: event.target.value as Locale,
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													>
														{localeOptions.map((option) => (
															<option key={option.value} value={option.value}>
																{option.label}
															</option>
														))}
													</select>
												</td>
												<td className="px-3 py-2">
													<select
														value={draft.isActive ? "active" : "inactive"}
														onChange={(event) =>
															setDrafts((previous) => ({
																...previous,
																[user.id]: {
																	...draft,
																	isActive: event.target.value === "active",
																},
															}))
														}
														disabled={disableProtectedFields}
														className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none ring-primary transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
													>
														<option value="active">
															{t.settings.activeStatus}
														</option>
														<option value="inactive">
															{t.settings.inactiveStatus}
														</option>
													</select>
												</td>
												<td className="px-3 py-2">
													{user.isSystemAdmin
														? t.settings.protectedYes
														: t.settings.protectedNo}
												</td>
												<td className="px-3 py-2 text-right">
													<div className="inline-flex gap-2">
														<Button
															size="sm"
															variant="outline"
															disabled={isSaving}
															onClick={() => {
																void saveManagedUser(user.id);
															}}
														>
															{isSaving
																? t.settings.saving
																: t.settings.actionSave}
														</Button>
														{!user.isSystemAdmin ? (
															<Button
																size="sm"
																variant="ghost"
																disabled={isDeleting}
																onClick={() => {
																	void deleteManagedUser(user.id);
																}}
															>
																{isDeleting
																	? t.settings.actionDeleting
																	: t.settings.actionDelete}
															</Button>
														) : null}
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{usersFeedback ? (
						<p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
							{usersFeedback}
						</p>
					) : null}
					{usersError ? (
						<p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
							{usersError}
						</p>
					) : null}
				</article>
			) : null}
		</section>
	);
}
