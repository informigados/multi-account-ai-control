import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  ProviderConnectorType,
  UserLocale,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();
// Minimum length requirement helps reduce weak-password risk and
// aligns with modern baseline guidance.
const MIN_ADMIN_PASSWORD_LENGTH = 12;
// RFC 5321: maximum mailbox length is 254 characters.
const MAX_EMAIL_LENGTH = 254;
const DEFAULT_SEED_ADMIN_LOCALE: UserLocale = resolveDefaultSeedAdminLocale();
const DEFAULT_BCRYPT_SALT_ROUNDS = 12;
// At most two users can be returned by username/email lookup:
// one matching username and another matching email (or one matching both).
const MAX_EXPECTED_USERS_BY_USERNAME_OR_EMAIL = 2;
// RFC 5322-inspired "atext" subset used for dot-atom local-part validation.
const EMAIL_LOCAL_PART_ATEXT_CLASS = "A-Za-z0-9!#$%&'*+/=?^_`{|}~-";
const EMAIL_LOCAL_PART_PATTERN = new RegExp(
  `^[${EMAIL_LOCAL_PART_ATEXT_CLASS}]+(?:\\.[${EMAIL_LOCAL_PART_ATEXT_CLASS}]+)*$`,
);
// Explicit list of special characters accepted by the admin
// password policy. Keeping this as data improves readability
// and makes future policy updates safer.
const ALLOWED_PASSWORD_SPECIAL_CHARACTERS =
  "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";
const PASSWORD_SPECIAL_CHAR_REGEX = new RegExp(
  `[${escapeForRegexCharacterClass(ALLOWED_PASSWORD_SPECIAL_CHARACTERS)}]`,
);
const BCRYPT_SALT_ROUNDS = resolveBcryptSaltRounds();

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
    description: "Catch-all provider for miscellaneous accounts.",
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
type ExistingUserLookup = {
  id: string;
  username: string;
  email: string;
  isSystemAdmin: boolean;
};
const USER_CONFLICT_CHECK_SELECT = {
  // id: used for identity/ownership comparisons when matching records.
  id: true,
  // username/email: used for uniqueness conflict detection.
  username: true,
  email: true,
  // isSystemAdmin: used to ensure matched users are valid admin candidates.
  isSystemAdmin: true,
} satisfies Prisma.UserSelect;

type AdminUpdateData = AdminBaseData & { passwordHash?: string };
const SEED_TROUBLESHOOTING_STEPS = [
  "- Verify required environment variables are set (e.g., DATABASE_URL, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD).",
  "- Ensure the database is reachable and credentials in DATABASE_URL are correct.",
  "- Ensure Prisma schema changes are applied (try: `npx prisma migrate deploy` or `npx prisma db push`).",
] as const;

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function escapeForRegexCharacterClass(value: string): string {
  return value.replace(/[[\]\\^-]/g, "\\$&");
}

function parseSaltRounds(rawValue: string | undefined): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsedSaltRounds = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsedSaltRounds) ? undefined : parsedSaltRounds;
}

function resolveBcryptSaltRounds(): number {
  const rawBcryptSaltRounds = process.env.BCRYPT_SALT_ROUNDS?.trim();
  const parsedBcryptSaltRounds = parseSaltRounds(rawBcryptSaltRounds);

  return parsedBcryptSaltRounds !== undefined &&
    Number.isInteger(parsedBcryptSaltRounds) &&
    parsedBcryptSaltRounds >= 4 &&
    parsedBcryptSaltRounds <= 31
    ? parsedBcryptSaltRounds
    : DEFAULT_BCRYPT_SALT_ROUNDS;
}

function sanitizeCredentialEnvValue(
  value: string | undefined,
  envName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  // Reject null bytes and ASCII control characters to avoid unsafe parsing.
  if (/[\u0000-\u001F\u007F]/.test(trimmedValue)) {
    throw new Error(`${envName} contains invalid control characters.`);
  }

  return trimmedValue;
}

function normalizeLocaleEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim().replace(/-/g, "_");
  if (normalizedValue.length === 0) {
    return undefined;
  }

  // Reject values composed only of underscores (for example "__"),
  // including values that become underscores after "-" normalization.
  if (normalizedValue.replace(/_/g, "").length === 0) {
    return undefined;
  }

  return normalizedValue;
}

