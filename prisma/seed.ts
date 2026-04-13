import bcrypt from "bcryptjs";
import {
  PrismaClient,
  ProviderConnectorType,
  UserLocale,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_BCRYPT_SALT_ROUNDS = 12;
const parsedBcryptSaltRounds = Number.parseInt(
  process.env.BCRYPT_SALT_ROUNDS ?? "",
  10,
);
const BCRYPT_SALT_ROUNDS =
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
    throw new Error("DEFAULT_ADMIN_PASSWORD must have at least 12 characters.");
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    throw new Error(
      "DEFAULT_ADMIN_PASSWORD must include uppercase, lowercase, number, and special character.",
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
  const defaultAdminEmail =
    process.env.DEFAULT_ADMIN_EMAIL?.trim() || "admin@local";
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD?.trim();
  const defaultAdminLocale = resolveSeedAdminLocale();
  const shouldUpdateAdminPassword = parseBooleanFlag(
    process.env.SEED_UPDATE_ADMIN_PASSWORD,
  );
  const adminBaseData = buildAdminBaseData(
    defaultAdminUsername,
    defaultAdminEmail,
    defaultAdminLocale,
  );

  if (!defaultAdminPassword) {
    throw new Error(
      "DEFAULT_ADMIN_PASSWORD must be set to a non-empty value before running seeds.",
    );
  }

  validateAdminPasswordOrThrow(defaultAdminPassword);

  const [existingSystemAdmins, existingAdminUsernameUser] = await Promise.all([
    prisma.user.findMany({
      where: { isSystemAdmin: true },
      orderBy: { id: "asc" },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { username: defaultAdminUsername },
      select: { id: true, isSystemAdmin: true },
    }),
  ]);

  if (existingAdminUsernameUser && !existingAdminUsernameUser.isSystemAdmin) {
    throw new Error(
      `Cannot bootstrap system admin: username '${defaultAdminUsername}' already exists for a non-system-admin user (id='${existingAdminUsernameUser.id}'). Resolve this conflict manually.`,
    );
  }

  // Prefer the system admin that already owns the bootstrap username.
  // Otherwise, fall back to the oldest system admin ID for deterministic updates.
  const targetSystemAdminId =
    existingAdminUsernameUser?.isSystemAdmin === true
      ? existingAdminUsernameUser.id
      : existingSystemAdmins[0]?.id;

  if (targetSystemAdminId) {
    // Always reconcile bootstrap profile fields (username/email/role/locale/state)
    // for the system admin. Password hash rotation is optional and only happens
    // when explicitly requested via SEED_UPDATE_ADMIN_PASSWORD.
    const updateData: AdminUpdateData = {
      ...adminBaseData,
    };
    if (shouldUpdateAdminPassword) {
      updateData.passwordHash = await bcrypt.hash(
        defaultAdminPassword,
        BCRYPT_SALT_ROUNDS,
      );
    }

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
