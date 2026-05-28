# Security Policy

## Reporting

Report security issues to info@makepay.io.

## Secrets

- Store Intuit OAuth credentials, refresh tokens, and MakePay keys in a secret manager or encrypted database.
- Verify MakePay webhook signatures before creating QuickBooks Payments.
- Do not log OAuth tokens, MakePay key secrets, invoice payloads, or raw production webhook bodies.
