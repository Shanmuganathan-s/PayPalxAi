"""PayPulse FastAPI orchestration server.

Routes
------
GET  /api/health
GET  /api/paypal/status
POST /api/paypal/ensure-webhook
GET  /api/llm/status
GET  /api/dashboard-data
POST /api/agent/chat
POST /api/webhooks/paypal
POST /api/demo/simulate-webhook
POST /api/demo/reset

The app also serves ``frontend/dist`` when present, so a single deployment can
host both the API and the built React command center.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from agent_orchestrator import PayPulseAgentOrchestrator
from paypal_client import PayPalSandboxClient
from state import STATE_STORE, reset_state

paypal_client = PayPalSandboxClient()
STATE_LOCK = asyncio.Lock()
orchestrator = PayPulseAgentOrchestrator(paypal_client, STATE_STORE)

_live_cache: Dict[str, Any] = {"ts": 0.0, "invoices": [], "customers": []}
_live_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    print(
        "[PayPulse] PayPal configured:",
        paypal_client.configured,
        "| LLM configured:",
        orchestrator.llm_configured,
        "| LLM:",
        orchestrator.llm_provider,
        orchestrator.llm_model,
        "| API key:",
        "required" if _API_KEY else "not set",
    )
    if paypal_client.configured and not paypal_client.webhook_configured:
        try:
            setup = await asyncio.wait_for(
                paypal_client.ensure_sandbox_webhook(), timeout=12.0
            )
            print(
                "[PayPulse] Webhook auto-setup:",
                setup.get("status"),
                "| configured:",
                paypal_client.webhook_configured,
            )
        except Exception as exc:  # noqa: BLE001 - startup must never crash on PayPal
            print(
                "[PayPulse] WARNING: webhook auto-setup failed:",
                type(exc).__name__,
            )
    if paypal_client.configured and not paypal_client.webhook_configured:
        print(
            "[PayPulse] WARNING: webhook ID unavailable; "
            "signed webhooks will fail closed until setup succeeds."
        )
    yield


app = FastAPI(
    title="PayPulse PayPal Operations API",
    version="1.0.0",
    lifespan=lifespan,
)

_API_KEY = (os.getenv("PAYPULSE_API_KEY") or "").strip()
_PUBLIC_API_PATHS = {"/api/health", "/api/webhooks/paypal"}
try:
    _MAX_REQUEST_BYTES = max(int(os.getenv("MAX_REQUEST_BYTES", "65536")), 1024)
except ValueError:
    _MAX_REQUEST_BYTES = 65536


class BodySizeLimitMiddleware:
    """Reject oversized bodies even when Content-Length is missing or chunked."""

    def __init__(self, app: Any, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") != "http" or scope.get("method") not in (
            "POST",
            "PUT",
            "PATCH",
        ):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        length = headers.get(b"content-length")
        if length and length.isdigit() and int(length) > self.max_bytes:
            await self._reject(send)
            return

        body = bytearray()
        while True:
            message = await receive()
            if message.get("type") == "http.disconnect":
                return
            if message.get("type") != "http.request":
                continue
            body.extend(message.get("body") or b"")
            if len(body) > self.max_bytes:
                await self._reject(send)
                return
            if not message.get("more_body", False):
                break

        async def replay() -> Dict[str, Any]:
            return {
                "type": "http.request",
                "body": bytes(body),
                "more_body": False,
            }

        await self.app(scope, replay, send)

    @staticmethod
    async def _reject(send: Any) -> None:
        body = b'{"detail":"Request body is too large"}'
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})


app.add_middleware(BodySizeLimitMiddleware, max_bytes=_MAX_REQUEST_BYTES)


@app.middleware("http")
async def api_security(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH"):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > _MAX_REQUEST_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body is too large"},
            )

    path = request.url.path
    if (
        _API_KEY
        and path.startswith("/api/")
        and path not in _PUBLIC_API_PATHS
        and not hmac.compare_digest(
            (request.headers.get("x-api-key") or "").encode("utf-8"),
            _API_KEY.encode("utf-8"),
        )
    ):
        return JSONResponse(
            status_code=401,
            content={"detail": "Missing or invalid API key"},
        )

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
    )
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    return response


_origins = [
    origin.strip()
    for origin in (
        os.getenv(
            "FRONTEND_ORIGIN",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
    )
    if origin.strip()
]
# Automatically permit Render external URL when hosted on Render
_render_url = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
if _render_url and _render_url not in _origins:
    _origins.append(_render_url)

_allow_all = "*" in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else _origins,
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)


class SimulateWebhookRequest(BaseModel):
    scenario: str = Field(min_length=1, max_length=40)


# ---------------------------------------------------------------------------
# Live Sandbox invoice hydration
# ---------------------------------------------------------------------------
def _normalize_live_invoice(
    invoice: Dict[str, Any]
) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    try:
        invoice_id = invoice.get("id")
        if not invoice_id:
            return None
        detail = invoice.get("detail") or {}
        status = str(invoice.get("status") or "SENT").upper()

        amount = 0.0
        amount_obj = detail.get("amount") or invoice.get("amount")
        if isinstance(amount_obj, dict):
            amount = float(amount_obj.get("value") or 0)
        items = invoice.get("items") or []
        if amount == 0:
            for item in items:
                unit = item.get("unit_amount") or {}
                quantity = float(item.get("quantity") or 1)
                amount += float(unit.get("value") or 0) * quantity
        amount = round(amount, 2)

        recipient = (
            (invoice.get("primary_recipients") or [{}])[0].get("billing_info") or {}
        )
        name_obj = recipient.get("name") or {}
        name = (
            " ".join(
                part
                for part in [name_obj.get("given_name"), name_obj.get("surname")]
                if part
            )
            or "Sandbox Buyer"
        )
        email = recipient.get("email_address") or "sandbox.buyer@example.com"
        customer_id = (
            "CUST-LIVE-"
            + hashlib.md5(
                email.lower().encode(), usedforsecurity=False
            ).hexdigest()[:6].upper()
        )
        item_name = (
            (items[0].get("name") if items else None) or "PayPal Invoice"
        )
        issued_date = (
            detail.get("invoice_date")
            or (invoice.get("create_time") or "")[:10]
            or time.strftime("%Y-%m-%d")
        )

        row = {
            "id": invoice_id,
            "invoice_number": detail.get("invoice_number")
            or invoice.get("invoice_number")
            or invoice_id,
            "customer_id": customer_id,
            "customer_name": f"{name} ({email})",
            "item_name": item_name,
            "issued_amount": amount,
            "paid_amount": amount if status == "PAID" else 0.0,
            "status": status,
            "issued_date": issued_date,
            "nudge_status": "Synced from PayPal Sandbox",
            "source": "sandbox",
            "payer_view_url": next(
                (
                    link.get("href")
                    for link in (invoice.get("links") or [])
                    if link.get("rel") == "payer-view"
                ),
                None,
            ),
            "approve_url": None,
            "qr_base64": None,
        }
        customer = {
            "id": customer_id,
            "name": name,
            "company": email.split("@")[-1],
            "tier": "Live Sandbox",
            "loyalty_score": 100,
            "email": email,
        }
        return row, customer
    except Exception:
        return None


async def _get_live_invoices() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not paypal_client.configured:
        return [], []
    if os.getenv("MERGE_LIVE_INVOICES", "true").strip().lower() == "false":
        return [], []
    async with _live_lock:
        if time.time() - float(_live_cache["ts"]) < 30.0:
            return _live_cache["invoices"], _live_cache["customers"]
        try:
            items = await asyncio.wait_for(
                paypal_client.list_live_invoices(), timeout=8.0
            )
        except Exception:
            items = []
        invoices: List[Dict[str, Any]] = []
        customers: List[Dict[str, Any]] = []
        for item in items:
            normalized = _normalize_live_invoice(item)
            if normalized:
                invoices.append(normalized[0])
                customers.append(normalized[1])
        _live_cache["ts"] = time.time()
        _live_cache["invoices"] = invoices
        _live_cache["customers"] = customers
        return invoices, customers


def _merge_live_into_state(
    live_invoices: List[Dict[str, Any]], live_customers: List[Dict[str, Any]]
) -> None:
    customers = STATE_STORE.setdefault("customers", [])
    invoices = STATE_STORE.setdefault("invoices", [])
    customers_by_id = {item.get("id"): item for item in customers}
    invoices_by_id = {item.get("id"): item for item in invoices}

    for customer in live_customers:
        existing = customers_by_id.get(customer.get("id"))
        if existing is None:
            customers.append(customer)
            customers_by_id[customer.get("id")] = customer
            continue
        for key in ("name", "company", "email", "tier", "loyalty_score"):
            if customer.get(key) is not None:
                existing[key] = customer[key]

    for invoice in live_invoices:
        existing = invoices_by_id.get(invoice.get("id"))
        if existing is None:
            invoices.insert(0, invoice)
            invoices_by_id[invoice.get("id")] = invoice
            continue
        for key in (
            "invoice_number",
            "customer_id",
            "customer_name",
            "item_name",
            "issued_amount",
            "paid_amount",
            "status",
            "issued_date",
        ):
            if invoice.get(key) is not None:
                existing[key] = invoice[key]
        if not existing.get("payer_view_url") and invoice.get("payer_view_url"):
            existing["payer_view_url"] = invoice["payer_view_url"]
        if not existing.get("qr_base64") and invoice.get("qr_base64"):
            existing["qr_base64"] = invoice["qr_base64"]


async def _hydrate_live_invoices() -> None:
    live_invoices, live_customers = await _get_live_invoices()
    if not live_invoices and not live_customers:
        return
    async with STATE_LOCK:
        _merge_live_into_state(live_invoices, live_customers)


def _compute_summary(invoices: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_issued = round(
        sum(float(i.get("issued_amount", 0) or 0) for i in invoices), 2
    )
    total_paid = round(sum(float(i.get("paid_amount", 0) or 0) for i in invoices), 2)
    overdue_total = round(
        sum(
            max(
                float(i.get("issued_amount", 0) or 0)
                - float(i.get("paid_amount", 0) or 0),
                0.0,
            )
            for i in invoices
            if str(i.get("status", "")).upper() == "OVERDUE"
        ),
        2,
    )
    collection_rate = (
        round((total_paid / total_issued) * 100, 1) if total_issued else 0.0
    )
    open_invoices = len(
        [
            i
            for i in invoices
            if str(i.get("status", "")).upper()
            not in ("PAID", "CANCELLED", "REFUNDED")
        ]
    )
    kpis = STATE_STORE.get("kpis", {})
    return {
        "total_issued": total_issued,
        "total_paid": total_paid,
        "overdue_total": overdue_total,
        "collection_rate": collection_rate,
        "open_invoices": open_invoices,
        "disputes_defended_usd": round(
            float(kpis.get("disputes_defended_usd", 0.0)), 2
        ),
        "disputes_defended_count": int(kpis.get("disputes_defended_count", 0)),
        "refunds_issued_usd": round(float(kpis.get("refunds_issued_usd", 0.0)), 2),
        "active_subscriptions": int(kpis.get("active_subscriptions", 0)),
    }


# ---------------------------------------------------------------------------
# Core routes
# ---------------------------------------------------------------------------
@app.get("/")
async def root() -> Any:
    index = Path(__file__).resolve().parent.parent / "frontend" / "dist" / "index.html"
    if index.exists():
        return FileResponse(index)
    return {
        "name": "PayPulse API",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "time": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "mode": "LIVE" if paypal_client.configured else "SIMULATED",
        "paypal_configured": paypal_client.configured,
        "llm_configured": orchestrator.llm_configured,
        "invoices": len(STATE_STORE.get("invoices", [])),
        "agent_logs": len(STATE_STORE.get("agent_logs", [])),
    }


@app.get("/api/paypal/status")
async def paypal_status() -> Dict[str, Any]:
    return await paypal_client.status()


def _request_is_local(request: Request) -> bool:
    host = (request.client.host if request.client else "") or ""
    return host in {"127.0.0.1", "::1", "localhost", "testclient"}


@app.post("/api/paypal/ensure-webhook")
async def paypal_ensure_webhook(request: Request) -> Dict[str, Any]:
    if not _API_KEY and not _request_is_local(request):
        raise HTTPException(status_code=403, detail="Local setup only")
    result = await paypal_client.ensure_sandbox_webhook()
    result["configured"] = paypal_client.webhook_configured
    return result


@app.get("/api/llm/status")
async def llm_status() -> Dict[str, Any]:
    return await orchestrator.llm_status()


@app.get("/api/dashboard-data")
async def get_dashboard_data() -> Dict[str, Any]:
    await _hydrate_live_invoices()
    customers = list(STATE_STORE.get("customers", []))
    invoices = list(STATE_STORE.get("invoices", []))
    summary = _compute_summary(invoices)
    return {
        "customers": customers,
        "invoices": invoices,
        "subscriptions": list(STATE_STORE.get("subscriptions", [])),
        "agent_logs": list(STATE_STORE.get("agent_logs", [])),
        "summary": summary,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "mode": "LIVE" if paypal_client.configured else "SIMULATED",
    }


@app.get("/api/invoices/{invoice_id}/qr")
async def invoice_qr(invoice_id: str) -> Dict[str, Any]:
    invoice = next(
        (
            item
            for item in STATE_STORE.get("invoices", [])
            if item.get("id") == invoice_id
        ),
        None,
    )
    if invoice is None:
        await _hydrate_live_invoices()
        invoice = next(
            (
                item
                for item in STATE_STORE.get("invoices", [])
                if item.get("id") == invoice_id
            ),
            None,
        )
    if invoice is None:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

    amount = float(invoice.get("issued_amount", 0) or 0)
    payer_view_url = invoice.get("payer_view_url") or (
        "https://www.sandbox.paypal.com/invoice/p/#"
        f"{invoice.get('invoice_number') or invoice_id}?amount={amount:.2f}"
    )
    qr_code = invoice.get("qr_base64")
    if not qr_code:
        qr_code = paypal_client._qr_base64(payer_view_url)
        invoice["qr_base64"] = qr_code

    return {
        "invoice_id": invoice_id,
        "invoice_number": invoice.get("invoice_number") or invoice_id,
        "customer_name": invoice.get("customer_name"),
        "amount": amount,
        "qr_code": qr_code,
        "payer_view_url": payer_view_url,
    }


@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest) -> Dict[str, Any]:
    async with STATE_LOCK:
        return await orchestrator.execute_prompt(req.prompt)


@app.post("/api/webhooks/paypal")
async def paypal_webhook(request: Request) -> JSONResponse:
    raw_body = await request.body()
    headers = {key.lower(): value for key, value in request.headers.items()}

    verification = await paypal_client.verify_webhook_signature(headers, raw_body)
    status = str(verification.get("verification_status", "SKIPPED")).upper()
    if paypal_client.configured and status != "SUCCESS":
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid or unverified PayPal webhook",
                "verification": verification,
            },
        )

    try:
        body = json.loads(raw_body or b"{}")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {exc}")
    if not isinstance(body, dict):
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON body: expected a JSON object",
        )

    event_type = str(body.get("event_type") or "UNKNOWN")
    resource = body.get("resource") or {}
    if not isinstance(resource, dict):
        resource = {}

    async with STATE_LOCK:
        handled = await orchestrator.handle_webhook_event(event_type, resource)

    return JSONResponse(
        status_code=200,
        content={
            "status": "ACK_200",
            "verification": status,
            "handled": handled,
        },
    )


_SCENARIOS: Dict[str, Tuple[str, Dict[str, Any]]] = {
    "DISPUTE": (
        "CUSTOMER.DISPUTE.CREATED",
        {
            "dispute_id": "PP-D-99281",
            "transaction_id": "TX-77812",
            "tracking_number": "FX-4491028-US",
            "carrier": "FEDEX",
            "amount": 480.00,
            "_simulated": True,
        },
    ),
    "REFUND": (
        "PAYMENT.CAPTURE.REFUNDED",
        {"capture_id": "CAP-55190", "amount": 18.50, "_simulated": True},
    ),
    "DENIED": (
        "PAYMENT.CAPTURE.DENIED",
        {"capture_id": "CAP-77120", "amount": 74.00, "_simulated": True},
    ),
    "PAID": (
        "INVOICING.INVOICE.PAID",
        {"_simulated": True},
    ),
}


@app.post("/api/demo/simulate-webhook")
async def simulate_webhook(req: SimulateWebhookRequest) -> Dict[str, Any]:
    scenario = req.scenario.strip().upper()
    if scenario == "NUDGE":
        async with STATE_LOCK:
            result = await orchestrator.execute_prompt(
                "Nudge the top overdue invoice with a 50% PayPal Pay Later split"
            )
        return {"scenario": scenario, "result": result}

    if scenario not in _SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown scenario '{req.scenario}'. "
                f"Use one of: NUDGE, {', '.join(_SCENARIOS)}."
            ),
        )

    event_type, resource = _SCENARIOS[scenario]
    async with STATE_LOCK:
        handled = await orchestrator.handle_webhook_event(event_type, resource)
    return {"scenario": scenario, "handled": handled}


@app.post("/api/demo/reset")
async def reset_demo() -> Dict[str, Any]:
    async with STATE_LOCK:
        reset_state()
        _live_cache["ts"] = 0.0
        _live_cache["invoices"] = []
        _live_cache["customers"] = []
    return {"status": "RESET", "invoices": len(STATE_STORE["invoices"])}


# ---------------------------------------------------------------------------
# Optional single-origin static hosting for the built frontend
# ---------------------------------------------------------------------------
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="ui")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