function resolveDefaultSeedAdminLocale(): UserLocale {
  const allowedLocales = Object.values(UserLocale) as UserLocale[];
  const normalizedDefaultLocale = normalizeLocaleEnvValue(
    process.env.SEED_ADMIN_DEFAULT_LOCALE,
  );

  if (normalizedDefaultLocale) {
    if (allowedLocales.includes(normalizedDefaultLocale as UserLocale)) {
      return normalizedDefaultLocale as UserLocale;
    }

    throw new Error(
      `SEED_ADMIN_DEFAULT_LOCALE must be one of: ${allowedLocales.join(", ")}.`,
    );
  }

  const [firstLocale] = allowedLocales;
  if (!firstLocale) {
    throw new Error("UserLocale enum must contain at least one locale.");
  }

  return firstLocale;
}

function resolveSeedAdminLocale(): UserLocale {
  const allowedLocales = Object.values(UserLocale) as string[];
  const fallbackLocale = DEFAULT_SEED_ADMIN_LOCALE;

  const normalizedLocale = normalizeLocaleEnvValue(process.env.SEED_ADMIN_LOCALE);
  if (!normalizedLocale) {
    return fallbackLocale as UserLocale;
  }

  if (allowedLocales.includes(normalizedLocale)) {
    return normalizedLocale as UserLocale;
  }

  throw new Error(
    `SEED_ADMIN_LOCALE must be one of: ${allowedLocales.join(", ")}.`,
  );
}

function validateAdminPasswordOrThrow(password: string): void {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `Admin password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long.`,
    );
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = PASSWORD_SPECIAL_CHAR_REGEX.test(password);
  const missingRequirements: string[] = [];
  if (!hasUppercase) {
    missingRequirements.push("uppercase letter");
  }
  if (!hasLowercase) {
    missingRequirements.push("lowercase letter");
  }
  if (!hasDigit) {
    missingRequirements.push("digit");
  }
  if (!hasSpecialChar) {
    missingRequirements.push("special character");
  }

  if (missingRequirements.length > 0) {
    throw new Error(
      `Admin password is missing required character types: ${missingRequirements.join(", ")}.`,
    );
  }
}

function validateAdminEmailOrThrow(email: string): void {
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new Error(
      `DEFAULT_ADMIN_EMAIL email address is too long (max ${MAX_EMAIL_LENGTH} characters).`,
    );
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) {
    throwInvalidAdminEmail("missing or invalid @ separator");
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  if (
    localPart.length === 0 ||
    localPart.length > 64 ||
    domainPart.length === 0 ||
    domainPart.length > 253
  ) {
    throwInvalidAdminEmail("invalid local-part or domain length");
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    localPart.includes("..") ||
    domainPart.includes("..")
  ) {
    throwInvalidAdminEmail("invalid dot placement");
  }

  // RFC 5322-inspired dot-atom local-part validation (practical subset):
  // allows one or more "atext" chars, optionally dot-separated,
  // while preventing leading/trailing or consecutive dots.
  if (!EMAIL_LOCAL_PART_PATTERN.test(localPart)) {
    throwInvalidAdminEmail("invalid local-part characters");
  }

  const domainLabels = domainPart.split(".");
  if (domainLabels.length < 2) {
    throwInvalidAdminEmail("missing top-level domain");
  }

  for (const label of domainLabels) {
    if (!isValidDomainLabel(label)) {
      throwInvalidAdminEmail("invalid domain label");
    }
  }
}

function isValidDomainLabel(label: string): boolean {
  return (
    label.length > 0 &&
    // RFC 1035 §2.3.4: each DNS label must be 63 octets or fewer.
    label.length <= 63 &&
    /^[A-Za-z0-9-]+$/.test(label) &&
    !label.startsWith("-") &&
    !label.endsWith("-")
  );
}

