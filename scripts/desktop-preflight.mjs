import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const checks = [
	{
		name: "Tauri config",
		ok: existsSync(path.join(repoRoot, "desktop", "tauri", "src-tauri", "tauri.conf.json")),
	},
	{
		name: "Rust main entry",
		ok: existsSync(path.join(repoRoot, "desktop", "tauri", "src-tauri", "src", "main.rs")),
	},
];

function commandAvailable(command, args = ["--version"]) {
	const attempts =
		process.platform === "win32" ? [command, `${command}.cmd`] : [command];

	for (const bin of attempts) {
		const result = spawnSync(bin, args, {
			stdio: "ignore",
			shell: false,
		});
		if (result.status === 0) {
			return true;
		}
	}

	return false;
}

checks.push({
	name: "Node.js available",
	ok: commandAvailable("node"),
});
checks.push({
	name: "Cargo available",
	ok: commandAvailable("cargo"),
});
checks.push({
	name: "Rustc available",
	ok: commandAvailable("rustc"),
});

const failed = checks.filter((check) => !check.ok);

console.log("Desktop preflight checks:");
for (const check of checks) {
	console.log(`- ${check.ok ? "OK" : "FAIL"}: ${check.name}`);
}

if (failed.length > 0) {
	console.error("\nPreflight failed. Resolve the missing items above before packaging.");
	process.exit(1);
}

console.log("\nPreflight passed. You can proceed with desktop/Tauri setup.");
