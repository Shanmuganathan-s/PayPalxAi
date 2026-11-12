# PayPulse - Quick Deploy and Submit

Target URL: `https://paypulse-ai-demo.onrender.com`

Use this checklist for the final Render deploy, gallery verification, and Devpost submission. The detailed environment notes remain in `QUICK_DEPLOY_STEPS.md`.

## 1. Before deploy

- Confirm `backend/.env` is not staged or committed.
- Confirm `frontend/dist` is built from current source with `npm run build`.
- Confirm the local gallery exists at `screenshots/01-command-center.png`, `02-deal-desk-spotlight.png`, `03-webhook-room-xray-dock.png`, and `04-isometric-matrix-finale.png`.
- Confirm `screenshots/capture-report.json` shows no failed checks.
- Generate a strong `PAYPULSE_API_KEY` in a password manager.

## 2. Push the repository

```powershell
git status
git add .
git commit -m "Finalize PayPulse Studio Film demo"
git push
```

Do not commit `.env`, secrets, tokens, or local browser profiles.

## 3. Create the Render blueprint

1. Open Render Dashboard -> **New** -> **Blueprint**.
2. Select the PayPulse repository.
3. Keep the free plan for the hackathon demo.
4. Render reads `render.yaml` and creates `paypulse-ai-demo`.

The blueprint runs:

```bash
cd frontend && npm ci && VITE_PAYPULSE_API_KEY="$PAYPULSE_API_KEY" npm run build && cd .. && pip install -r backend/requirements.txt
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 4. Paste exactly four secrets

| Render variable | Source |
| --- | --- |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox app |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox app |
| `PAYPAL_WEBHOOK_ID` | Current `WH-...` Sandbox webhook ID |
| `PAYPULSE_API_KEY` | New strong shared secret |

`render.yaml` already supplies:

- `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`
- `PAYPAL_WEBHOOK_URL=https://paypulse-ai-demo.onrender.com/api/webhooks/paypal`
- `FRONTEND_ORIGIN=https://paypulse-ai-demo.onrender.com`
- `MAX_REQUEST_BYTES=65536`
- `MERGE_LIVE_INVOICES=false`
- `PYTHON_VERSION=3.13.0`

## 5. Verify the deployment

Open:

- `https://paypulse-ai-demo.onrender.com/api/health`
- `https://paypulse-ai-demo.onrender.com/api/paypal/status`
- `https://paypulse-ai-demo.onrender.com/`
- `https://paypulse-ai-demo.onrender.com/docs`

Expected:

- `/api/health` returns `ok`, `mode=LIVE`, `paypal_configured=true`, `invoices=5`, `agent_logs=2`.
- `/api/paypal/status` returns `configured=true`, `token_ok=true`, `webhook_configured=true`, `mode=LIVE`.
- The dashboard shows `$7,920.00` invoiced, `$4,710.00` paid, `$2,750.00` overdue, and `59.5%` collection rate.
- An unsigned live webhook is rejected with `400`.
- A signed Sandbox test delivery reaches `/api/webhooks/paypal` after the service is live.

If webhook verification is not configured, either keep the provisioned `PAYPAL_WEBHOOK_ID`, or start once without it so startup creates a webhook for `PAYPAL_WEBHOOK_URL`, then copy the generated ID into Render.

## 6. Verify the product surfaces

1. Open **Command center** and confirm the six KPI cards, AG Studio canvas, and header film button.
2. Click a status filter in AG Studio and confirm the cross-filter updates the grids.
3. Open **Deal desk**, create the `$450` Alex Mercer invoice, and open its PayPal QR.
4. Open **Webhook room** and run **Chargeback filed** and **Invoice paid**.
5. Click **Watch 2:45 Studio Film** and confirm:
   - all eight acts advance
   - all eight voiceovers load
   - the Act 03 QR opens
   - the Act 04 QR closes
   - the Act 07 matrix lights all eight tiles
   - the Act 08 finale shows replay
6. Exit the film and confirm the dashboard is still interactive.

## 7. Verify the gallery

Required files at `1920x1080`:

- `screenshots/01-command-center.png`
- `screenshots/02-deal-desk-spotlight.png`
- `screenshots/03-webhook-room-xray-dock.png`
- `screenshots/04-isometric-matrix-finale.png`

`capture-report.json` must show 41/41 checks passed, zero console errors, zero page errors, zero failed requests, and zero HTTP errors.

## 8. Final Devpost fields

- Live demo: `https://paypulse-ai-demo.onrender.com`
- Source code: repository URL
- Demo video: uploaded video URL
- Gallery: the four files in `screenshots/`
- Built with: include `paypal-rest-api`, `paypal-webhooks`, `ag-studio`, `web-audio`, `react`, `fastapi`

## 9. Final reset

Run:

```powershell
Invoke-RestMethod -Method Post -Uri "https://paypulse-ai-demo.onrender.com/api/demo/reset"
Invoke-RestMethod -Method Get -Uri "https://paypulse-ai-demo.onrender.com/api/dashboard-data" | ConvertTo-Json -Depth 4
```

Confirm:

- invoices: `5`
- agent logs: `2`
- invoiced: `$7,920.00`
- paid: `$4,710.00`
- overdue: `$2,750.00`
- collection rate: `59.5%`

Do not leave test invoices or simulator events in the final demo state.

## 10. Known caveats

- AG Studio 3.1 shows its commercial trial watermark because the hackathon build does not include a license key.
- The free Render service can cold start. Open the URL once before judging.
- `PAYPULSE_API_KEY` is a shared-secret API gate, not user authentication.
- Rotate the shared key if it is exposed, then rebuild the frontend so `VITE_PAYPULSE_API_KEY` matches.

