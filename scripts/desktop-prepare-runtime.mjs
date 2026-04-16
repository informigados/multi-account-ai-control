import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const webRoot = path.join(repoRoot, "apps", "web");
const nextOutputRoot = path.join(webRoot, ".next");
const standaloneRoot = path.join(nextOutputRoot, "standalone");
const staticRoot = path.join(nextOutputRoot, "static");
const publicRoot = path.join(webRoot, "public");
// src-tauri paths — these are the locations that Tauri bundles into the installer.
// tauri.conf.json has: frontendDist="launcher-dist" and resources=["next-runtime"],
// both resolved relative to src-tauri/, so we must write there.
const srcTauriRoot = path.join(repoRoot, "desktop", "tauri", "src-tauri");
const runtimeRoot = path.join(srcTauriRoot, "next-runtime");
const launcherDistRoot = path.join(srcTauriRoot, "launcher-dist");
const launcherIndexPath = path.join(launcherDistRoot, "index.html");
const runtimeEntrypointPath = path.join(runtimeRoot, "start-runtime.cjs");

function runOrThrow(command, args, cwd) {
	const isWindowsNpm = process.platform === "win32" && command === "npm";
	const commandName = isWindowsNpm ? "npm" : command;
	const result = spawnSync(commandName, args, {
		cwd,
		stdio: "inherit",
		shell: isWindowsNpm,
	});
	if (result.error) {
		throw new Error(
			`Command failed to spawn: ${commandName} ${args.join(" ")} (${result.error.message})`,
		);
	}
	if (result.status !== 0) {
		throw new Error(
			`Command failed: ${commandName} ${args.join(" ")} (exit ${result.status ?? "unknown"})`,
		);
	}
}

async function ensureCleanDirectory(targetPath) {
	await rm(targetPath, { recursive: true, force: true });
	await mkdir(targetPath, { recursive: true });
}

async function prepareLauncherDist() {
	await ensureCleanDirectory(launcherDistRoot);
	const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Multi Account AI Control</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root { color-scheme: dark; font-family: "Segoe UI", system-ui, sans-serif; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(ellipse at 70% 20%, #0f2744 0%, #0b1220 55%, #061018 100%);
        color: #f0f4f8;
        overflow: hidden;
      }
      .card {
        width: min(90vw, 480px);
        padding: 36px 32px;
        background: rgba(15, 25, 50, 0.8);
        border: 1px solid rgba(100, 160, 255, 0.15);
        border-radius: 20px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(100,160,255,0.05) inset;
        backdrop-filter: blur(16px);
        animation: fadeIn 0.4s ease;
      }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .logo {
        width: 44px; height: 44px;
        border-radius: 10px;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 700; color: #fff;
        margin-bottom: 20px;
        box-shadow: 0 4px 16px rgba(99,102,241,0.4);
      }
      h1 { font-size: 1.1rem; font-weight: 600; color: #e2e8f0; margin-bottom: 8px; }
      .sub { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin-bottom: 28px; }
      .track {
        height: 3px; background: rgba(255,255,255,0.08);
        border-radius: 4px; overflow: hidden; margin-bottom: 14px;
      }
      .bar {
        height: 100%; width: 30%;
        background: linear-gradient(90deg, #3b82f6, #818cf8);
        border-radius: 4px;
        animation: slide 1.6s ease-in-out infinite;
      }
      @keyframes slide {
        0%   { transform: translateX(-100%); }
        50%  { transform: translateX(233%); }
        100% { transform: translateX(233%); }
      }
      .status { font-size: 0.78rem; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">M</div>
      <h1>Starting Multi Account AI Control</h1>
      <p class="sub">Initializing the local workspace service. The application will open automatically.</p>
      <div class="track"><div class="bar"></div></div>
      <p class="status">Starting secure local server…</p>
    </div>
    <!-- Navigation is handled by Rust: TCP polling + window.eval(). -->
    <!-- fetch() no-cors in WebView2 resolves even when port is closed. -->
  </body>
</html>
`;
	await writeFile(launcherIndexPath, html, "utf8");
}

function resolveStandaloneAppRoot(basePath) {
	const monorepoPath = path.join(basePath, "apps", "web");
	if (existsSync(path.join(monorepoPath, "server.js"))) {
		return monorepoPath;
	}
	return basePath;
}

async function prepareRuntime() {
	if (!existsSync(standaloneRoot)) {
		throw new Error(
			"Standalone output not found. Ensure Next build ran with output=standalone.",
		);
	}
	if (!existsSync(staticRoot)) {
		throw new Error("Next static output not found at apps/web/.next/static.");
	}

	await ensureCleanDirectory(runtimeRoot);
	await cp(standaloneRoot, runtimeRoot, { recursive: true, dereference: true });

	const appRoot = resolveStandaloneAppRoot(runtimeRoot);
	const appNextStaticTarget = path.join(appRoot, ".next", "static");
	const appPublicTarget = path.join(appRoot, "public");
	await mkdir(path.dirname(appNextStaticTarget), { recursive: true });
	await cp(staticRoot, appNextStaticTarget, { recursive: true });
	if (existsSync(publicRoot)) {
		await cp(publicRoot, appPublicTarget, { recursive: true });
	}

	const launcher = `const path = require("node:path");
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
    const normalizedDbPath = dbPath.replace(/\\\\/g, "/");
    process.env.DATABASE_URL = \`file:\${normalizedDbPath}\`;
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
`;
	await writeFile(runtimeEntrypointPath, launcher, "utf8");
}

async function main() {
	runOrThrow("npm", ["--prefix", webRoot, "run", "build"], repoRoot);
	await prepareRuntime();
	await prepareLauncherDist();

	console.log("\nDesktop runtime prepared successfully.");
	console.log(`- Runtime root: ${runtimeRoot}`);
	console.log(`- Launcher dist: ${launcherDistRoot}`);
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`\nFailed to prepare desktop runtime: ${message}`);
	process.exit(1);
});
