import bcrypt from "bcryptjs";
import {
  PrismaClient,
  ProviderConnectorType,
  UserLocale,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_BCRYPT_SALT_ROUNDS = 12;
const rawBcryptSaltRounds = process.env.BCRYPT_SALT_ROUNDS?.trim();
const parsedBcryptSaltRounds =
  rawBcryptSaltRounds && rawBcryptSaltRounds.length > 0
    ? (() => {
        const parsed = Number.parseInt(rawBcryptSaltRounds, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      })()
    : undefined;
const BCRYPT_SALT_ROUNDS =
  parsedBcryptSaltRounds !== undefined &&
  Number.isInteger(parsedBcryptSaltRounds) &&
  parsedBcryptSaltRounds >= 4 &&
  parsedBcryptSaltRounds <= 31
    ? parsedBcryptSaltRounds
    : DEFAULT_BCRYPT_SALT_ROUNDS;

const providerSeeds = [
  {
    name: "OpenAI / ChatGPT",
    slug: "openai-chatgpt",
    connectorType: ProviderConnectorType.manual,
    color: "#0EA5E9",
    description: "OpenAI provider profiles and account controls.",
  },
  {
    name: "Google / Gemini",
    slug: "google-gemini",
    connectorType: ProviderConnectorType.manual,
    color: "#10B981",
    description: "Gemini account and quota tracking.",
  },
  {
    name: "Anthropic / Claude",
    slug: "anthropic-claude",
    connectorType: ProviderConnectorType.manual,
    color: "#F59E0B",
    description: "Claude account and plan management.",
  },
  {
    name: "Custom",
    slug: "custom",
    connectorType: ProviderConnectorType.custom_script,
    color: "#3B82F6",
    description: "Custom internal provider definitions.",
  },
  {
    name: "Other",
    slug: "other",
    connectorType: ProviderConnectorType.manual,
    color: "#6B7280",
    description: "Catch-all provider for misc accounts.",
  },
];

type AdminBaseData = {
  username: string;
  email: string;
  role: UserRole;
  locale: UserLocale;
  isActive: boolean;
  isSystemAdmin: boolean;
};

type AdminUpdateData = AdminBaseData & { passwordHash?: string };

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function resolveSeedAdminLocale(): UserLocale {
  const localeFromEnv = process.env.SEED_ADMIN_LOCALE?.trim();
  if (!localeFromEnv) {
    return UserLocale.pt_BR;
  }

  const normalizedLocale = localeFromEnv.replace("-", "_");
  const allowedLocales = Object.values(UserLocale) as string[];
  if (allowedLocales.includes(normalizedLocale)) {
    return normalizedLocale as UserLocale;
  }

  throw new Error(
    `SEED_ADMIN_LOCALE must be one of: ${allowedLocales.join(", ")}.`,
  );
}

function validateAdminPasswordOrThrow(password: string): void {
  if (password.length < 12) {
    throw new Error("Admin password must have at least 12 characters.");
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    throw new Error(
      "Admin password must include uppercase, lowercase, number, and special character.",
    );
  }
}

function buildAdminBaseData(
  username: string,
  email: string,
  locale: UserLocale,
): AdminBaseData {
  return {
    username,
    email,
    role: UserRole.admin,
    locale,
    isActive: true,
    isSystemAdmin: true,
  };
}

async function main() {
  await Promise.all(
    providerSeeds.map((provider) =>
      prisma.provider.upsert({
        where: { slug: provider.slug },
        update: {
          name: provider.name,
          connectorType: provider.connectorType,
          color: provider.color,
          description: provider.description,
          isActive: true,
        },
        create: { ...provider, isActive: true },
      }),
    ),
  );

  await Promise.all([
    prisma.appSetting.upsert({
      where: { key: "ui.theme.default" },
      update: { valueJson: { mode: "system" } },
      create: {
        key: "ui.theme.default",
        valueJson: { mode: "system" },
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "ui.locale.default" },
      update: { valueJson: { locale: "pt_BR" } },
      create: {
        key: "ui.locale.default",
        valueJson: { locale: "pt_BR" },
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "audit.log.retention" },
      update: { valueJson: { enabled: false, days: null } },
      create: {
        key: "audit.log.retention",
        valueJson: { enabled: false, days: null },
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "security.idle_lock" },
      update: {
        valueJson: {
          enabled: false,
          timeoutMinutes: 10,
          requirePasswordOnUnlock: true,
        },
      },
      create: {
        key: "security.idle_lock",
        valueJson: {
          enabled: false,
          timeoutMinutes: 10,
          requirePasswordOnUnlock: true,
        },
      },
    }),
  ]);

  const defaultAdminUsername = "admin";
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD?.trim();
  const defaultAdminLocale = resolveSeedAdminLocale();
  const shouldUpdateAdminPassword = parseBooleanFlag(
    process.env.SEED_UPDATE_ADMIN_PASSWORD,
  );

  if (!defaultAdminEmail) {
    throw new Error(
      "DEFAULT_ADMIN_EMAIL environment variable must be set and non-empty before running seeds.",
    );
  }

  if (!defaultAdminPassword) {
    throw new Error(
      "DEFAULT_ADMIN_PASSWORD environment variable must be set and non-empty before running seeds.",
    );
  }

  const adminBaseData = buildAdminBaseData(
    defaultAdminUsername,
    defaultAdminEmail,
    defaultAdminLocale,
  );

  validateAdminPasswordOrThrow(defaultAdminPassword);

  const existingUserByUsername = await prisma.user.findUnique({
    where: { username: defaultAdminUsername },
    select: { id: true, isSystemAdmin: true, username: true, email: true },
  });

  if (existingUserByUsername && !existingUserByUsername.isSystemAdmin) {
    throw new Error(
      `Cannot bootstrap system admin: username '${defaultAdminUsername}' already exists for a non-system-admin user (id='${existingUserByUsername.id}'). Resolve this conflict manually.`,
    );
  }

  const usernameUserIsSystemAdmin =
    existingUserByUsername?.isSystemAdmin === true;
  let existingSystemAdmin: { id: string } | null = null;

  if (!usernameUserIsSystemAdmin) {
    existingSystemAdmin = await prisma.user.findFirst({
      where: { isSystemAdmin: true },
      orderBy: { id: "asc" },
      select: { id: true },
    });
  }

  // Prefer the system admin that already owns the bootstrap username.
  // Otherwise, fall back to the oldest system admin ID for deterministic updates.
  // Note: if `existingUserByUsername` exists but is not a system admin, we
  // throw above as a conflict, so this fallback only applies when no username
  // match exists.
  const targetSystemAdminId =
    usernameUserIsSystemAdmin
      ? existingUserByUsername.id
      : existingSystemAdmin?.id;

  if (targetSystemAdminId) {
    // Always reconcile bootstrap profile fields (username/email/role/locale/state)
    // for the system admin. Password hash rotation is optional and only happens
    // when explicitly requested via SEED_UPDATE_ADMIN_PASSWORD.
    const updateData: AdminUpdateData = {
      ...adminBaseData,
      ...(shouldUpdateAdminPassword
        ? {
            passwordHash: await bcrypt.hash(
              defaultAdminPassword,
              BCRYPT_SALT_ROUNDS,
            ),
          }
        : {}),
    };

    await prisma.user.update({
      where: { id: targetSystemAdminId },
      data: updateData,
    });
  } else {
    const passwordHash = await bcrypt.hash(
      defaultAdminPassword,
      BCRYPT_SALT_ROUNDS,
    );

    await prisma.user.create({
      data: {
        ...adminBaseData,
        passwordHash,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