function throwInvalidAdminEmail(reason: string): never {
  throw new Error(
    `DEFAULT_ADMIN_EMAIL must be a valid email address (${reason}; e.g., admin@example.com).`,
  );
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

async function hashAdminPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to hash default admin password using BCRYPT_SALT_ROUNDS=${BCRYPT_SALT_ROUNDS}: ${errorMessage}`,
    );
  }
}

function getConflictingEmailOwnerId(
  userByEmail: ExistingUserLookup | null,
  userByUsername: ExistingUserLookup | null,
): string | null {
  if (!userByEmail) {
    return null;
  }

  if (!userByUsername || userByEmail.id !== userByUsername.id) {
    return userByEmail.id;
  }

  return null;
}

async function main() {
  const defaultAdminUsername =
    sanitizeCredentialEnvValue(
      process.env.DEFAULT_ADMIN_USERNAME,
      "DEFAULT_ADMIN_USERNAME",
    ) ?? "admin";
  const defaultAdminEmail = sanitizeCredentialEnvValue(
    process.env.DEFAULT_ADMIN_EMAIL,
    "DEFAULT_ADMIN_EMAIL",
  );
  const defaultAdminPassword = sanitizeCredentialEnvValue(
    process.env.DEFAULT_ADMIN_PASSWORD,
    "DEFAULT_ADMIN_PASSWORD",
  );
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

  validateAdminPasswordOrThrow(defaultAdminPassword);
  validateAdminEmailOrThrow(defaultAdminEmail);

  const adminBaseData = buildAdminBaseData(
    defaultAdminUsername,
    defaultAdminEmail,
    defaultAdminLocale,
  );

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
      update: { valueJson: { locale: defaultAdminLocale } },
      create: {
        key: "ui.locale.default",
        valueJson: { locale: defaultAdminLocale },
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

  const matchingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: defaultAdminUsername },
        { email: defaultAdminEmail },
      ],
    },
    select: USER_CONFLICT_CHECK_SELECT,
  });
  const usernameMatches = matchingUsers.filter(
    (user) => user.username === defaultAdminUsername,
  );
  const emailMatches = matchingUsers.filter(
    (user) => user.email === defaultAdminEmail,
  );

  if (matchingUsers.length > MAX_EXPECTED_USERS_BY_USERNAME_OR_EMAIL) {
    throw new Error(
      `Cannot bootstrap system admin: found ${matchingUsers.length} users matching username '${defaultAdminUsername}' or email '${defaultAdminEmail}', exceeding the expected maximum of ${MAX_EXPECTED_USERS_BY_USERNAME_OR_EMAIL}. This indicates a data integrity issue that must be resolved manually.`,
    );
  }
  if (
    usernameMatches.length > 1 ||
    emailMatches.length > 1 ||
    (matchingUsers.length === MAX_EXPECTED_USERS_BY_USERNAME_OR_EMAIL &&
      (usernameMatches.length !== 1 || emailMatches.length !== 1))
  ) {
    throw new Error(
      `Cannot bootstrap system admin: unexpected match distribution (username matches=${usernameMatches.length}, email matches=${emailMatches.length}). Resolve this data integrity conflict manually.`,
    );
  }

  const existingUserByUsername = usernameMatches[0] ?? null;
  const existingUserByEmail = emailMatches[0] ?? null;

  if (existingUserByUsername && !existingUserByUsername.isSystemAdmin) {
    throw new Error(
      `Cannot bootstrap system admin: username '${defaultAdminUsername}' already exists for a non-system-admin user (id='${existingUserByUsername.id}'). Resolve this conflict manually.`,
    );
  }

  const conflictingEmailOwnerId = getConflictingEmailOwnerId(
    existingUserByEmail,
    existingUserByUsername,
  );
  if (conflictingEmailOwnerId) {
    throw new Error(
      `Cannot bootstrap system admin: email '${defaultAdminEmail}' already exists for a different user (id='${conflictingEmailOwnerId}'). Resolve this conflict manually.`,
    );
  }

  // Only update when the bootstrap username already belongs to a system admin.
  // If there is no matching system-admin username, create a new one below.
  // Note: if `existingUserByUsername` exists but is not a system admin, we
  // throw above as a conflict.
  const existingSystemAdminId =
    existingUserByUsername?.isSystemAdmin
      ? existingUserByUsername.id
      : undefined;

  if (existingSystemAdminId) {
    // Always reconcile bootstrap profile fields (username/email/role/locale/state)
    // for the system admin. Password hash rotation is optional and only happens
    // when explicitly requested via SEED_UPDATE_ADMIN_PASSWORD.
    const updateData: AdminUpdateData = {
      ...adminBaseData,
      ...(shouldUpdateAdminPassword
        ? {
            passwordHash: await hashAdminPassword(defaultAdminPassword),
          }
        : {}),
    };

    await prisma.user.update({
      where: { id: existingSystemAdminId },
      data: updateData,
    });
  } else {
    const passwordHash = await hashAdminPassword(defaultAdminPassword);

    await prisma.user.create({
      data: {
        ...adminBaseData,
        passwordHash,
      },
    });
  }
}

main()
  .catch(async (error: unknown) => {
    const errorType = error instanceof Error ? error.name : "NonErrorRejection";
    console.error(`Seed failed (error type: ${errorType}).`);
    console.error("Troubleshooting steps:");
    for (const step of SEED_TROUBLESHOOTING_STEPS) {
      console.error(step);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
