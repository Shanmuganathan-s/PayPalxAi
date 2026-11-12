# PayPulse - Devpost Submission

## QUICK_DEPLOY_STEPS.md

**Submit in under 10 minutes.** Full checklist: [`QUICK_DEPLOY_AND_SUBMIT.md`](./QUICK_DEPLOY_AND_SUBMIT.md). Deployment detail: [`QUICK_DEPLOY_STEPS.md`](./QUICK_DEPLOY_STEPS.md).

1. Push this repo to GitHub. Do not commit `backend/.env`.
2. In Render, choose **New -> Blueprint** and select the repo. `render.yaml` builds the frontend, installs FastAPI, and serves both from one service.
3. Paste exactly four secrets:

| Environment variable | Source |
| --- | --- |
| `PAYPAL_CLIENT_ID` | Sandbox app credentials in `backend/.env` |
| `PAYPAL_CLIENT_SECRET` | Sandbox app credentials in `backend/.env` |
| `PAYPAL_WEBHOOK_ID` | Current `WH-...` Sandbox webhook ID in `backend/.env` |
| `PAYPULSE_API_KEY` | Generate a strong shared secret |

4. Deploy, then verify `https://paypulse-ai-demo.onrender.com/api/health` and `/api/paypal/status`. Expected: `ok`, `LIVE`, `webhook_configured=true`, `token_ok=true`.
5. Open the dashboard once, run **Reset demo**, then capture or verify the required fields: live URL, repo URL, video URL, and the four gallery images in `screenshots/`.

The blueprint presets `PAYPAL_BASE_URL`, `PAYPAL_WEBHOOK_URL`, `FRONTEND_ORIGIN`, `MAX_REQUEST_BYTES=65536`, `MERGE_LIVE_INVOICES=false`, and `PYTHON_VERSION=3.13.0`. The frontend build bakes `PAYPULSE_API_KEY` into the same-origin bundle so dashboard API calls pass the shared-secret gate.

---

## Elevator pitch

PayPulse is an agentic CFO for PayPal: it invoices, recovers overdue balances with Pay Later, and defends disputes automatically, with a live AG Studio control room.

## Short description

PayPulse turns a receivables book into an autonomous operating loop. Three agents handle billing, collections, and dispute defense through real PayPal Sandbox APIs, while AG Studio gives the operator a live, queryable view of invoices, customers, subscriptions, and cashflow.

## Inspiration

Small finance teams do not need another dashboard that only reports the problem. They need a system that acts on it. A late invoice should trigger a recovery plan, a chargeback should trigger evidence submission, and a new deal should produce an invoice and checkout link without a human stitching together five tools.

PayPulse explores what happens when PayPal's payment primitives are treated as tools for an autonomous finance operator, not just buttons in a checkout flow.

## What it does

PayPulse runs three specialized agents:

1. **Deal & Billing Agent** creates and sends PayPal invoices, creates checkout orders with QR codes, launches subscription plans, and generates financial reports.
2. **Collections Nudge-Bot** finds the highest-value overdue invoice, drafts a customer note, creates a 50% milestone split invoice, creates a PayPal Pay Later checkout order for the outstanding balance, and surfaces both the payer link and QR code.
3. **Dispute-Shield Agent** responds to dispute webhooks, attaches tracking evidence, auto-refunds low-value claims under the configured threshold, and escalates higher-value claims for manual review.

Every flow has a deterministic router, so the demo works with zero model keys. When an OpenAI-compatible model is available, it selects tools and writes customer-facing copy. If the model is offline, slow, or returns invalid arguments, PayPulse falls back deterministically and labels the fallback in the UI.

The operator surface has three views:

- **Command center** - KPI ribbon plus the AG Studio receivables canvas.
- **Deal desk** - agent console, quick playbooks, invoice ledger, QR checkout, and one-click nudges.
- **Webhook room** - signed-shape simulator for dispute, refund, denied capture, paid invoice, and collections sweep events.

A built-in **2:45 Studio Film** presents the product as an interactive operating loop. Eight acts combine neural voiceover, Web Audio cues, live dashboard actions, an X-Ray system map, and a teleprompter. The film resets to the clean seed on open, drives the same invoice, nudge, subscription, and dispute paths as a human operator, then returns to the dashboard.

## How we built it

```text
React + Vite + AG Studio
          |
          |  /api
          v
FastAPI orchestration server
   |          |            |
   |          |            +--> Optional OpenAI-compatible LLM
   |          +---------------> In-memory receivables state
   +--------------------------> PayPal Sandbox REST APIs
                                 - Invoicing
                                 - Checkout Orders
                                 - Subscriptions
                                 - Disputes
                                 - Payments / Refunds
                                 - Webhook signature verification
```

