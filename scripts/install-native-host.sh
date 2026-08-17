#!/bin/bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "v0.1.0 only provides a macOS installer." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOST_NAME="com.codex.web_translator"
EXPECTED_EXTENSION_ID="emnejkkppjmobchhidfddgedogbkdhcl"
MANIFEST_DIR="${HOME}/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
INSTALL_DIR="${HOME}/Library/Application Support/CodexWebTranslator"
INSTALLED_HOST_PATH="$INSTALL_DIR/host.mjs"
INSTALLED_SCHEMA_PATH="$INSTALL_DIR/translation.schema.json"
LAUNCHER_PATH="$INSTALL_DIR/launch.sh"
ACTUAL_EXTENSION_ID="$(node "$PROJECT_DIR/scripts/extension-id.mjs")"
NODE_PATH="$(command -v node || true)"
CODEX_PATH="$(command -v codex || true)"

if [[ "$ACTUAL_EXTENSION_ID" != "$EXPECTED_EXTENSION_ID" ]]; then
  echo "Extension ID mismatch: expected $EXPECTED_EXTENSION_ID, got $ACTUAL_EXTENSION_ID" >&2
  exit 1
fi

if [[ ! -x "$NODE_PATH" ]]; then
  echo "Node.js executable not found." >&2
  exit 1
fi
if [[ ! -x "$CODEX_PATH" ]]; then
  echo "Codex executable not found." >&2
  exit 1
fi

mkdir -p "$MANIFEST_DIR" "$INSTALL_DIR"
cp "$PROJECT_DIR/native-host/host.mjs" "$INSTALLED_HOST_PATH"
cp "$PROJECT_DIR/native-host/translation.schema.json" "$INSTALLED_SCHEMA_PATH"

printf '%s\n' \
  '#!/bin/bash' \
  'set -euo pipefail' \
  "export CODEX_BIN=\"$CODEX_PATH\"" \
  "exec \"$NODE_PATH\" \"$INSTALLED_HOST_PATH\"" \
  > "$LAUNCHER_PATH"
chmod +x "$LAUNCHER_PATH"

printf '%s\n' \
  '{' \
  '  "name": "com.codex.web_translator",' \
  '  "description": "Local Codex bridge for the bilingual webpage translator",' \
  "  \"path\": \"$LAUNCHER_PATH\"," \
  '  "type": "stdio",' \
  '  "allowed_origins": [' \
  "    \"chrome-extension://$EXPECTED_EXTENSION_ID/\"" \
  '  ]' \
  '}' > "$MANIFEST_PATH"

echo "Installed Native Messaging Host:"
echo "  $MANIFEST_PATH"
echo "Installed runtime bundle:"
echo "  $INSTALL_DIR"
echo "Extension ID:"
echo "  $EXPECTED_EXTENSION_ID"
