import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  ProviderConnectorType,
  UserLocale,
  UserRole,
} from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & { __seedPrisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  const globalWithPrisma = globalThis as GlobalWithPrisma;
  if (!globalWithPrisma.__seedPrisma) {
    globalWithPrisma.__seedPrisma = new PrismaClient();
  }
  return globalWithPrisma.__seedPrisma;
}

const prisma = getPrismaClient();
// Require at least 12 characters for admin passwords because 12 is a
// widely accepted modern baseline: it materially improves resistance to
// guessing/brute-force attacks compared with shorter lengths while
// remaining practical for user adoption.
const MIN_ADMIN_PASSWORD_LENGTH = 12;
// Common weak passwords that should never be accepted, even if they pass
// composition checks.
const COMMON_WEAK_PASSWORDS = new Set<string>([
  "password",
  "password123",
  "admin",
  "admin123",
  "qwerty",
  "qwerty123",
  "letmein",
  "welcome",
  "changeme",
  "iloveyou",
  "abc123",
  "123456",
  "12345678",
  "123456789",
]);
const MIN_SEQUENTIAL_RUN_LENGTH = 4;
const REPEATED_CHAR_RUN_REGEX = /(.)\1{3,}/;
// RFC 5321: maximum mailbox length is 254 characters.
const MAX_EMAIL_LENGTH = 254;
// RFC 1035: domain name total length is capped by label structure, with
// practical mailbox domain-part validation typically enforcing <= 253.
const MAX_EMAIL_DOMAIN_LENGTH = 253;
// RFC 1035 §2.3.4: each DNS label must be 63 octets or fewer.
const MAX_DNS_LABEL_LENGTH = 63;
function getDefaultSeedAdminLocale(): UserLocale {
  return resolveDefaultSeedAdminLocale();
}
const DEFAULT_BCRYPT_SALT_ROUNDS = 12;
// At most two users can be returned by username/email lookup:
// one matching username and another matching email (or one matching both).
const MAX_COMBINED_USERNAME_EMAIL_MATCHES = 2;
const USER_CONFLICT_QUERY_LIMIT = MAX_COMBINED_USERNAME_EMAIL_MATCHES + 1;
const DEFAULT_IDLE_TIMEOUT_MINUTES = 10;
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
const SENSITIVE_ENV_NAME_PATTERN =
  /(PASSWORD|SECRET|TOKEN|API[_-]?KEY|DATABASE_URL|CONNECTION_STRING|PRIVATE[_-]?KEY|ACCESS[_-]?KEY)/i;

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function isAsciiDigit(charCode: number): boolean {
  return charCode >= 48 && charCode <= 57;
}

function isAsciiLetter(charCode: number): boolean {
  return (
    (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)
  );
}

function hasSequentialRun(value: string, minRunLength: number): boolean {
  if (value.length < minRunLength) {
    return false;
  }

  let ascendingRunLength = 1;
  let descendingRunLength = 1;

  for (let index = 1; index < value.length; index += 1) {
    const previousCode = value.charCodeAt(index - 1);
    const currentCode = value.charCodeAt(index);
    const isSameClass =
      (isAsciiDigit(previousCode) && isAsciiDigit(currentCode)) ||
      (isAsciiLetter(previousCode) && isAsciiLetter(currentCode));

    if (isSameClass && currentCode === previousCode + 1) {
      ascendingRunLength += 1;
    } else {
      ascendingRunLength = 1;
    }

    if (isSameClass && currentCode === previousCode - 1) {
      descendingRunLength += 1;
    } else {
      descendingRunLength = 1;
    }

    if (
      ascendingRunLength >= minRunLength ||
      descendingRunLength >= minRunLength
    ) {
      return true;
    }
  }

  return false;
}

function escapeForRegexCharacterClass(value: string): string {
  return value.replace(/[[\]\\^-]/g, "\\$&");
}

function tryParseSaltRounds(rawValue: string | undefined): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsedSaltRounds = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsedSaltRounds) ? undefined : parsedSaltRounds;
}

