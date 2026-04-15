const path = require("node:path");
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
