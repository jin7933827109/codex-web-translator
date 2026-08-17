# Contributing

Thanks for helping improve Codex Web Translator.

## Before opening a pull request

1. Keep the extension permission set minimal.
2. Treat content-script messages and webpage text as untrusted input.
3. Never place API keys, tokens, cookies, browsing data, or personal paths in the repository.
4. Never insert model output with `innerHTML`; translations must remain text-only.
5. Keep native-host validation at least as strict as extension-side validation.
6. Update both `README.md` and `README.zh-CN.md` when installation or user-facing behavior changes.
7. Run `npm run verify`.

## Development setup

There are no npm runtime dependencies. Install Node.js 18 or newer, clone the repository, and run the verification suite.

For real browser testing on macOS:

```bash
npm run install-host
npm run demo
```

Load `extension/` as an unpacked Chrome extension. After changing the native host, rerun `npm run install-host`. After changing extension files, click **Reload** in `chrome://extensions`.

## Pull requests

- Keep changes focused.
- Explain user impact and security implications.
- Include manual verification notes for changes to extraction or DOM insertion.
- Do not include translated private webpages, authentication material, or browsing screenshots containing private data.