function resolveBcryptSaltRounds(): number {
  const rawBcryptSaltRounds = process.env.BCRYPT_SALT_ROUNDS?.trim();
  const parsedBcryptSaltRounds = tryParseSaltRounds(rawBcryptSaltRounds);

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
  const controlCharacters = trimmedValue.match(/[\u0000-\u001F\u007F]/g);
  if (controlCharacters) {
    const controlCharacterCodePoints = Array.from(
      new Set(controlCharacters),
    ).map(
      (character) =>
        `U+${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
    );

    throw new Error(
      `${envName} contains invalid ASCII control characters (${controlCharacterCodePoints.join(", ")}). Use printable characters only (no U+0000-U+001F or U+007F).`,
    );
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

function resolveOptionalLocaleFromEnv(
  rawValue: string | undefined,
  envVarName: string,
  allowedLocales: UserLocale[],
): UserLocale | undefined {
  const normalizedLocale = normalizeLocaleEnvValue(rawValue);
  if (!normalizedLocale) {
    return undefined;
  }

  if (allowedLocales.includes(normalizedLocale as UserLocale)) {
    return normalizedLocale as UserLocale;
  }

  throw new Error(`${envVarName} must be one of: ${allowedLocales.join(", ")}.`);
}

function resolveDefaultSeedAdminLocale(): UserLocale {
  const allowedLocales = Object.values(UserLocale) as UserLocale[];
  const resolvedDefaultLocale = resolveOptionalLocaleFromEnv(
    process.env.SEED_ADMIN_DEFAULT_LOCALE,
    "SEED_ADMIN_DEFAULT_LOCALE",
    allowedLocales,
  );

  if (resolvedDefaultLocale) {
    return resolvedDefaultLocale;
  }

  const [firstLocale] = allowedLocales;
  if (!firstLocale) {
    throw new Error("UserLocale enum must contain at least one locale.");
  }

  return firstLocale;
}

function resolveSeedAdminLocale(): UserLocale {
  const allowedLocales = Object.values(UserLocale) as UserLocale[];
  const fallbackLocale = getDefaultSeedAdminLocale();
  const resolvedLocale = resolveOptionalLocaleFromEnv(
    process.env.SEED_ADMIN_LOCALE,
    "SEED_ADMIN_LOCALE",
    allowedLocales,
  );

  return resolvedLocale ?? fallbackLocale;
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
    const allowedSpecialCharsHint = missingRequirements.includes(
      "special character",
    )
      ? ` Allowed special characters: ${ALLOWED_PASSWORD_SPECIAL_CHARACTERS}`
      : "";
    throw new Error(
      `Admin password is missing required character types: ${missingRequirements.join(", ")}.${allowedSpecialCharsHint}`,
    );
  }

  const normalizedPassword = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(normalizedPassword)) {
    throw new Error(
      "Admin password is too common and insecure. Choose a less predictable password.",
    );
  }

  if (REPEATED_CHAR_RUN_REGEX.test(normalizedPassword)) {
    throw new Error(
      "Admin password cannot contain runs of 4 or more repeated characters.",
    );
  }

  if (hasSequentialRun(normalizedPassword, MIN_SEQUENTIAL_RUN_LENGTH)) {
    throw new Error(
      `Admin password cannot contain sequential letter/number runs of length ${MIN_SEQUENTIAL_RUN_LENGTH} or more.`,
    );
  }
}

function validateAdminEmailOrThrow(email: string, envVarName: string): void {
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new Error(
      `${envVarName} email address is too long (max ${MAX_EMAIL_LENGTH} characters).`,
    );
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) {
    throwInvalidAdminEmail(envVarName, "missing or invalid @ separator");
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  if (
    localPart.length === 0 ||
    localPart.length > 64 ||
    domainPart.length === 0 ||
    domainPart.length > MAX_EMAIL_DOMAIN_LENGTH
  ) {
    throwInvalidAdminEmail(envVarName, "invalid local-part or domain length");
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    localPart.includes("..") ||
    domainPart.includes("..")
  ) {
    throwInvalidAdminEmail(envVarName, "invalid dot placement");
  }

  // RFC 5322-inspired dot-atom local-part validation (practical subset):
  // allows one or more "atext" chars, optionally dot-separated,
  // while preventing leading/trailing or consecutive dots.
  if (!EMAIL_LOCAL_PART_PATTERN.test(localPart)) {
    throwInvalidAdminEmail(envVarName, "invalid local-part characters");
  }

  const domainLabels = domainPart.split(".");
  if (domainLabels.length < 2) {
    throwInvalidAdminEmail(envVarName, "missing top-level domain");
  }

  for (const label of domainLabels) {
    if (!isValidDomainLabel(label)) {
      throwInvalidAdminEmail(envVarName, "invalid domain label");
    }
  }
}

function isValidDomainLabel(label: string): boolean {
  return (
    label.length > 0 &&
    // RFC 1035 §2.3.4: each DNS label must be 63 octets or fewer.
    label.length <= MAX_DNS_LABEL_LENGTH &&
    /^[A-Za-z0-9-]+$/.test(label) &&
    !label.startsWith("-") &&
    !label.endsWith("-")
  );
}

function throwInvalidAdminEmail(envVarName: string, reason: string): never {
  throw new Error(
    `${envVarName} must be a valid email address (${reason}; e.g., admin@example.com).`,
  );
}

function getSensitiveEnvEntries(): Array<[string, string]> {
  return Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[1] !== undefined &&
      entry[1].length > 0 &&
      SENSITIVE_ENV_NAME_PATTERN.test(entry[0]),
  );
}

function buildSensitiveValueList(): string[] {
  return Array.from(
    new Set(
      getSensitiveEnvEntries().map(([, envValue]) => envValue),
    ),
  ).sort((left, right) => right.length - left.length);
}

function buildSensitiveEnvSignature(): string {
  return getSensitiveEnvEntries()
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([envName, envValue]) => `${envName}=${envValue}`)
    .join("\u001F");
}

function escapeForLiteralRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let cachedSensitiveValuePattern: RegExp | null = null;
let cachedSensitiveEnvSignature: string | null = null;

function getSensitiveValuePattern(): RegExp | null {
  const currentSensitiveEnvSignature = buildSensitiveEnvSignature();
  if (
    cachedSensitiveValuePattern !== null &&
    cachedSensitiveEnvSignature === currentSensitiveEnvSignature
  ) {
    return cachedSensitiveValuePattern;
  }

  const sensitiveValues = buildSensitiveValueList();
  if (sensitiveValues.length === 0) {
    cachedSensitiveEnvSignature = currentSensitiveEnvSignature;
    cachedSensitiveValuePattern = null;
    return null;
  }

  cachedSensitiveValuePattern = new RegExp(
    sensitiveValues.map(escapeForLiteralRegex).join("|"),
    "g",
  );
  cachedSensitiveEnvSignature = currentSensitiveEnvSignature;
  return cachedSensitiveValuePattern;
}

function redactSensitiveValues(rawText: string): string {
  const sensitiveValuePattern = getSensitiveValuePattern();
  if (sensitiveValuePattern === null) {
    return rawText;
  }

  return rawText.replace(sensitiveValuePattern, "[REDACTED]");
}

function formatSeedErrorForLog(error: unknown): string {
  if (error instanceof Error) {
    const errorMessage = error.message || error.name || "Unknown error";
    return redactSensitiveValues(errorMessage);
  }

  return redactSensitiveValues(String(error));
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

function buildMatchingUsersList(
  usernameMatches: ExistingUserLookup[],
  emailMatches: ExistingUserLookup[],
): ExistingUserLookup[] {
  const matchingUsers: ExistingUserLookup[] = [];
  const seenIds = new Set<string>();

  for (const user of [...usernameMatches, ...emailMatches]) {
    if (seenIds.has(user.id)) {
      continue;
    }
    seenIds.add(user.id);
    matchingUsers.push(user);
  }

  return matchingUsers;
}

/**
 * Valid distributions:
 * - 0 total matches
 * - 1 total match (either username or email)
 * - 2 total matches only when there is exactly 1 username match and 1 email match
 */
function hasUnexpectedMatchDistribution(
  usernameMatchCount: number,
  emailMatchCount: number,
  combinedMatchCount: number,
): boolean {
  return (
    usernameMatchCount > 1 ||
    emailMatchCount > 1 ||
    (combinedMatchCount === MAX_COMBINED_USERNAME_EMAIL_MATCHES &&
      (usernameMatchCount !== 1 || emailMatchCount !== 1))
  );
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
  validateAdminEmailOrThrow(defaultAdminEmail, "DEFAULT_ADMIN_EMAIL");

  const adminBaseData = buildAdminBaseData(
    defaultAdminUsername,
    defaultAdminEmail,
    defaultAdminLocale,
  );

  await Promise.all(
    providerSeeds.map(async (provider) => {
      try {
        return await prisma.provider.upsert({
          where: { slug: provider.slug },
          update: {
            name: provider.name,
            connectorType: provider.connectorType,
            color: provider.color,
            description: provider.description,
            isActive: true,
          },
          create: { ...provider, isActive: true },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const safeProviderSlug = redactSensitiveValues(provider.slug);
        const safeProviderName = redactSensitiveValues(provider.name);
        const safeErrorMessage = redactSensitiveValues(errorMessage);
        throw new Error(
          `Failed to seed provider '${safeProviderSlug}' (${safeProviderName}): ${safeErrorMessage}`,
        );
      }
    }),
  );

  const uiThemeDefaultValueJson: Prisma.InputJsonValue = { mode: "system" };
  const uiLocaleDefaultValueJson: Prisma.InputJsonValue = {
    locale: defaultAdminLocale,
  };
  const auditLogRetentionValueJson: Prisma.InputJsonValue = {
    enabled: false,
    days: null,
  };
  const securityIdleLockValueJson: Prisma.InputJsonValue = {
    enabled: false,
    timeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
    requirePasswordOnUnlock: true,
  };

  await Promise.all([
    prisma.appSetting.upsert({
      where: { key: "ui.theme.default" },
      update: { valueJson: uiThemeDefaultValueJson },
      create: {
        key: "ui.theme.default",
        valueJson: uiThemeDefaultValueJson,
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "ui.locale.default" },
      update: { valueJson: uiLocaleDefaultValueJson },
      create: {
        key: "ui.locale.default",
        valueJson: uiLocaleDefaultValueJson,
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "audit.log.retention" },
      update: { valueJson: auditLogRetentionValueJson },
      create: {
        key: "audit.log.retention",
        valueJson: auditLogRetentionValueJson,
      },
    }),
    prisma.appSetting.upsert({
      where: { key: "security.idle_lock" },
      update: { valueJson: securityIdleLockValueJson },
      create: {
        key: "security.idle_lock",
        valueJson: securityIdleLockValueJson,
      },
    }),
  ]);

  const [usernameMatches, emailMatches] = await Promise.all([
    prisma.user.findMany({
      where: { username: defaultAdminUsername },
      select: USER_CONFLICT_CHECK_SELECT,
      take: USER_CONFLICT_QUERY_LIMIT,
    }),
    prisma.user.findMany({
      where: { email: defaultAdminEmail },
      select: USER_CONFLICT_CHECK_SELECT,
      take: USER_CONFLICT_QUERY_LIMIT,
    }),
  ]);
  const matchingUsers = buildMatchingUsersList(usernameMatches, emailMatches);
  const existingUserByUsername = usernameMatches[0] ?? null;
  const existingUserByEmail = emailMatches[0] ?? null;

  if (matchingUsers.length > MAX_COMBINED_USERNAME_EMAIL_MATCHES) {
    throw new Error(
      `Cannot bootstrap system admin: found ${matchingUsers.length} users matching username '${defaultAdminUsername}' or email '${defaultAdminEmail}', exceeding the expected maximum of ${MAX_COMBINED_USERNAME_EMAIL_MATCHES}. This indicates a data integrity issue that must be resolved manually.`,
    );
  }
  if (
    hasUnexpectedMatchDistribution(
      usernameMatches.length,
      emailMatches.length,
      matchingUsers.length,
    )
  ) {
    throw new Error(
      `Cannot bootstrap system admin: unexpected match distribution (username matches=${usernameMatches.length}, email matches=${emailMatches.length}). Resolve this data integrity conflict manually.`,
    );
  }

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

    try {
      await prisma.user.update({
        where: { id: existingSystemAdminId },
        data: updateData,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const safeErrorMessage = redactSensitiveValues(errorMessage);
      const safeAdminUsername = redactSensitiveValues(defaultAdminUsername);
      throw new Error(
        `Failed to update bootstrap system admin (id='${existingSystemAdminId}', username='${safeAdminUsername}'): ${safeErrorMessage}`,
      );
    }
  } else {
    const passwordHash = await hashAdminPassword(defaultAdminPassword);

    try {
      await prisma.user.create({
        data: {
          ...adminBaseData,
          passwordHash,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const safeErrorMessage = redactSensitiveValues(errorMessage);
      const safeAdminUsername = redactSensitiveValues(defaultAdminUsername);
      const safeAdminEmail = redactSensitiveValues(defaultAdminEmail);
      throw new Error(
        `Failed to create bootstrap system admin (username='${safeAdminUsername}', email='${safeAdminEmail}'): ${safeErrorMessage}`,
      );
    }
  }
}

main()
  .catch(async (error) => {
    console.error("Seed failed.");
    console.error(`Error details: ${formatSeedErrorForLog(error)}`);
    console.error("Troubleshooting steps:");
    for (const step of SEED_TROUBLESHOOTING_STEPS) {
      console.error(step);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
