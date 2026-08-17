# Codex Web Translator

[简体中文](./README.zh-CN.md)

An unofficial, local-first Chrome extension that turns ordinary web pages into bilingual reading views using your local Codex CLI session.

Click the extension, choose a target language, and the translation appears below each original paragraph. Click **Restore page** to remove every injected translation without rewriting the source content.

> **Project status:** macOS MVP. The extension and native host are usable, but this is not yet a Chrome Web Store package or a production translation service.

## Features

- Paragraph-by-paragraph bilingual web reading
- Eight target languages
- One-click translation and restore
- Conservative extraction of headings, paragraphs, quotations, and list items
- No API key stored in the extension
- Local Chrome Native Messaging bridge to the Codex CLI
- Read-only, ephemeral Codex runs with JSON Schema output
- Prompt-injection defenses for untrusted webpage text
- No third-party runtime dependencies

## How it works

```text
Chrome popup
  -> content script extracts and labels readable blocks
  -> extension service worker validates the request
  -> Chrome Native Messaging
  -> local Node.js host
  -> codex exec in an empty, read-only, ephemeral workspace
  -> schema-validated translations
  -> content script inserts text-only translation nodes
```

See [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) for the detailed design and threat boundaries.

## Requirements

- macOS
- Google Chrome
- Node.js 18 or newer
- The [Codex CLI](https://learn.chatgpt.com/codex/cli), installed and signed in

Windows and Linux installers are not included in v0.1.0.

## Quick start

```bash
git clone https://github.com/jin7933827109/codex-web-translator.git
cd codex-web-translator
npm run verify
npm run install-host
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's `extension/` directory.
5. Confirm the extension ID is `emnejkkppjmobchhidfddgedogbkdhcl`.
6. Pin **Codex Web Translator** to the Chrome toolbar.

## Try the local demo

```bash
npm run demo
```

Open <http://127.0.0.1:4173/>, click the extension, and translate the page.

## Updating

After pulling a newer version, reinstall the native host and reload the unpacked extension:

```bash
git pull
npm run verify
npm run install-host
```

## Uninstalling

Remove the unpacked extension in Chrome, then run:

```bash
npm run uninstall-host
```

## Privacy and security

When you start a translation, the text extracted from the current page is sent to the model service used by your signed-in Codex CLI. This project does not read or transmit form fields, passwords, cookies, local storage, or browsing history.

Webpage text is untrusted input. The native host runs Codex with an empty temporary working directory, a read-only sandbox, an ephemeral session, disabled non-translation tools, and a strict JSON output schema. Model output is inserted with `textContent`, never interpreted as HTML.

Do not translate pages containing sensitive information unless you are comfortable sending the extracted page text to your configured Codex model provider.

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Known limitations

- Chrome internal pages, the Chrome Web Store, and other extension pages cannot be translated.
- Canvas, PDF viewers, cross-origin iframes, Shadow DOM, and heavily virtualized pages may not be extracted.
- SPA rerenders can remove injected translations.
- The Codex CLI has higher fixed context overhead and latency than a dedicated translation API.
- Regular articles are combined into as few Codex calls as possible, but very long pages are split into batches.
- v0.1.0 supports Google Chrome on macOS only.

## Development

The project has no install-time npm dependencies.

```bash
npm run verify       # syntax, manifest, schema, extension ID, and protocol tests
npm run test         # Node.js tests only
npm run extension-id
```

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting changes.

## License

[MIT](./LICENSE)

## Disclaimer

This is an independent community project. It is not affiliated with, endorsed by, or maintained by OpenAI. “OpenAI”, “Codex”, and related marks belong to their respective owners. Users are responsible for complying with the terms and usage policies of their configured model provider.
