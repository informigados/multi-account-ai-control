const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const os = require("node:os");

// ── Desktop environment bootstrap ─────────────────────────────────────────────
// Resolves the correct data directory regardless of whether the app was
// launched from the source tree or from an installed NSIS/MSI bundle.
// Priority: APPDATA env (set by Tauri) → parent of __dirname → os.homedir fallback
function resolveDataRoot() {
  // When bundled, Tauri sets APPDATA to the app-specific AppData folder.
  // We look for the "next-runtime" sibling that contains prisma/local.db.
  const candidates = [
    // Installed: __dirname IS the "next-runtime" folder inside AppData
    path.resolve(__dirname),
    // Source tree (dev): two levels up from scripts/
    path.resolve(__dirname, "..", ".."),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "prisma", "local.db"))) {
      return dir;
    }
  }
  return path.resolve(__dirname);
}

function ensureDesktopEnv() {
  const dataRoot = resolveDataRoot();
  const secretsPath = path.join(dataRoot, "secrets.json");
  const dbPath = path.join(dataRoot, "prisma", "local.db");

  // Load or generate persistent secrets
  let secrets = {};
  if (fs.existsSync(secretsPath)) {
    try {
      secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    } catch (_) {
      secrets = {};
    }
  }

  let changed = false;

  if (!secrets.APP_MASTER_KEY) {
    // Generate a 32-byte key encoded as 64-char hex (accepted by env.ts)
    secrets.APP_MASTER_KEY = crypto.randomBytes(32).toString("hex");
    changed = true;
  }

  if (!secrets.SESSION_SECRET) {
    // Must be at least 32 chars; use 48 bytes → 96-char hex for safety
    secrets.SESSION_SECRET = crypto.randomBytes(48).toString("hex");
    changed = true;
  }

  if (changed) {
    try {
      fs.mkdirSync(path.dirname(secretsPath), { recursive: true });
      fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (err) {
      console.error("[desktop-bootstrap] Failed to persist secrets:", err.message);
    }
  }

  // Inject into process.env only when not already set (env vars from parent process win)
  if (!process.env.DATABASE_URL) {
    const normalizedDbPath = dbPath.replace(/\\/g, "/");
    process.env.DATABASE_URL = `file:${normalizedDbPath}`;
  }
  if (!process.env.APP_MASTER_KEY) {
    process.env.APP_MASTER_KEY = secrets.APP_MASTER_KEY;
  }
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = secrets.SESSION_SECRET;
  }
}

ensureDesktopEnv();
// ── End of desktop environment bootstrap ──────────────────────────────────────

const runtimeRoot = __dirname;
const candidates = [
  path.join(runtimeRoot, "server.js"),
  path.join(runtimeRoot, "apps", "web", "server.js"),
];
const serverEntrypoint = candidates.find((candidate) => fs.existsSync(candidate));

if (!serverEntrypoint) {
  throw new Error("Unable to locate Next standalone server entrypoint.");
}

process.env.PORT = process.env.PORT || "4173";
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

require(serverEntrypoint);
