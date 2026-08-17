# Security Policy

## Supported version

Security fixes are applied to the latest version on the default branch.

## Reporting a vulnerability

Please do not open a public issue for vulnerabilities involving command execution, message validation bypasses, data exposure, extension permission escalation, or prompt injection.

Use [GitHub private vulnerability reporting](https://github.com/jin7933827109/codex-web-translator/security/advisories/new). Include the affected version, reproduction steps, observed impact, and a suggested mitigation if available.

Do not include real passwords, API keys, cookies, private webpage content, or other sensitive data in the report.

## Security model

The project assumes webpage text and content-script messages are untrusted. Privileged native actions must be independently validated by the extension service worker and native host. Codex runs must remain ephemeral, read-only, tool-restricted, schema-constrained, and isolated from user workspaces.
