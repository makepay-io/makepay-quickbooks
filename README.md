# MakePay QuickBooks Connector

QuickBooks Online connector for creating MakePay payment links from QuickBooks invoices and reconciling paid MakePay events back as QuickBooks Payments.

## Features

- Intuit OAuth 2.0 connect and callback endpoints
- In-memory token and payment mapping store for local development
- Admin endpoint to create a MakePay payment link for a QuickBooks invoice
- Signed MakePay webhook verification
- QuickBooks Payment creation against the linked invoice after MakePay payment confirmation

## Environment

Copy `.env.example` to `.env` and configure:

- `INTUIT_CLIENT_ID`
- `INTUIT_CLIENT_SECRET`
- `PUBLIC_APP_URL`
- `MAKEPAY_KEY_ID`
- `MAKEPAY_KEY_SECRET`
- `MAKEPAY_WEBHOOK_SECRET`
- `ADMIN_TOKEN`

Use `INTUIT_ENVIRONMENT=sandbox` for sandbox companies and `production` for live companies.

## Development

```sh
npm ci
npm run validate
npm run dev
```

Register this redirect URI in the Intuit Developer app:

```text
https://your-app.example/oauth/callback
```

Configure MakePay webhooks to:

```text
https://your-app.example/webhooks/makepay
```

## Storage

`MemoryRepository` is for local development only. Replace it with a durable database-backed repository before production use.
