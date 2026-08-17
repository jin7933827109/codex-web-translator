import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonFiles = [
  "package.json",
  "extension/manifest.json",
  "native-host/translation.schema.json",
  "native-host/com.codex.web_translator.example.json"
];
const javascriptFiles = [
  "extension/background.js",
  "extension/content/content.js",
  "extension/popup/popup.js",
  "native-host/host.mjs",
  "scripts/extension-id.mjs",
  "scripts/serve-demo.mjs",
  "tests/native-host.test.mjs"
];
const shellFiles = [
  "native-host/launch.sh",
  "scripts/install-native-host.sh",
  "scripts/uninstall-native-host.sh"
];

for (const relativePath of jsonFiles) {
  JSON.parse(readFileSync(join(root, relativePath), "utf8"));
  process.stdout.write(`json ok   ${relativePath}\n`);
}

for (const relativePath of javascriptFiles) {
  const result = spawnSync(process.execPath, ["--check", join(root, relativePath)], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  process.stdout.write(`syntax ok ${relativePath}\n`);
}

for (const relativePath of shellFiles) {
  const result = spawnSync("bash", ["-n", join(root, relativePath)], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  process.stdout.write(`shell ok  ${relativePath}\n`);
}

const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8"));
const publicKey = Buffer.from(manifest.key, "base64");
const hex = createHash("sha256").update(publicKey).digest("hex").slice(0, 32);
const extensionId = hex.replace(/[0-9a-f]/g, (character) =>
  String.fromCharCode(97 + Number.parseInt(character, 16))
);
const expectedId = "emnejkkppjmobchhidfddgedogbkdhcl";
if (extensionId !== expectedId) {
  throw new Error(`Extension ID mismatch: expected ${expectedId}, got ${extensionId}`);
}
process.stdout.write(`id ok     ${extensionId}\n`);