- **Backend:** Python 3.13, FastAPI, httpx, Pydantic.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, AG Studio 3.1, Web Audio, and an eight-act Studio Film engine.
- **PayPal:** OAuth2 client credentials, invoice create/send, order create, subscription plans, dispute evidence, refunds, webhook signature verification.
- **AI:** OpenAI-compatible chat completions with tool calling; local Ollama `qwen3.5:2b` by default.
- **Security:** server-only credentials, optional shared API key, request body limits, fail-closed webhook verification, security headers.

### PayPal integration details

- OAuth2 tokens are cached for 8.5 hours with a safety window.
- `PayPal-Request-Id` is attached to every POST mutation and reused across the 401 retry.
- Sandbox webhooks are reused or created on startup through `ensure_sandbox_webhook`, so the app can receive signed events without a manual dashboard step.
- `PAYPAL_WEBHOOK_ID` remains an optional override. `PAYPAL_WEBHOOK_URL` sets the public URL registered with PayPal.
- If PayPal is configured but no webhook ID can be obtained, the receiver fails closed instead of accepting unverified events.
- `MERGE_LIVE_INVOICES=false` keeps the seeded demo book clean while live invoice writes still work.

### AG Studio integration details

PayPulse embeds AG Studio as the receivables intelligence layer:

- **Sources:** `summary`, `invoices`, `customers`, `subscriptions`, and `cashflow`.
- **Relationships:** `invoices.customer_id -> customers.id` and `subscriptions.customer_id -> customers.id`.
- **Calculated expressions:** collection rate (`paid_amount / issued_amount`), invoice outstanding balance (`issued_amount - paid_amount`), and portfolio outstanding balance.
- **Report presets:** Executive cashflow, Overdue & BNPL, and Subscriptions. Each preset switches the report state and applies a focused filter.
- **Widgets:** six KPI cards, outstanding-by-customer, status mix, MRR by plan, invoice ledger, subscription book, and trailing six-month cashflow.

### Studio Film integration details

- **Eight acts:** command center, AG Studio, invoice plus QR, subscription, collections, dispute, isometric system map, and split finale.
- **Real actions:** the film calls the same dashboard prompt, invoice QR, nudge, and webhook simulator handlers as the operator.
- **Audio:** eight `en-US-AndrewNeural` voiceovers plus a manifest-driven cue track, with mute and replay controls.
- **Direction:** camera focus, synthetic cursor, teleprompter captions, X-Ray callouts, and a live act progress rail.
- **Safety:** the film resets the seed on open so every run is deterministic; run Reset demo after a session. Reduced-motion users can still read every act.

## APIMatic Context Plugin

We used the APIMatic Context Plugin as an API-context reference while shaping the PayPal integration. It helped keep the API surface organized around clear operations, request and response shapes, and error handling. That context informed the typed backend client, the frontend API layer, and the fallback behavior that keeps demos running when a live PayPal call is unavailable.

## Challenges we ran into

- **Demo resilience:** A live payment demo cannot fail because of a missing token, a slow model, or a sandbox hiccup. We built deterministic fallbacks for every agent action and made the UI label simulated artifacts honestly.
- **Webhook trust:** A webhook endpoint that accepts unverified events is worse than one that is temporarily unavailable. We made verification fail closed when PayPal is live, while keeping the local simulator separate from the real receiver.
- **Collection logic:** A useful nudge needs both a customer-ready message and a payable artifact. We paired the 50% split invoice with a real PayPal order and QR code so the customer can act immediately.
- **Analytics depth:** A static chart is not enough for a hackathon judge. We used AG Studio relationships, expression fields, and presets to make the receivables book explorable without shipping a separate BI tool.
- **Small-model reliability:** Local models sometimes return malformed tool arguments or truncated customer copy. We added output sanitization, amount/email reconciliation, and deterministic fallback.

## Accomplishments that we are proud of

- End-to-end PayPal Sandbox flows for invoices, orders, subscriptions, disputes, refunds, and webhooks.
- A webhook setup path that is automatic in Sandbox and still safe in production.
- A clean split between agent actions, deterministic routing, and optional LLM copywriting.
- An AG Studio report with five sources, explicit relationships, calculated fields, and one-click presets.
- Security gates: Bandit 0, pip-audit 0, npm audit 0, 64 KiB body limit, optional API key, fail-closed webhooks.
- A polished demo that resets to a known state: 5 invoices, 2 logs, $7,920.00 invoiced, $4,710.00 paid, $2,750.00 overdue, 59.5% collection rate.

