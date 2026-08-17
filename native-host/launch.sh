#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

NODE_CANDIDATES=(
  "${CODEX_TRANSLATOR_NODE:-}"
  "${HOME:-}/.local/bin/node"
  "/opt/homebrew/bin/node"
  "/usr/local/bin/node"
  "/usr/bin/node"
)

for candidate in "${NODE_CANDIDATES[@]}"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    exec "$candidate" "$SCRIPT_DIR/host.mjs"
  fi
done

echo "Codex Web Translator: Node.js executable not found." >&2
exit 1
