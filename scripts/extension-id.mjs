import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "extension", "manifest.json"), "utf8"));
const publicKey = Buffer.from(manifest.key, "base64");
const hex = createHash("sha256").update(publicKey).digest("hex").slice(0, 32);
const extensionId = hex.replace(/[0-9a-f]/g, (character) =>
  String.fromCharCode(97 + Number.parseInt(character, 16))
);

process.stdout.write(`${extensionId}\n`);
