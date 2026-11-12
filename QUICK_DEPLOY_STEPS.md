# PayPulse - Quick Deploy on Render

Target URL: `https://paypulse-ai-demo.onrender.com`

The checked-in `render.yaml` builds the React frontend, installs the FastAPI backend, and serves both from one Render web service. The frontend build receives the shared API key at build time, so same-origin dashboard requests pass the API gate.

## 1. Push the repository

Push this folder to a GitHub repository. Do not commit `backend/.env`.

## 2. Create the Render Blueprint

1. Open Render Dashboard -> **New** -> **Blueprint**.
2. Select the repository.
3. Render reads `render.yaml` and creates the `paypulse-ai-demo` web service.
4. Keep the free plan for the demo.

## 3. Paste exactly these four secrets

| Render environment variable | Value |
| --- | --- |
| `PAYPAL_CLIENT_ID` | Sandbox Client ID from `backend/.env` or the PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | Sandbox Secret from `backend/.env` or the PayPal Developer Dashboard |
| `PAYPAL_WEBHOOK_ID` | The `WH-...` / Sandbox webhook ID currently stored in `backend/.env` |
| `PAYPULSE_API_KEY` | Generate a strong shared secret, for example with a password manager |

Everything else is already set by `render.yaml`:

- `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`
- `PAYPAL_WEBHOOK_URL=https://paypulse-ai-demo.onrender.com/api/webhooks/paypal`
- `FRONTEND_ORIGIN=https://paypulse-ai-demo.onrender.com`
- `MAX_REQUEST_BYTES=65536`
- `MERGE_LIVE_INVOICES=false`
- `PYTHON_VERSION=3.13.0`

The build command is:

```bash
cd frontend && npm ci && VITE_PAYPULSE_API_KEY="$PAYPULSE_API_KEY" npm run build && cd .. && pip install -r backend/requirements.txt
```

The start command is:

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 4. Verify the deployment

Open these URLs after the first deploy:

- `https://paypulse-ai-demo.onrender.com/api/health`
- `https://paypulse-ai-demo.onrender.com/api/paypal/status`
- `https://paypulse-ai-demo.onrender.com/`
- `https://paypulse-ai-demo.onrender.com/docs`

Expected status:

- `/api/health` returns `ok`, `mode=LIVE`, `paypal_configured=true`, `invoices=5`, `agent_logs=2`.
- `/api/paypal/status` returns `configured=true`, `token_ok=true`, `webhook_configured=true`, `mode=LIVE`.
- The dashboard shows `$7,920.00` invoiced, `$4,710.00` paid, `$2,750.00` overdue, `59.5%` collection rate.

If the webhook URL is not registered yet, either:

1. keep the already-provisioned `PAYPAL_WEBHOOK_ID` and ensure its PayPal URL is `https://paypulse-ai-demo.onrender.com/api/webhooks/paypal`, or
2. start the service once without `PAYPAL_WEBHOOK_ID` so startup creates a webhook for `PAYPAL_WEBHOOK_URL`, then copy the generated ID into Render.

## 5. Final Devpost fields

- Live demo: `https://paypulse-ai-demo.onrender.com`
- Source code: repository URL
- Demo video: uploaded video URL
- Gallery: `screenshots/01-command-center.png`, `screenshots/02-deal-desk-spotlight.png`, `screenshots/03-webhook-room-xray-dock.png`, and `screenshots/04-isometric-matrix-finale.png`

## 6. Security note

`PAYPULSE_API_KEY` is a shared-secret API gate, not a user login system. The frontend build receives the same value so the same-origin dashboard can call the API. Put any public production deployment behind an authentication proxy, restrict CORS, and rotate the shared key if it is exposed.
