#!/bin/bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "v0.1.0 only provides a macOS uninstaller." >&2
  exit 1
fi

MANIFEST_PATH="${HOME}/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.codex.web_translator.json"
INSTALL_DIR="${HOME}/Library/Application Support/CodexWebTranslator"

if [[ -f "$MANIFEST_PATH" ]]; then
  rm "$MANIFEST_PATH"
  echo "Removed $MANIFEST_PATH"
fi

if [[ -d "$INSTALL_DIR" ]]; then
  rm -R "$INSTALL_DIR"
  echo "Removed $INSTALL_DIR"
fi

echo "Codex Web Translator native host has been uninstalled."
