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
const desktopTauriRoot = path.join(repoRoot, "desktop", "tauri");
const runtimeRoot = path.join(desktopTauriRoot, "next-runtime");
const launcherDistRoot = path.join(desktopTauriRoot, "launcher-dist");
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
      :root {
        color-scheme: light dark;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top right, #1f2937, #0b1220 55%);
        color: #f8fafc;
      }
      .panel {
        width: min(92vw, 520px);
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 16px;
        padding: 24px;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 1.15rem;
        letter-spacing: 0.02em;
      }
      p {
        margin: 0;
        line-height: 1.55;
        color: rgba(226, 232, 240, 0.92);
      }
      .status {
        margin-top: 16px;
        font-size: 0.9rem;
        color: #38bdf8;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>Starting Multi Account AI Control</h1>
      <p>The desktop runtime is initializing the local workspace service. This window will continue automatically.</p>
      <p class="status">Initializing secure local server...</p>
    </main>
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
