# PayPulse Demo Video Script

Target length: 2:45. Format: 1440p desktop capture with a short 390px mobile check. No credentials, no terminal secrets, no em dashes, no emojis.

PayPulse also ships a built-in 2:45 interactive Studio Film, launched from the header. Use it as a self-running demo asset or as a fallback recording: it resets to the clean seed, drives real dashboard actions, plays eight voiceovers, and shows an X-Ray system map. The script below is for a separate human-narrated walkthrough.

## Recording setup

1. Start the backend and confirm `http://127.0.0.1:8000/api/health` returns `ok`.
2. Start Ollama and confirm `http://127.0.0.1:8000/api/llm/status` returns `configured: true` and `reachable: true`. If Ollama is offline, the deterministic fallback is still valid; skip the model-tools line.
3. Confirm `http://127.0.0.1:8000/api/paypal/status` returns `configured: true`, `token_ok: true`, and `webhook_configured: true`.
4. Open `http://127.0.0.1:8000` in a clean browser window at 1440x1000.
5. Go to **Webhook room** and click **Reset demo**.
6. Confirm the KPI ribbon shows:
   - Invoiced: `$7,920.00`
   - Collected: `$4,710.00`
   - Overdue: `$2,750.00`
   - Collection rate: `59.5%`
   - Invoices: `5`
   - Logs: `2`
7. Start the screen recording. Keep the pointer still when speaking.

## 0:00-0:15 - Cold open

**Screen:** Command center, full page. Slowly scroll from the KPI ribbon to the AG Studio canvas.

**Voiceover:**

> PayPal handles the payment. PayPulse handles the work around it: invoicing, collections, subscriptions, and disputes. This is an agentic CFO for a receivables book.

## 0:15-0:32 - Problem and promise

**Screen:** Hover the overdue KPI, then the invoice ledger.

**Voiceover:**

> Most finance dashboards tell you that cash is late. PayPulse acts. It can send an invoice, create a checkout order, recover an overdue balance with PayPal Pay Later, and defend a dispute through the same operating loop.

## 0:32-0:58 - Command center and presets

**Screen:** Command center. Click **Overdue & BNPL**, then **Subscriptions**, then **Executive cashflow** in the AG Studio preset bar.

**Voiceover:**

> AG Studio is the control room. It has five related sources: invoices, customers, subscriptions, cashflow, and portfolio summary. The presets switch the report state instantly: executive cashflow, overdue and BNPL recovery, and subscriptions.

**Screen:** Hover the invoice grid columns **Collection rate (calculated)** and **Outstanding balance (calculated)**.

**Voiceover:**

> These are not precomputed columns. They are AG Studio expressions: paid divided by issued, and issued minus paid. The same model powers the charts and the drill-down grid.

## 0:58-1:22 - Deal desk: invoice plus checkout

**Screen:** Click **Deal desk**. In **Quick actions**, click **Invoice + QR checkout**. Wait for the agent result.

**Voiceover:**

> Here is the Deal and Billing Agent. One click creates a real PayPal Sandbox invoice, sends it, creates a matching checkout order, and generates a QR code. The result includes the invoice ID, the order ID, and a payer link.

**Screen:** Click **Payment QR** on the result. Hold on the QR modal for two seconds, then close it.

**Voiceover:**

> The QR is not a mock image. It encodes the live payer link, so a customer can scan and pay from a phone.

## 1:22-1:50 - Collections Nudge-Bot

**Screen:** Scroll to the invoice ledger. Click **Nudge** on `PP-2026-005` (Priya Nair, overdue `$1,600.00`).

**Voiceover:**

> Now the Collections Nudge-Bot. It finds the target, calculates the outstanding balance, drafts a customer note, creates a 50% milestone split invoice, and creates a PayPal Pay Later order for the full outstanding amount.

**Screen:** Wait for the result. Show the new split invoice row and the success card.

**Voiceover:**

> The response carries the split invoice, the checkout order, the approve link, and a QR code. The customer gets a clear next action instead of another reminder email.

## 1:50-2:12 - Webhook room

**Screen:** Click **Webhook room**. Click **Chargeback filed**. Wait for the audit entry.

**Voiceover:**

> The Dispute-Shield Agent handles the unhappy paths. A chargeback creates an evidence packet, attaches tracking, and records the decision in the audit trail. Low-value claims can be refunded automatically; higher-value claims are escalated.

**Screen:** Click **Invoice paid**. Point at the new audit entry and the reconciled ledger.

**Voiceover:**

> A paid invoice event reconciles the next open balance. The same handler is used for real PayPal webhooks and for the local simulator.

## 2:12-2:28 - Trust and security

**Screen:** Hover the **Signature enforced**, **Configured**, and **Model tools** service-status rows on Deal desk.

**Voiceover:**

> Credentials stay server-side. Webhook signatures are enforced, and unsigned live events fail closed. Request bodies are capped, POST mutations carry idempotent request IDs, and the optional API key gates direct access. If the model is offline, every flow falls back deterministically and says so.

## 2:28-2:40 - Reset and close

**Screen:** Webhook room. Click **Reset demo**. Show the restored KPI ribbon: 5 invoices, 2 logs, `$7,920.00` invoiced, `$4,710.00` paid, `$2,750.00` overdue, `59.5%` collection rate.

**Voiceover:**

> The whole demo resets to a known state in one click. PayPulse turns PayPal from a payment button into an autonomous finance operator.

**Screen:** Hold on the restored command center for the final two seconds.

## Optional built-in Studio Film capture

Record the full 2:45 film as a clean product asset:

1. Reset the demo, open `http://127.0.0.1:8000` at 1920x1080, and click **Watch 2:45 Studio Film**.
2. Let all eight acts play without skipping. Confirm voiceover, captions, camera focus, and X-Ray stay synchronized.
3. Hold the final frame for two seconds, then exit the film.
4. Confirm the dashboard returns to the seeded book, then call `POST /api/demo/reset` before the next take.

## Optional mobile check

Record a separate 5-second insert at 390x844:

1. Open the app.
2. Confirm the navigation and KPI ribbon stack without page-level horizontal overflow.
3. Open Deal desk and confirm the invoice ledger remains horizontally scrollable inside its card.
4. Do not include this insert in the 2:45 cut unless time allows.

## Post-recording checklist

- [ ] No credentials, tokens, or `.env` contents are visible.
- [ ] The video shows the `LIVE` mode chip when PayPal calls succeed.
- [ ] Every claimed action is visible on screen.
- [ ] The final frame shows the seeded numbers.
- [ ] If using Studio Film, all eight acts and all eight voiceovers play to the end.
- [ ] `POST /api/demo/reset` is called after recording.
- [ ] `GET /api/dashboard-data` confirms 5 invoices, 2 logs, `$7,920.00` invoiced, `$4,710.00` paid, `$2,750.00` overdue, and `59.5%` collection rate.

