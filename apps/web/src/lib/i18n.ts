export const SUPPORTED_LOCALES = [
	"pt_BR",
	"pt_PT",
	"en",
	"es",
	"zh_CN",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt_BR";

export function normalizeLocale(value: string | null | undefined): AppLocale {
	switch (value) {
		case "pt_BR":
		case "pt_PT":
		case "en":
		case "es":
		case "zh_CN":
			return value;
		default:
			return DEFAULT_LOCALE;
	}
}

export function toHtmlLang(
	locale: AppLocale,
): "pt-BR" | "pt-PT" | "en" | "es" | "zh-CN" {
	if (locale === "pt_BR") {
		return "pt-BR";
	}
	if (locale === "pt_PT") {
		return "pt-PT";
	}
	if (locale === "es") {
		return "es";
	}
	if (locale === "zh_CN") {
		return "zh-CN";
	}
	return "en";
}

type AppDictionary = {
	shell: {
		productName: string;
		loggedInAs: string;
		nav: {
			dashboard: string;
			providers: string;
			accounts: string;
			data: string;
			audit: string;
			settings: string;
			about: string;
		};
		actions: {
			logout: string;
			lock: string;
			openMenu: string;
			closeMenu: string;
		};
	};
	pages: {
		dashboard: {
			title: string;
			description: string;
		};
		providers: {
			title: string;
			description: string;
		};
		accounts: {
			title: string;
			description: string;
		};
		data: {
			title: string;
			description: string;
		};
		audit: {
			title: string;
			description: string;
		};
		settings: {
			title: string;
			description: string;
		};
		about: {
			title: string;
			description: string;
		};
	};
	footer: {
		designedBy: string;
	};
	login: {
		localAuth: string;
		title: string;
		badge: string;
		identifierLabel: string;
		identifierPlaceholder: string;
		passwordLabel: string;
		errorInvalidCredentials: string;
		errorLoginFailed: string;
		submit: string;
		submitting: string;
		forgotPassword: string;
		resetRequestTitle: string;
		resetRequestDescription: string;
		resetRequestEmailLabel: string;
		resetRequestSubmit: string;
		resetRequestSubmitting: string;
		resetRequestSuccess: string;
		resetRequestError: string;
		resetTitle: string;
		resetSubtitle: string;
		resetPasswordLabel: string;
		resetConfirmPasswordLabel: string;
		resetPasswordPlaceholder: string;
		resetSubmit: string;
		resetSubmitting: string;
		resetSuccess: string;
		resetBackToLogin: string;
		resetMissingToken: string;
		resetPasswordsMismatch: string;
		resetErrorGeneric: string;
	};
	idleLock: {
		badgeLabel: string;
		title: string;
		subtitle: string;
		subtitleNoPassword: string;
		timeoutLabel: string;
		passwordPlaceholder: string;
		errorExpired: string;
		errorGeneric: string;
		unlock: string;
		unlocking: string;
		continue: string;
		continuing: string;
		logout: string;
	};
	settings: {
		profileCardTitle: string;
		profileCardDescription: string;
		emailLabel: string;
		passwordLabel: string;
		passwordPlaceholder: string;
		languageLabel: string;
		saveProfile: string;
		saving: string;
		profileSaved: string;
		usersCardTitle: string;
		usersCardDescription: string;
		createUserTitle: string;
		usernameLabel: string;
		userRoleLabel: string;
		userStatusLabel: string;
		activeStatus: string;
		inactiveStatus: string;
		createUser: string;
		usersTableTitle: string;
		usersTableEmail: string;
		usersTableRole: string;
		usersTableLocale: string;
		usersTableStatus: string;
		usersTableProtected: string;
		usersTableActions: string;
		protectedYes: string;
		protectedNo: string;
		actionSave: string;
		actionDelete: string;
		actionDeleting: string;
		loadError: string;
		createSuccess: string;
		updateSuccess: string;
		deleteSuccess: string;
		forbidden: string;
		cannotDeleteSelf: string;
		auditRetentionCardTitle: string;
		auditRetentionCardDescription: string;
		auditRetentionModeLabel: string;
		auditRetentionModeDisabled: string;
		auditRetentionModeEnabled: string;
		auditRetentionDaysLabel: string;
		auditRetentionHint: string;
		auditRetentionSave: string;
		auditRetentionSaved: string;
		auditRetentionLoadError: string;
		auditRetentionUpdateError: string;
		idleLockCardTitle: string;
		idleLockCardDescription: string;
		idleLockModeLabel: string;
		idleLockModeDisabled: string;
		idleLockModeEnabled: string;
		idleLockTimeoutLabel: string;
		idleLockTimeoutHint: string;
		idleLockUnlockLabel: string;
		idleLockUnlockPassword: string;
		idleLockUnlockContinue: string;
		idleLockSave: string;
		idleLockSaved: string;
		idleLockLoadError: string;
		idleLockUpdateError: string;
	};
};

const dictionaryByLocale: Record<"pt_BR" | "en", AppDictionary> = {
	pt_BR: {
		shell: {
			productName: "Multi Account AI Control",
			loggedInAs: "Logado como",
			nav: {
				dashboard: "Dashboard",
				providers: "Provedores",
				accounts: "Contas",
				data: "Dados",
				audit: "Auditoria",
				settings: "Configurações",
				about: "Sobre",
			},
			actions: {
				logout: "Sair",
				lock: "Bloquear",
				openMenu: "Abrir menu",
				closeMenu: "Fechar menu",
			},
		},
		pages: {
			dashboard: {
				title: "Dashboard Operacional",
				description:
					"Visão de comando em tempo real para cotas, janelas de reset e saúde das contas.",
			},
			providers: {
				title: "Provedores",
				description:
					"Gerencie catálogo de provedores, estratégia de conectores e status de ciclo de vida.",
			},
			accounts: {
				title: "Contas",
				description:
					"Cadastre, filtre e opere o inventário de contas com segredos mascarados.",
			},
			data: {
				title: "Operações de Dados",
				description:
					"Fluxos de importação, exportação e restauração com rastreabilidade de auditoria.",
			},
			audit: {
				title: "Log de Auditoria",
				description:
					"Rastreabilidade operacional global em autenticação, contas, uso, notas e operações de dados.",
			},
			settings: {
				title: "Configurações",
				description:
					"Ajuste perfil, idioma da interface e gestão de usuários do sistema.",
			},
			about: {
				title: "Sobre o Sistema",
				description:
					"Conheça os princípios, segurança e evolução do Multi Account AI Control.",
			},
		},
		footer: {
			designedBy: "Projetado por",
		},
		login: {
			localAuth: "Autenticação local",
			title: "Multi Account AI Control",
			badge: "Acesso local-first seguro",
			identifierLabel: "Usuário ou e-mail",
			identifierPlaceholder: "admin ou admin@local",
			passwordLabel: "Senha",
			errorInvalidCredentials: "Credenciais inválidas.",
			errorLoginFailed: "Falha no login. Tente novamente.",
			submit: "Entrar",
			submitting: "Entrando...",
			forgotPassword: "Esqueci minha senha",
			resetRequestTitle: "Recuperar acesso por e-mail",
			resetRequestDescription:
				"Informe seu e-mail para receber um link seguro de redefinição.",
			resetRequestEmailLabel: "E-mail da conta",
			resetRequestSubmit: "Enviar link de recuperação",
			resetRequestSubmitting: "Enviando...",
			resetRequestSuccess:
				"Se o e-mail existir, um link de redefinição foi enviado.",
			resetRequestError:
				"Não foi possível enviar o e-mail de redefinição no momento.",
			resetTitle: "Redefinir senha",
			resetSubtitle: "Defina uma nova senha para retomar o acesso ao sistema.",
			resetPasswordLabel: "Nova senha",
			resetConfirmPasswordLabel: "Confirmar nova senha",
			resetPasswordPlaceholder: "Mínimo de 12 caracteres",
			resetSubmit: "Salvar nova senha",
			resetSubmitting: "Salvando...",
			resetSuccess: "Senha redefinida com sucesso. Faça login novamente.",
			resetBackToLogin: "Voltar para login",
			resetMissingToken: "Token de redefinição ausente ou inválido.",
			resetPasswordsMismatch: "As senhas não conferem.",
			resetErrorGeneric: "Falha ao redefinir senha.",
		},
		idleLock: {
			badgeLabel: "Proteção por Inatividade",
			title: "Sessão bloqueada",
			subtitle: "Digite sua senha novamente para desbloquear este workspace.",
			subtitleNoPassword:
				"Sessão pausada por inatividade. Continue para retomar o workspace.",
			timeoutLabel: "Bloqueio após {minutes} min de inatividade",
			passwordPlaceholder: "Senha da conta",
			errorExpired: "Sessão expirada ou credenciais inválidas.",
			errorGeneric: "Falha ao desbloquear sessão.",
			unlock: "Desbloquear",
			unlocking: "Desbloqueando...",
			continue: "Continuar sessão",
			continuing: "Validando sessão...",
			logout: "Sair",
		},
		settings: {
			profileCardTitle: "Perfil",
			profileCardDescription:
				"Atualize e-mail, senha e idioma da interface para o usuário logado.",
			emailLabel: "E-mail",
			passwordLabel: "Nova senha (opcional)",
			passwordPlaceholder: "Mínimo de 12 caracteres",
			languageLabel: "Idioma",
			saveProfile: "Salvar perfil",
			saving: "Salvando...",
			profileSaved: "Perfil atualizado com sucesso.",
			usersCardTitle: "Usuários",
			usersCardDescription:
				"Crie e gerencie usuários. O admin protegido não pode ser excluído e não permite alteração de username.",
			createUserTitle: "Adicionar usuário",
			usernameLabel: "Nome de usuário",
			userRoleLabel: "Função",
			userStatusLabel: "Status",
			activeStatus: "Ativo",
			inactiveStatus: "Inativo",
			createUser: "Criar usuário",
			usersTableTitle: "Usuários cadastrados",
			usersTableEmail: "E-mail",
			usersTableRole: "Função",
			usersTableLocale: "Idioma",
			usersTableStatus: "Status",
			usersTableProtected: "Admin protegido",
			usersTableActions: "Ações",
			protectedYes: "Sim",
			protectedNo: "Não",
			actionSave: "Salvar",
			actionDelete: "Excluir",
			actionDeleting: "Excluindo...",
			loadError: "Falha ao carregar usuários.",
			createSuccess: "Usuário criado com sucesso.",
			updateSuccess: "Usuário atualizado com sucesso.",
			deleteSuccess: "Usuário excluído com sucesso.",
			forbidden: "Apenas administradores podem gerenciar usuários.",
			cannotDeleteSelf: "Você não pode excluir seu próprio usuário.",
			auditRetentionCardTitle: "Retenção de logs de auditoria",
			auditRetentionCardDescription:
				"Controle a exclusão automática para evitar crescimento excessivo do histórico.",
			auditRetentionModeLabel: "Exclusão automática",
			auditRetentionModeDisabled: "Desativada",
			auditRetentionModeEnabled: "Ativada",
			auditRetentionDaysLabel: "Excluir logs com mais de",
			auditRetentionHint:
				"Quando ativado, os logs antigos serão removidos automaticamente conforme a janela selecionada.",
			auditRetentionSave: "Salvar retenção",
			auditRetentionSaved: "Política de retenção atualizada.",
			auditRetentionLoadError: "Falha ao carregar política de retenção.",
			auditRetentionUpdateError: "Falha ao atualizar política de retenção.",
			idleLockCardTitle: "Proteção por inatividade",
			idleLockCardDescription:
				"Ative bloqueio automático do workspace após período de inatividade.",
			idleLockModeLabel: "Status da proteção",
			idleLockModeDisabled: "Desativada",
			idleLockModeEnabled: "Ativada",
			idleLockTimeoutLabel: "Minutos de inatividade para bloquear",
			idleLockTimeoutHint: "Intervalo permitido: {min} a {max} minutos.",
			idleLockUnlockLabel: "Ao desbloquear sessão",
			idleLockUnlockPassword: "Pedir senha para continuar",
			idleLockUnlockContinue: "Continuar sem senha",
			idleLockSave: "Salvar proteção",
			idleLockSaved: "Proteção por inatividade atualizada.",
			idleLockLoadError: "Falha ao carregar proteção de inatividade.",
			idleLockUpdateError: "Falha ao atualizar proteção de inatividade.",
		},
	},
	en: {
		shell: {
			productName: "Multi Account AI Control",
			loggedInAs: "Logged in as",
			nav: {
				dashboard: "Dashboard",
				providers: "Providers",
				accounts: "Accounts",
				data: "Data",
				audit: "Audit",
				settings: "Settings",
				about: "About",
			},
			actions: {
				logout: "Logout",
				lock: "Lock",
				openMenu: "Open menu",
				closeMenu: "Close menu",
			},
		},
		pages: {
			dashboard: {
				title: "Operational Dashboard",
				description:
					"Live command view for quota, reset windows, and account health.",
			},
			providers: {
				title: "Providers",
				description:
					"Manage provider catalog, connector strategy, and lifecycle status.",
			},
			accounts: {
				title: "Accounts",
				description:
					"Register, filter, and operate account inventory with masked secrets.",
			},
			data: {
				title: "Data Operations",
				description:
					"Import, export, and restore workflows with audit traceability.",
			},
			audit: {
				title: "Audit Log",
				description:
					"Global operational traceability across auth, accounts, usage, notes, and data operations.",
			},
			settings: {
				title: "Settings",
				description:
					"Adjust profile, interface language, and system user management.",
			},
			about: {
				title: "About the System",
				description:
					"Understand the principles, security, and evolution of Multi Account AI Control.",
			},
		},
		footer: {
			designedBy: "Designed by",
		},
		login: {
			localAuth: "Local auth",
			title: "Multi Account AI Control",
			badge: "Local-first secure access",
			identifierLabel: "Username or email",
			identifierPlaceholder: "admin or admin@local",
			passwordLabel: "Password",
			errorInvalidCredentials: "Invalid credentials.",
			errorLoginFailed: "Login failed. Please try again.",
			submit: "Sign in",
			submitting: "Signing in...",
			forgotPassword: "Forgot password",
			resetRequestTitle: "Recover access by email",
			resetRequestDescription:
				"Enter your account email to receive a secure reset link.",
			resetRequestEmailLabel: "Account email",
			resetRequestSubmit: "Send reset link",
			resetRequestSubmitting: "Sending...",
			resetRequestSuccess:
				"If the email exists, a password reset link has been sent.",
			resetRequestError: "Unable to send password reset email right now.",
			resetTitle: "Reset password",
			resetSubtitle: "Set a new password to recover access to the system.",
			resetPasswordLabel: "New password",
			resetConfirmPasswordLabel: "Confirm new password",
			resetPasswordPlaceholder: "At least 12 characters",
			resetSubmit: "Save new password",
			resetSubmitting: "Saving...",
			resetSuccess: "Password reset completed. Please sign in again.",
			resetBackToLogin: "Back to login",
			resetMissingToken: "Missing or invalid reset token.",
			resetPasswordsMismatch: "Passwords do not match.",
			resetErrorGeneric: "Failed to reset password.",
		},
		idleLock: {
			badgeLabel: "Idle Protection",
			title: "Session locked",
			subtitle: "Re-enter your password to unlock this workspace.",
			subtitleNoPassword:
				"Session paused due to inactivity. Continue to resume workspace access.",
			timeoutLabel: "Locks after {minutes} min of inactivity",
			passwordPlaceholder: "Account password",
			errorExpired: "Session expired or invalid credentials.",
			errorGeneric: "Failed to unlock session.",
			unlock: "Unlock",
			unlocking: "Unlocking...",
			continue: "Continue session",
			continuing: "Validating session...",
			logout: "Logout",
		},
		settings: {
			profileCardTitle: "Profile",
			profileCardDescription:
				"Update email, password, and interface language for the current user.",
			emailLabel: "Email",
			passwordLabel: "New password (optional)",
			passwordPlaceholder: "At least 12 characters",
			languageLabel: "Language",
			saveProfile: "Save profile",
			saving: "Saving...",
			profileSaved: "Profile updated successfully.",
			usersCardTitle: "Users",
			usersCardDescription:
				"Create and manage users. The protected admin cannot be deleted and does not allow username changes.",
			createUserTitle: "Add user",
			usernameLabel: "Username",
			userRoleLabel: "Role",
			userStatusLabel: "Status",
			activeStatus: "Active",
			inactiveStatus: "Inactive",
			createUser: "Create user",
			usersTableTitle: "Registered users",
			usersTableEmail: "Email",
			usersTableRole: "Role",
			usersTableLocale: "Language",
			usersTableStatus: "Status",
			usersTableProtected: "Protected admin",
			usersTableActions: "Actions",
			protectedYes: "Yes",
			protectedNo: "No",
			actionSave: "Save",
			actionDelete: "Delete",
			actionDeleting: "Deleting...",
			loadError: "Failed to load users.",
			createSuccess: "User created successfully.",
			updateSuccess: "User updated successfully.",
			deleteSuccess: "User deleted successfully.",
			forbidden: "Only administrators can manage users.",
			cannotDeleteSelf: "You cannot delete your own user.",
			auditRetentionCardTitle: "Audit log retention",
			auditRetentionCardDescription:
				"Control automatic deletion to avoid excessive growth of audit history.",
			auditRetentionModeLabel: "Automatic deletion",
			auditRetentionModeDisabled: "Disabled",
			auditRetentionModeEnabled: "Enabled",
			auditRetentionDaysLabel: "Delete logs older than",
			auditRetentionHint:
				"When enabled, old logs are automatically removed according to the selected window.",
			auditRetentionSave: "Save retention",
			auditRetentionSaved: "Retention policy updated.",
			auditRetentionLoadError: "Failed to load retention policy.",
			auditRetentionUpdateError: "Failed to update retention policy.",
			idleLockCardTitle: "Idle protection",
			idleLockCardDescription:
				"Enable automatic workspace lock after inactivity.",
			idleLockModeLabel: "Protection status",
			idleLockModeDisabled: "Disabled",
			idleLockModeEnabled: "Enabled",
			idleLockTimeoutLabel: "Idle minutes before lock",
			idleLockTimeoutHint: "Allowed interval: {min} to {max} minutes.",
			idleLockUnlockLabel: "When unlocking session",
			idleLockUnlockPassword: "Require password to continue",
			idleLockUnlockContinue: "Continue without password",
			idleLockSave: "Save protection",
			idleLockSaved: "Idle protection updated.",
			idleLockLoadError: "Failed to load idle protection.",
			idleLockUpdateError: "Failed to update idle protection.",
		},
	},
};

const ptPtDictionary: AppDictionary = {
	...dictionaryByLocale.pt_BR,
	shell: {
		...dictionaryByLocale.pt_BR.shell,
		loggedInAs: "Sessão iniciada como",
		nav: {
			...dictionaryByLocale.pt_BR.shell.nav,
			settings: "Definições",
		},
	},
	pages: {
		...dictionaryByLocale.pt_BR.pages,
		settings: {
			title: "Definições",
			description:
				"Ajuste o perfil, o idioma da interface e a gestão de utilizadores do sistema.",
		},
	},
	footer: {
		designedBy: "Concebido por",
	},
	login: {
		...dictionaryByLocale.pt_BR.login,
		forgotPassword: "Esqueci-me da palavra-passe",
		resetRequestSubmit: "Enviar ligação de recuperação",
		resetBackToLogin: "Voltar ao início de sessão",
	},
	settings: {
		...dictionaryByLocale.pt_BR.settings,
		usersCardTitle: "Utilizadores",
		createUserTitle: "Adicionar utilizador",
		saveProfile: "Guardar perfil",
		actionSave: "Guardar",
		actionDelete: "Eliminar",
		actionDeleting: "A eliminar...",
		auditRetentionDaysLabel: "Eliminar registos com mais de",
		auditRetentionSave: "Guardar retenção",
		idleLockSave: "Guardar proteção",
	},
};

const esDictionary: AppDictionary = {
	...dictionaryByLocale.en,
	shell: {
		...dictionaryByLocale.en.shell,
		loggedInAs: "Sesión iniciada como",
		nav: {
			dashboard: "Panel",
			providers: "Proveedores",
			accounts: "Cuentas",
			data: "Datos",
			audit: "Auditoría",
			settings: "Configuración",
			about: "Acerca de",
		},
		actions: {
			logout: "Cerrar sesión",
			lock: "Bloquear",
			openMenu: "Abrir menú",
			closeMenu: "Cerrar menú",
		},
	},
	pages: {
		dashboard: {
			title: "Panel Operativo",
			description:
				"Vista de mando en tiempo real para cuota, ventanas de reinicio y estado de las cuentas.",
		},
		providers: {
			title: "Proveedores",
			description:
				"Gestiona el catálogo de proveedores, estrategia de conectores y estado del ciclo de vida.",
		},
		accounts: {
			title: "Cuentas",
			description:
				"Registra, filtra y opera el inventario de cuentas con secretos enmascarados.",
		},
		data: {
			title: "Operaciones de Datos",
			description:
				"Flujos de importación, exportación y restauración con trazabilidad de auditoría.",
		},
		audit: {
			title: "Registro de Auditoría",
			description:
				"Trazabilidad operacional global en autenticación, cuentas, uso, notas y operaciones de datos.",
		},
		settings: {
			title: "Configuración",
			description:
				"Ajusta perfil, idioma de la interfaz y gestión de usuarios del sistema.",
		},
		about: {
			title: "Acerca del Sistema",
			description:
				"Conoce los principios, seguridad y evolución de Multi Account AI Control.",
		},
	},
	footer: {
		designedBy: "Diseñado por",
	},
	login: {
		localAuth: "Autenticación local",
		title: "Multi Account AI Control",
		badge: "Acceso seguro local-first",
		identifierLabel: "Usuario o correo",
		identifierPlaceholder: "admin o admin@local",
		passwordLabel: "Contraseña",
		errorInvalidCredentials: "Credenciales inválidas.",
		errorLoginFailed: "Error de inicio de sesión. Inténtalo de nuevo.",
		submit: "Iniciar sesión",
		submitting: "Iniciando...",
		forgotPassword: "Olvidé mi contraseña",
		resetRequestTitle: "Recuperar acceso por correo",
		resetRequestDescription:
			"Introduce el correo de tu cuenta para recibir un enlace seguro de restablecimiento.",
		resetRequestEmailLabel: "Correo de la cuenta",
		resetRequestSubmit: "Enviar enlace de recuperación",
		resetRequestSubmitting: "Enviando...",
		resetRequestSuccess:
			"Si el correo existe, se ha enviado un enlace de restablecimiento.",
		resetRequestError:
			"No se pudo enviar el correo de restablecimiento en este momento.",
		resetTitle: "Restablecer contraseña",
		resetSubtitle:
			"Define una nueva contraseña para recuperar el acceso al sistema.",
		resetPasswordLabel: "Nueva contraseña",
		resetConfirmPasswordLabel: "Confirmar nueva contraseña",
		resetPasswordPlaceholder: "Mínimo 12 caracteres",
		resetSubmit: "Guardar nueva contraseña",
		resetSubmitting: "Guardando...",
		resetSuccess:
			"Contraseña restablecida correctamente. Inicia sesión nuevamente.",
		resetBackToLogin: "Volver al inicio de sesión",
		resetMissingToken: "Token de restablecimiento ausente o inválido.",
		resetPasswordsMismatch: "Las contraseñas no coinciden.",
		resetErrorGeneric: "Error al restablecer la contraseña.",
	},
	idleLock: {
		badgeLabel: "Protección por Inactividad",
		title: "Sesión bloqueada",
		subtitle:
			"Vuelve a introducir tu contraseña para desbloquear este espacio de trabajo.",
		subtitleNoPassword:
			"Sesión pausada por inactividad. Continúa para retomar el acceso.",
		timeoutLabel: "Bloquea después de {minutes} min de inactividad",
		passwordPlaceholder: "Contraseña de la cuenta",
		errorExpired: "Sesión expirada o credenciales inválidas.",
		errorGeneric: "No se pudo desbloquear la sesión.",
		unlock: "Desbloquear",
		unlocking: "Desbloqueando...",
		continue: "Continuar sesión",
		continuing: "Validando sesión...",
		logout: "Cerrar sesión",
	},
	settings: {
		profileCardTitle: "Perfil",
		profileCardDescription:
			"Actualiza correo, contraseña e idioma de la interfaz para el usuario actual.",
		emailLabel: "Correo",
		passwordLabel: "Nueva contraseña (opcional)",
		passwordPlaceholder: "Mínimo 12 caracteres",
		languageLabel: "Idioma",
		saveProfile: "Guardar perfil",
		saving: "Guardando...",
		profileSaved: "Perfil actualizado correctamente.",
		usersCardTitle: "Usuarios",
		usersCardDescription:
			"Crea y gestiona usuarios. El admin protegido no se puede eliminar y no permite cambiar el nombre de usuario.",
		createUserTitle: "Agregar usuario",
		usernameLabel: "Nombre de usuario",
		userRoleLabel: "Rol",
		userStatusLabel: "Estado",
		activeStatus: "Activo",
		inactiveStatus: "Inactivo",
		createUser: "Crear usuario",
		usersTableTitle: "Usuarios registrados",
		usersTableEmail: "Correo",
		usersTableRole: "Rol",
		usersTableLocale: "Idioma",
		usersTableStatus: "Estado",
		usersTableProtected: "Admin protegido",
		usersTableActions: "Acciones",
		protectedYes: "Sí",
		protectedNo: "No",
		actionSave: "Guardar",
		actionDelete: "Eliminar",
		actionDeleting: "Eliminando...",
		loadError: "Error al cargar usuarios.",
		createSuccess: "Usuario creado correctamente.",
		updateSuccess: "Usuario actualizado correctamente.",
		deleteSuccess: "Usuario eliminado correctamente.",
		forbidden: "Solo los administradores pueden gestionar usuarios.",
		cannotDeleteSelf: "No puedes eliminar tu propio usuario.",
		auditRetentionCardTitle: "Retención de auditoría",
		auditRetentionCardDescription:
			"Controla la eliminación automática para evitar crecimiento excesivo del historial.",
		auditRetentionModeLabel: "Eliminación automática",
		auditRetentionModeDisabled: "Desactivada",
		auditRetentionModeEnabled: "Activada",
		auditRetentionDaysLabel: "Eliminar registros con más de",
		auditRetentionHint:
			"Cuando está activada, los registros antiguos se eliminan automáticamente según la ventana seleccionada.",
		auditRetentionSave: "Guardar retención",
		auditRetentionSaved: "Política de retención actualizada.",
		auditRetentionLoadError: "Error al cargar la política de retención.",
		auditRetentionUpdateError: "Error al actualizar la política de retención.",
		idleLockCardTitle: "Protección por inactividad",
		idleLockCardDescription:
			"Activa el bloqueo automático del workspace tras inactividad.",
		idleLockModeLabel: "Estado de la protección",
		idleLockModeDisabled: "Desactivada",
		idleLockModeEnabled: "Activada",
		idleLockTimeoutLabel: "Minutos de inactividad para bloquear",
		idleLockTimeoutHint: "Intervalo permitido: {min} a {max} minutos.",
		idleLockUnlockLabel: "Al desbloquear sesión",
		idleLockUnlockPassword: "Solicitar contraseña para continuar",
		idleLockUnlockContinue: "Continuar sin contraseña",
		idleLockSave: "Guardar protección",
		idleLockSaved: "Protección por inactividad actualizada.",
		idleLockLoadError: "Error al cargar la protección por inactividad.",
		idleLockUpdateError: "Error al actualizar la protección por inactividad.",
	},
};

const zhCnDictionary: AppDictionary = {
	...dictionaryByLocale.en,
	shell: {
		...dictionaryByLocale.en.shell,
		loggedInAs: "当前登录用户",
		nav: {
			dashboard: "仪表盘",
			providers: "服务商",
			accounts: "账号",
			data: "数据",
			audit: "审计",
			settings: "设置",
			about: "关于",
		},
		actions: {
			logout: "退出登录",
			lock: "锁定",
			openMenu: "打开菜单",
			closeMenu: "关闭菜单",
		},
	},
	pages: {
		dashboard: {
			title: "运营仪表盘",
			description: "实时查看配额、重置窗口和账号健康状态。",
		},
		providers: {
			title: "服务商",
			description: "管理服务商目录、连接器策略和生命周期状态。",
		},
		accounts: {
			title: "账号",
			description: "登记、筛选并管理账号清单，敏感信息默认脱敏。",
		},
		data: {
			title: "数据操作",
			description: "支持导入、导出与恢复，并保留审计追踪。",
		},
		audit: {
			title: "审计日志",
			description: "覆盖认证、账号、用量、备注和数据操作的全局追踪。",
		},
		settings: {
			title: "设置",
			description: "调整个人资料、界面语言和系统用户管理。",
		},
		about: {
			title: "关于系统",
			description: "了解 Multi Account AI Control 的原则、安全与演进。",
		},
	},
	footer: {
		designedBy: "设计方",
	},
	login: {
		localAuth: "本地认证",
		title: "Multi Account AI Control",
		badge: "本地优先的安全访问",
		identifierLabel: "用户名或邮箱",
		identifierPlaceholder: "admin 或 admin@local",
		passwordLabel: "密码",
		errorInvalidCredentials: "凭据无效。",
		errorLoginFailed: "登录失败，请重试。",
		submit: "登录",
		submitting: "登录中...",
		forgotPassword: "忘记密码",
		resetRequestTitle: "通过邮箱找回访问权限",
		resetRequestDescription: "输入账号邮箱以接收安全的重置链接。",
		resetRequestEmailLabel: "账号邮箱",
		resetRequestSubmit: "发送重置链接",
		resetRequestSubmitting: "发送中...",
		resetRequestSuccess: "如果邮箱存在，重置链接已发送。",
		resetRequestError: "当前无法发送重置邮件。",
		resetTitle: "重置密码",
		resetSubtitle: "设置新密码以恢复系统访问。",
		resetPasswordLabel: "新密码",
		resetConfirmPasswordLabel: "确认新密码",
		resetPasswordPlaceholder: "至少 12 个字符",
		resetSubmit: "保存新密码",
		resetSubmitting: "保存中...",
		resetSuccess: "密码重置成功，请重新登录。",
		resetBackToLogin: "返回登录",
		resetMissingToken: "缺少或无效的重置令牌。",
		resetPasswordsMismatch: "两次输入的密码不一致。",
		resetErrorGeneric: "重置密码失败。",
	},
	idleLock: {
		badgeLabel: "空闲保护",
		title: "会话已锁定",
		subtitle: "请重新输入密码以解锁当前工作区。",
		subtitleNoPassword: "由于空闲已暂停会话，继续即可恢复访问。",
		timeoutLabel: "空闲 {minutes} 分钟后自动锁定",
		passwordPlaceholder: "账号密码",
		errorExpired: "会话已过期或凭据无效。",
		errorGeneric: "会话解锁失败。",
		unlock: "解锁",
		unlocking: "解锁中...",
		continue: "继续会话",
		continuing: "正在验证会话...",
		logout: "退出登录",
	},
	settings: {
		profileCardTitle: "个人资料",
		profileCardDescription: "更新当前用户的邮箱、密码和界面语言。",
		emailLabel: "邮箱",
		passwordLabel: "新密码（可选）",
		passwordPlaceholder: "至少 12 个字符",
		languageLabel: "语言",
		saveProfile: "保存资料",
		saving: "保存中...",
		profileSaved: "资料更新成功。",
		usersCardTitle: "用户",
		usersCardDescription:
			"创建和管理用户。受保护管理员不可删除且不允许修改用户名。",
		createUserTitle: "添加用户",
		usernameLabel: "用户名",
		userRoleLabel: "角色",
		userStatusLabel: "状态",
		activeStatus: "启用",
		inactiveStatus: "停用",
		createUser: "创建用户",
		usersTableTitle: "已注册用户",
		usersTableEmail: "邮箱",
		usersTableRole: "角色",
		usersTableLocale: "语言",
		usersTableStatus: "状态",
		usersTableProtected: "受保护管理员",
		usersTableActions: "操作",
		protectedYes: "是",
		protectedNo: "否",
		actionSave: "保存",
		actionDelete: "删除",
		actionDeleting: "删除中...",
		loadError: "加载用户失败。",
		createSuccess: "用户创建成功。",
		updateSuccess: "用户更新成功。",
		deleteSuccess: "用户删除成功。",
		forbidden: "仅管理员可管理用户。",
		cannotDeleteSelf: "不能删除当前登录用户。",
		auditRetentionCardTitle: "审计日志保留",
		auditRetentionCardDescription: "控制自动清理，避免日志历史过度增长。",
		auditRetentionModeLabel: "自动清理",
		auditRetentionModeDisabled: "关闭",
		auditRetentionModeEnabled: "开启",
		auditRetentionDaysLabel: "删除超过以下天数的日志",
		auditRetentionHint: "开启后将按所选窗口自动清理旧日志。",
		auditRetentionSave: "保存保留策略",
		auditRetentionSaved: "保留策略已更新。",
		auditRetentionLoadError: "加载保留策略失败。",
		auditRetentionUpdateError: "更新保留策略失败。",
		idleLockCardTitle: "空闲保护",
		idleLockCardDescription: "空闲后自动锁定工作区。",
		idleLockModeLabel: "保护状态",
		idleLockModeDisabled: "关闭",
		idleLockModeEnabled: "开启",
		idleLockTimeoutLabel: "锁定前空闲分钟数",
		idleLockTimeoutHint: "允许范围：{min} 到 {max} 分钟。",
		idleLockUnlockLabel: "解锁会话时",
		idleLockUnlockPassword: "继续前要求输入密码",
		idleLockUnlockContinue: "无需密码直接继续",
		idleLockSave: "保存保护设置",
		idleLockSaved: "空闲保护已更新。",
		idleLockLoadError: "加载空闲保护失败。",
		idleLockUpdateError: "更新空闲保护失败。",
	},
};

export function isPortugueseLocale(locale: AppLocale): boolean {
	return locale === "pt_BR" || locale === "pt_PT";
}

export function pickLocaleText(
	locale: AppLocale,
	copy: {
		pt: string;
		en: string;
		es?: string;
		zhCN?: string;
	},
): string {
	if (isPortugueseLocale(locale)) {
		return copy.pt;
	}
	if (locale === "es") {
		return copy.es ?? copy.en;
	}
	if (locale === "zh_CN") {
		return copy.zhCN ?? copy.en;
	}
	return copy.en;
}

export function getDictionary(locale: AppLocale): AppDictionary {
	if (locale === "pt_BR") {
		return dictionaryByLocale.pt_BR;
	}
	if (locale === "pt_PT") {
		return ptPtDictionary;
	}
	if (locale === "es") {
		return esDictionary;
	}
	if (locale === "zh_CN") {
		return zhCnDictionary;
	}
	return dictionaryByLocale.en;
}