## What we learned

- Payment agents need deterministic guardrails around probabilistic tools.
- The most useful agent output is not a paragraph; it is a payable artifact plus a clear next action.
- Webhook verification, idempotency, and mode labeling are product features, not implementation details.
- AG Studio expressions and relationships turn a flat dashboard into a small analytical application.
- Local models are good enough for copywriting and tool selection when the fallback path is excellent.

## What's next

- Persist receivables state in Postgres instead of memory.
- Add merchant-defined collection policies and approval limits.
- Add multi-tenant authentication and role-based access.
- Expand dispute evidence automation with richer document templates.
- Add webhook replay protection and delivery monitoring.
- Ship a production PayPal app review checklist and least-privilege credential guide.

## Built with

`python`, `fastapi`, `httpx`, `pydantic`, `react`, `typescript`, `vite`, `tailwindcss`, `web-audio`, `ag-studio`, `paypal-rest-api`, `paypal-sandbox`, `paypal-invoicing`, `paypal-orders`, `paypal-subscriptions`, `paypal-disputes`, `paypal-webhooks`, `ollama`, `qwen3.5`, `apimatic-context-plugin`

## Try it

- Live demo: `https://paypulse-ai-demo.onrender.com` (deploy with the quick steps above, then verify)
- Source code: `[Add repository URL]`
- Demo video: `[Add video URL]`
- Gallery: `screenshots/01-command-center.png`, `screenshots/02-deal-desk-spotlight.png`, `screenshots/03-webhook-room-xray-dock.png`, and `screenshots/04-isometric-matrix-finale.png`. All four are `1920x1080`.

### Local demo

```powershell
cd backend
py -3.13 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --port 8000
```

```powershell
cd frontend
npm install
npm run build
```

Open `http://127.0.0.1:8000`. The backend serves the built frontend and the API from one origin.

## Partner prize answers

### Best Use of PayPal APIs

PayPulse uses PayPal as the operating system for receivables, not just as a checkout button:

- Invoicing: create, send, QR, payer view links.
- Orders: checkout orders with approve links for invoice and recovery flows.
- Subscriptions: plan creation with recurring pricing.
- Disputes: evidence submission with tracking documents.
- Payments: refunds and capture events.
- Webhooks: signature verification with fail-closed behavior.
- Sandbox operations: automatic webhook discovery/creation and mode-aware fallbacks.

### Best Use of AG Studio

PayPulse embeds AG Studio as the live receivables control room:

- Five related data sources.
- Explicit invoice-to-customer and subscription-to-customer relationships.
- Calculated fields for collection rate and outstanding balance.
- Three quick-switch report presets.
- KPI, chart, grid, and cashflow widgets in a 24-column layout.
- Cross-filtering and drill-down behavior available to the operator.

### Best Use of the APIMatic Context Plugin

The APIMatic Context Plugin informed the API contract and integration structure. It helped us keep PayPal operations grouped, typed, and predictable across a large surface area, and it shaped the error and fallback paths that keep the demo reliable.

### Security and fintech prize

- Credentials stay server-side.
- Optional `X-API-Key` gate for direct API access.
- 64 KiB request limit, including chunked requests.
- Security headers on responses.
- Fail-closed PayPal webhook verification.
- Idempotent `PayPal-Request-Id` on POST mutations.
- Explicit LIVE vs SIMULATED labeling in the UI.

## Submission checklist

- [ ] Add deployed URL after the Render deploy.
- [ ] Add repository URL.
- [ ] Add demo video URL.
- [x] Confirm `frontend/dist` is built from the current source.
- [x] Confirm backend is running and `/api/health` returns `ok`.
- [x] Run `POST /api/demo/reset`.
- [x] Confirm 5 invoices, 2 logs, $7,920.00 invoiced, $4,710.00 paid, $2,750.00 overdue, 59.5% collection rate.
- [x] Confirm the webhook receiver rejects an unsigned live event.
- [x] Confirm `webhook_configured=true` and `token_ok=true` against the target webhook URL.
- [x] Confirm four 1920x1080 gallery images and a 22/22 screenshot audit report.
- [x] Confirm the Studio Film reaches all eight acts, plays all eight voiceovers, and exits cleanly.
- [x] Confirm `QUICK_DEPLOY_AND_SUBMIT.md` matches the current Render and submission flow.
- [x] Confirm `render.yaml` builds the frontend and starts FastAPI on `$PORT`.
- [x] Confirm Bandit 0, pip-audit 0, npm audit 0.


