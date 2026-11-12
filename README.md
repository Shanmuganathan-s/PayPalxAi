# PayPulse

**Autonomous agentic CFO, deal desk, and dispute shield for PayPal.**

[![Live Demo](https://img.shields.io/badge/Demo-Interactive%20Studio%20Film-0070BA?style=flat-square)](https://github.com/Shanmuganathan-s/PayPalxAi)
[![PayPal](https://img.shields.io/badge/PayPal-Sandbox%20Live-001C64?style=flat-square)](https://developer.paypal.com/)
[![Local AI](https://img.shields.io/badge/Ollama-qwen3.5%3A2b%20Offline--Safe-166534?style=flat-square)](https://ollama.com/)
[![Security](https://img.shields.io/badge/Security-Zero%20CVE%20%7C%20Bandit%200-166534?style=flat-square)](https://github.com/Shanmuganathan-s/PayPalxAi)

PayPulse turns a receivables book into an autonomous operating loop: it invoices customers, launches subscriptions, collects overdue balances with 50% milestones + PayPal Pay Later, and defends disputes with tracking evidence. An embedded **AG Studio 3.1** canvas provides live portfolio analytics, cross-filtering, and drill-down grids.

Built for the PayPal x AI hackathon with FastAPI, React, PayPal Sandbox APIs, local Ollama, and AG Studio.

---

## What it does

| Agent | Responsibility | Trigger |
| --- | --- | --- |
| **Deal & Billing Agent** | Converts natural language to live PayPal Invoices v2, Checkout Orders v2, Catalog Subscriptions, and QR codes | Chat or playbook |
| **Collections Nudge-Bot** | Targets overdue receivables, writes empathetic recovery notes, provisions 50% milestone split invoices + PayPal Pay Later | Chat, playbook, ledger action |
| **Dispute-Shield Agent** | Validates delivery, uploads multipart carrier evidence to PayPal Disputes API, auto-refunds claims under $25 | PayPal webhook or signed simulator |

The deterministic router is the source of truth, so every flow works with **zero API keys**. When an OpenAI-compatible endpoint is configured (such as local Ollama `qwen3.5:2b`), the LLM executes tools and writes customer-facing copy: collection notes, invoice memos, and dispute evidence briefs. If the model is offline, slow, or stopped, PayPulse seamlessly falls back to deterministic routing without failure.

### Key Features & UI Surfaces

- **Financial Command Center** - Continuous Financial Ledger Ribbon, live AG Studio 3.1 relational receivables canvas (6 KPIs, 3 charts, 2 grids, cashflow trend), quick-action rail, and live service posture.
- **Deal Desk** - Natural language agent console with instant playbooks, runtime credential posture, invoice ledger, QR checkout modals, and one-click recovery nudges.
- **Webhook Room** - Signed PayPal webhook simulator for five unhappy/paid paths, structured event inspector with real-time latency and status codes, filters, and autopilot guardrails.
- **2:42 Cinema Studio Film** - Built-in interactive product walkthrough with eight acts, neural voiceover, Web Audio cues, live agent actions, bottom broadcast X-Ray dock, dynamic real-time spotlight tracking, and 3D isometric architecture finale.

---

## Quick Start & Installation

### Prerequisites

- **Python:** 3.11+ (Python 3.13 recommended)
- **Node.js:** 20+ and npm
- **Local AI (Optional, $0):** [Ollama](https://ollama.com/) running `qwen3.5:2b`

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Shanmuganathan-s/PayPalxAi.git
cd PayPalxAi
```

---

### Step 2: Backend Setup (FastAPI)

#### Windows (PowerShell):
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

#### macOS / Linux:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

* API Docs & Swagger UI will be available at: `http://127.0.0.1:8000/docs`

---

### Step 3: Frontend Setup (React 19 + Vite)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

* Open `http://localhost:5173` to explore the live dashboard with hot-module reload.

---

### Step 4: Single-Origin Production Mode (Recommended)

To run the entire app from a single port without needing two terminals:

```bash
cd frontend
npm run build
```

Then start the FastAPI backend:
```bash
cd ../backend
uvicorn main:app --host 127.0.0.1 --port 8000
```
FastAPI serves the built frontend directly at `http://127.0.0.1:8000/` while keeping `/api/*` and `/docs` active.

---

### Step 5: Optional Local AI Brain (Ollama)

To enable local tool-calling and AI text generation without paying cloud API fees:

1. Install and start Ollama:
   ```bash
   ollama serve
   ollama pull qwen3.5:2b
   ```
2. In `backend/.env`, set:
   ```ini
   LLM_BASE_URL=http://127.0.0.1:11434/v1
   LLM_API_KEY=ollama
   LLM_MODEL=qwen3.5:2b
   ```
*If Ollama is stopped, PayPulse automatically engages its deterministic router so all features continue to operate.*
cd frontend
npm run build
```

Then restart the backend. FastAPI serves `frontend/dist` at http://localhost:8000/ while keeping `/api` and `/docs` available.

---

## PayPal configuration

Set these in `backend/.env`:

```dotenv
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=optional_webhook_id
PAYPAL_WEBHOOK_URL=https://your-public-host/api/webhooks/paypal
```

- With valid credentials, invoice creation, QR payloads, orders, subscriptions, refunds, and evidence submission use the PayPal Sandbox REST APIs.
- With missing/incomplete credentials, the same flows return deterministic SIMULATED artifacts and the UI clearly labels them.
- On startup, PayPulse reuses an existing Sandbox webhook or creates one automatically for `PAYPAL_WEBHOOK_URL`, then keeps the returned ID in memory. `PAYPAL_WEBHOOK_ID` still overrides that behavior when set.
- If PayPal credentials are configured but no webhook ID can be obtained, `/api/webhooks/paypal` rejects unverified events. Signature checks are skipped only while PayPal itself is unconfigured (simulated mode).
- `POST /api/paypal/ensure-webhook` runs the same setup on demand. It is local-only unless `PAYPULSE_API_KEY` is configured, in which case the normal API-key gate applies.
- `MERGE_LIVE_INVOICES=true` hydrates every invoice already in the Sandbox account; `false` keeps the seeded demo book clean while live invoice writes still work.

### AI brain (local Ollama, $0)

PayPulse speaks the OpenAI chat-completions protocol, so it works with Ollama locally or any hosted OpenAI-compatible provider.

```powershell
ollama serve
ollama pull qwen3.5:2b
```

```dotenv
OPENAI_API_KEY=ollama
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=qwen3.5:2b
LLM_PROVIDER=ollama
LLM_TIMEOUT=60
LLM_AUTO_MODEL=true
LLM_REASONING_EFFORT=none
```

- `qwen3.5:2b` is the CPU-friendly default. Use `qwen3.5:4b` or `qwen3.5:latest` when you have more RAM/GPU.
- `LLM_REASONING_EFFORT=none` disables Qwen3.5's hidden reasoning so customer copy completes quickly and is not truncated. Use `low` for more deliberation.
- `LLM_AUTO_MODEL=true` picks the best installed local model when the configured one is missing.
- The backend injects the live dashboard snapshot into the prompt, sanitizes small-model output, and reconciles amounts, emails, and invoice references against the user's request.
- AI-generated collection notes are attached to PayPal invoices; AI-generated evidence briefs are submitted with disputes.
- The UI shows `LLM tools`, `LLM offline`, or `Deterministic`. Stop Ollama to demo graceful fallback.

Cloud alternative (for example Groq):

```dotenv
OPENAI_API_KEY=your_groq_key
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

Leave `OPENAI_API_KEY` empty for deterministic-only intent routing. `GET /api/llm/status` reports reachability, available models, and the active model.

Never commit `backend/.env`.

---

## Demo flow

1. Open **Command center** and inspect the AG Studio canvas: KPI widgets, status mix, outstanding-by-customer, MRR by plan, invoice/subscription grids, trailing cashflow.
2. Open **Deal desk** and run a playbook:
   - `Invoice Acme Robotics $1,450 ...` creates an invoice + checkout order + QR.
   - `Create a $299 monthly telemetry retainer ...` creates a subscription plan.
   - `Nudge the top overdue invoice ...` creates a 50% split invoice with QR.
   - `Build dispute evidence for a $480 chargeback ...` submits tracking evidence.
3. Click **Payment QR** on an agent result or the QR icon in the ledger to open the checkout modal.
4. Click **Nudge** on any open ledger row to target that exact invoice.
5. Open **Webhook room** and fire:
   - **Chargeback filed** -> evidence submitted.
   - **Low-value refund** -> instant refund under the $25 threshold.
   - **Capture denied** -> manual review above threshold.
   - **Invoice paid** -> next open invoice reconciled.
   - **Collections sweep** -> Pay Later split dispatch.
6. Click **Watch 2:45 Studio Film** to run the guided product film. The film resets the seed, drives the real dashboard actions, and exits back to the dashboard.
7. Use **Reset demo** to restore the seeded book.

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health, mode, credential and entity counts |
| `GET` | `/api/paypal/status` | PayPal configuration/token/webhook state |
| `POST` | `/api/paypal/ensure-webhook` | Reuse or create the Sandbox webhook |
| `GET` | `/api/llm/status` | LLM posture and fallback info |
| `GET` | `/api/dashboard-data` | Customers, invoices, subscriptions, logs, summary |
| `GET` | `/api/invoices/{invoice_id}/qr` | Invoice QR image + payer link |
| `POST` | `/api/agent/chat` | `{ "prompt": "..." }` agent run |
| `POST` | `/api/webhooks/paypal` | PayPal webhook receiver |
| `POST` | `/api/demo/simulate-webhook` | `{ "scenario": "DISPUTE" }` |
| `POST` | `/api/demo/reset` | Restore seeded state |

Simulator scenarios: `DISPUTE`, `REFUND`, `DENIED`, `PAID`, `NUDGE`.

---

## Project layout

```text
PaypalxAI/
|-- backend/
|   |-- main.py                 # FastAPI routes, webhook receiver, static hosting
|   |-- agent_orchestrator.py   # 3 agents, deterministic router, optional LLM tools
|   |-- paypal_client.py        # PayPal REST client + sandbox/simulated fallbacks
|   |-- state.py                # Seeded in-memory receivables book
|   |-- requirements.txt
|   `-- .env.example
|-- frontend/
|   |-- src/
|   |   |-- App.tsx             # Shell, navigation, orchestration, toasts
|   |   |-- studioConfig.ts     # AG Studio sources, relationships, widgets, layout
|   |   |-- paypalTheme.ts      # AG Studio theme
|   |   |-- components/         # Agent console, QR modal, ledger, simulator, feed...
|   |   `-- lib/                # Typed API client and formatting
|   |-- public/favicon.svg      # Flat site icon
|   |-- public/terms.html       # Terms of Service page
|   |-- public/privacy.html     # Privacy Policy page
|   `-- package.json
|-- screenshots/                # 1920x1080 Devpost gallery + capture report
|-- render.yaml                 # Single-service Render blueprint
|-- QUICK_DEPLOY_STEPS.md
`-- README.md
```

---

## Design notes

- Dashboard state is stored in memory and reset on backend restart; **Reset demo** restores the same seed without a restart.
- The AG Studio model uses five sources (`summary`, `invoices`, `customers`, `subscriptions`, `cashflow`) with relationships from invoices/subscriptions to customers.
- AG Studio expression fields calculate collection rate (`paid_amount / issued_amount`), invoice outstanding balance (`issued_amount - paid_amount`), and portfolio outstanding balance.
- The report has three quick-switch presets: Executive cashflow, Overdue & BNPL, and Subscriptions.
- AG Studio fields are table-qualified (`invoices.customer_id`, `summary.total_paid`, etc.).
- AG Studio runs in `view` mode with an explicit 24-column layout and a commercial trial watermark (no license key required for the hackathon).
- PayPal artifacts are simulated with deterministic QR content when credentials are inactive; the UI never hides which mode produced a result.
- The dashboard uses a 70/30 Split Operations Desk, a continuous KPI ledger ribbon, real skeleton loading states, and a thin sticky footer with separate Terms of Service and Privacy Policy links.
- Studio Film runs inside the live app, not in a video player. It drives real buttons, real invoices, real webhooks, and real agent calls, while narration, captions, and sound cues stay synchronized from the audio manifest.
- AG Studio inherits the light institutional theme, including square widget corners and no canvas or widget shadows.
- The frontend bundle is large because AG Studio is embedded; this is expected for a demo build.

---

## Verification

Current local verification:

- `npm run build` passes TypeScript strict checks and Vite production build.
- Backend smoke tests pass for health, dashboard, PayPal/LLM status, invoice QR, chat intents, live-mode webhook rejection, all five simulator scenarios, reset, and 400/404/413 error paths.
- Live Sandbox verification: PayPal OAuth token, Sandbox webhook auto-setup/reuse, invoice creation/send, checkout order with approve URL and quantity 1, and QR generation all succeeded with real Sandbox credentials.
- `POST /api/paypal/ensure-webhook` returns `SUCCESS`; `/api/paypal/status` reports `webhook_configured: true` against `https://paypulse-ai-demo.onrender.com/api/webhooks/paypal`; an unsigned live webhook returns `400`.
- AI verification with local `qwen3.5:2b`: tool selection for reports/invoices, AI-drafted collection notes, AI dispute evidence briefs, model status reporting, and deterministic fallback with Ollama stopped.
- Playwright smoke tests pass 26/26 at 1440x1000 and 390x844 after the light institutional redesign: command center, all three AG Studio presets, calculated columns, deal desk, QR modal, webhook simulator, reset, and no horizontal page overflow. No unexpected console errors, page errors, failed requests, or HTTP 4xx/5xx responses.
- AG Studio preset verification: Overdue & BNPL filters the ledger to `PP-2026-002`, `PP-2026-004`, and `PP-2026-005`; Subscriptions keeps the subscription book visible; Executive cashflow restores the full book.
- Responsive checks pass at 320, 390, 768, 1024, 1280, and 1440 widths with zero horizontal overflow. The sticky footer is 31px tall on desktop and mobile.
- Design regression checks pass: no violet/fuchsia UI colors, no gradients or glass effects, no soft shadows, no oversized corners, no pill-shaped buttons, no lucide icons, no page-rise animation, no em dash or emoji text, and concrete operational copy.
- Security checks pass: Bandit 0, pip-audit 0 vulnerabilities across 24 dependencies, npm audit 0 vulnerabilities across 175 dependencies, oversized bodies return `413`, and responses include `nosniff`, `DENY`, `no-referrer`, and permissions headers.
- Terms of Service loads at `/terms.html` and Privacy Policy loads at `/privacy.html`; both use the light institutional design and are linked from the dashboard footer. The flat `favicon.svg` is linked and served.
- Devpost gallery is captured at 1920x1080 in `screenshots/`: Command Center, AG Studio deep dive with an active cross-filter, Deal Desk with a live $450 invoice and QR checkout, and the Studio Film isometric matrix. `screenshots/capture-report.json` records 22/22 automated layout checks with no overflow, missing images, console errors, page errors, failed requests, or HTTP errors.
- Studio Film verification: all eight acts reached at 1920x1080, the Act 03 QR opened and the Act 04 QR closed on cue, all eight voiceover MP3s returned `200` or `206`, teleprompter and X-Ray stayed visible, the Act 07 matrix lit all eight tiles, and the finale exposed replay. The film resets the seed on open, uses the real dashboard and agent flows, and returns control to the dashboard. Run Reset demo after a session.
- `render.yaml` is a single-service Render blueprint: it runs `npm ci` + `npm run build`, installs the backend, and starts FastAPI on `$PORT`. The checked YAML defines the target webhook URL, sandbox API base, same-origin frontend, 64 KiB body limit, and a clean seeded book.

## Security

- PayPal and model credentials stay server-side in `backend/.env` or hosting secrets; they are never bundled into the frontend.
- `PAYPULSE_API_KEY` is strongly recommended. When set, direct `/api/*` calls require `X-API-Key`, except `/api/health` and the PayPal webhook. Set the matching `VITE_PAYPULSE_API_KEY` at frontend build time. This is a shared-secret gate, not user authentication.
- Set `PAYPAL_WEBHOOK_ID` to enforce webhook signatures, or let startup reuse/create a Sandbox webhook automatically. If PayPal is configured and no ID can be obtained, webhook requests are rejected instead of accepted unverified.
- POST mutations use an idempotent `PayPal-Request-Id` that is reused across the token-refresh retry.
- Request bodies are limited to 64 KiB by default (`MAX_REQUEST_BYTES`), including chunked requests, and responses include basic security headers.
- The standalone server binds to `127.0.0.1` by default. Use the hosting start command when exposing the service.
- Do not expose this demo publicly without an authentication proxy, restricted CORS origins, and monitoring. Anyone who can call the API can run sandbox actions and consume model tokens.

## Deployment

`render.yaml` defines one Render web service for the demo. It builds the React frontend and serves it from FastAPI, so the dashboard and API share an origin:

```bash
cd frontend && npm ci && VITE_PAYPULSE_API_KEY="$PAYPULSE_API_KEY" npm run build && cd .. && pip install -r backend/requirements.txt
```

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

The target demo URL is `https://paypulse-ai-demo.onrender.com`. Paste exactly four secrets into Render: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, and `PAYPULSE_API_KEY`. The blueprint supplies the Sandbox API base, webhook URL, frontend origin, 64 KiB body limit, and `MERGE_LIVE_INVOICES=false` for a clean seed.

See `QUICK_DEPLOY_AND_SUBMIT.md` for the final deploy, film, gallery, and Devpost checklist. See `QUICK_DEPLOY_STEPS.md` for detailed environment notes and webhook recovery. Set PayPal secrets in the hosting dashboard, never in the repo.



