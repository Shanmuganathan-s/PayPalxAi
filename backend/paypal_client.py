"""Async PayPal Sandbox REST client used by the PayPulse agents.

Design goals
------------
* OAuth2 client-credentials token cached for ~8.5 hours (PayPal tokens live 9h).
* One transparent retry on HTTP 401 after a forced token refresh.
* Idempotent ``PayPal-Request-Id`` on every POST mutation.
* Every method degrades gracefully to deterministic synthetic data so live
  demos never stall on a fresh / unconfigured Sandbox app.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

try:  # Pure-python QR generation for simulated invoices
    import segno
except Exception:  # pragma: no cover - optional dependency
    segno = None

load_dotenv(Path(__file__).with_name(".env"))

DEFAULT_WEBHOOK_URL = "https://paypulse-demo.example.com/api/webhooks/paypal"
WEBHOOK_EVENT_NAMES = [
    "CUSTOMER.DISPUTE.CREATED",
    "CUSTOMER.DISPUTE.UPDATED",
    "PAYMENT.CAPTURE.COMPLETED",
    "PAYMENT.CAPTURE.DENIED",
    "PAYMENT.CAPTURE.REFUNDED",
    "PAYMENT.SALE.COMPLETED",
    "INVOICING.INVOICE.PAID",
    "INVOICING.INVOICE.CANCELLED",
    "BILLING.SUBSCRIPTION.ACTIVATED",
    "BILLING.SUBSCRIPTION.CANCELLED",
]
PLACEHOLDER_WEBHOOK_IDS = {"SIMULATED_OR_SANDBOX_WEBHOOK_ID", "WEBHOOK_ID"}


class PayPalSandboxClient:
    def __init__(self) -> None:
        self.client_id = (os.getenv("PAYPAL_CLIENT_ID") or "").strip()
        self.client_secret = (os.getenv("PAYPAL_CLIENT_SECRET") or "").strip()
        self.base_url = (
            os.getenv("PAYPAL_BASE_URL") or "https://api-m.sandbox.paypal.com"
        ).rstrip("/")
        self.webhook_id = (os.getenv("PAYPAL_WEBHOOK_ID") or "").strip()
        self.webhook_url = (
            os.getenv("PAYPAL_WEBHOOK_URL") or DEFAULT_WEBHOOK_URL
        ).strip()
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0
        self._token_lock = asyncio.Lock()
        self.last_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Configuration / auth
    # ------------------------------------------------------------------
    @property
    def configured(self) -> bool:
        cid = self.client_id.upper()
        return (
            bool(self.client_id and self.client_secret)
            and "REPLACE" not in cid
            and "YOUR_" not in cid
        )

    @property
    def webhook_configured(self) -> bool:
        return bool(
            self.webhook_id
            and self.webhook_id.upper() not in PLACEHOLDER_WEBHOOK_IDS
        )

    async def get_access_token(self, force_refresh: bool = False) -> str:
        async with self._token_lock:
            now = time.time()
            if not force_refresh and self._access_token and now < self._token_expires_at:
                return self._access_token
            if not self.configured:
                raise RuntimeError("PayPal credentials are not configured")
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(
                        f"{self.base_url}/v1/oauth2/token",
                        auth=(self.client_id, self.client_secret),
                        headers={"Accept": "application/json", "Accept-Language": "en_US"},
                        data={"grant_type": "client_credentials"},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    self._access_token = data["access_token"]
                    expires_in = int(data.get("expires_in", 32400))
                    cache_seconds = max(min(expires_in - 300, 30600), 3600)
                    self._token_expires_at = now + cache_seconds
                    self.last_error = None
                    return self._access_token
            except Exception as exc:  # noqa: BLE001 - surfaced via /api/paypal/status
                self.last_error = f"token error: {exc}"
                raise

    async def _headers(
        self,
        method: str,
        extra: Optional[Dict[str, str]] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, str]:
        token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if method.upper() == "POST":
            headers["PayPal-Request-Id"] = request_id or str(uuid.uuid4())
            headers["Prefer"] = "return=representation"
        if extra:
            headers.update(extra)
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        json_body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        if not self.configured:
            return {
                "error": True,
                "not_configured": True,
                "details": "PayPal credentials are not configured",
            }
        try:
            request_id = str(uuid.uuid4())
            headers = await self._headers(method, extra_headers, request_id)
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.request(
                    method,
                    f"{self.base_url}{path}",
                    headers=headers,
                    json=json_body,
                    params=params,
                )
                if resp.status_code == 401:
                    await self.get_access_token(force_refresh=True)
                    headers = await self._headers(method, extra_headers, request_id)
                    resp = await client.request(
                        method,
                        f"{self.base_url}{path}",
                        headers=headers,
                        json=json_body,
                        params=params,
                    )

                if resp.status_code >= 400:
                    self.last_error = f"{method} {path} -> HTTP {resp.status_code}"
                    return {
                        "error": True,
                        "http_status": resp.status_code,
                        "details": self._safe_json(resp),
                        "_simulated": False,
                    }
                if resp.status_code == 204 or not resp.content:
                    return {
                        "status": "SUCCESS",
                        "http_status": resp.status_code,
                        "_simulated": False,
                    }

                content_type = resp.headers.get("content-type", "")
                if "application/json" in content_type:
                    data = resp.json()
                else:
                    data = {
                        "raw_base64": base64.b64encode(resp.content).decode("ascii"),
                        "content_type": content_type,
                    }
                if isinstance(data, dict):
                    data.setdefault("_simulated", False)
                return data
        except Exception as exc:  # noqa: BLE001
            self.last_error = f"{method} {path} failed: {exc}"
            return {"error": True, "details": str(exc), "_simulated": False}

    async def _request_multipart(
        self,
        path: str,
        payload: Dict[str, Any],
        file_bytes: Optional[bytes] = None,
        filename: str = "evidence.pdf",
        content_type: str = "application/pdf",
    ) -> Dict[str, Any]:
        if not self.configured:
            return {
                "error": True,
                "not_configured": True,
                "details": "PayPal credentials are not configured",
            }
        try:
            token = await self.get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "PayPal-Request-Id": str(uuid.uuid4()),
            }
            files: Dict[str, Any] = {
                "input": (None, json.dumps(payload), "application/json")
            }
            if file_bytes:
                files["evidence-file"] = (filename, file_bytes, content_type)
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.base_url}{path}", headers=headers, files=files
                )
                if resp.status_code >= 400:
                    self.last_error = f"POST {path} -> HTTP {resp.status_code}"
                    return {
                        "error": True,
                        "http_status": resp.status_code,
                        "details": self._safe_json(resp),
                    }
                if not resp.content:
                    return {"status": "SUCCESS", "_simulated": False}
                data = self._safe_json(resp)
                if isinstance(data, dict):
                    data.setdefault("_simulated", False)
                return data
        except Exception as exc:  # noqa: BLE001
            self.last_error = f"POST {path} failed: {exc}"
            return {"error": True, "details": str(exc)}

    @staticmethod
    def _safe_json(resp: httpx.Response) -> Any:
        try:
            return resp.json()
        except Exception:
            return {"text": resp.text[:2000]}

    # ------------------------------------------------------------------
    # Synthetic fallbacks
    # ------------------------------------------------------------------
    @staticmethod
    def _extract_qr_base64(raw_multipart: str) -> Optional[str]:
        try:
            raw = base64.b64decode(raw_multipart)
            text = raw.decode("latin-1")
        except Exception:
            return None
        match = re.search(
            r'name="image".*?\r?\n\r?\n(.*?)(?:\r?\n--|\Z)', text, re.S
        )
        if not match:
            return None
        encoded = re.sub(r"\s+", "", match.group(1))
        if len(encoded) < 100 or not encoded.startswith("iVBOR"):
            return None
        return encoded

    def _qr_base64(self, text: Optional[str]) -> Optional[str]:
        if not text or segno is None:
            return None
        try:
            buffer = io.BytesIO()
            segno.make(text, error="m").save(buffer, kind="png", scale=5, border=2)
            return base64.b64encode(buffer.getvalue()).decode("ascii")
        except Exception:
            return None

    @staticmethod
    def _synthetic_invoice_id() -> str:
        return f"INV2-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"

    @staticmethod
    def _synthetic_invoice_number() -> str:
        return f"PP-{time.strftime('%Y')}-{uuid.uuid4().hex[:4].upper()}"

    def _synthetic_invoice(
        self,
        recipient_email: str,
        recipient_name: str,
        item_name: str,
        amount: float,
        currency: str = "USD",
        warning: Optional[str] = None,
    ) -> Dict[str, Any]:
        invoice_id = self._synthetic_invoice_id()
        invoice_number = self._synthetic_invoice_number()
        payer_view_url = (
            f"https://www.sandbox.paypal.com/invoice/p/#{invoice_id}"
        )
        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "item_name": item_name,
            "amount": round(float(amount), 2),
            "currency": currency,
            "status": "SENT",
            "payer_view_url": payer_view_url,
            "qr_base64": self._qr_base64(payer_view_url),
            "_simulated": True,
            "_warning": warning
            or "Sandbox credentials inactive - generated a deterministic demo invoice.",
        }

    # ------------------------------------------------------------------
    # 1. Invoicing v2 + QR
    # ------------------------------------------------------------------
    async def create_and_send_invoice(
        self,
        recipient_email: str,
        recipient_name: str,
        item_name: str,
        amount: float,
        currency: str = "USD",
        note: str = "Generated autonomously by PayPulse AI Deal Desk",
    ) -> Dict[str, Any]:
        if not self.configured:
            return self._synthetic_invoice(
                recipient_email, recipient_name, item_name, amount, currency
            )

        amount = round(float(amount), 2)
        parts = recipient_name.strip().split(" ", 1)
        given_name = parts[0] or "Client"
        surname = parts[1] if len(parts) > 1 else "Client"

        number_res = await self._request(
            "POST", "/v2/invoicing/generate-next-invoice-number"
        )
        invoice_number = (
            number_res.get("invoice_number")
            if isinstance(number_res, dict)
            else None
        ) or self._synthetic_invoice_number()

        draft_payload: Dict[str, Any] = {
            "detail": {
                "invoice_number": invoice_number,
                "currency_code": currency,
                "note": note,
                "payment_term": {"term_type": "NET_10"},
            },
            "primary_recipients": [
                {
                    "billing_info": {
                        "name": {"given_name": given_name, "surname": surname},
                        "email_address": recipient_email,
                    }
                }
            ],
            "items": [
                {
                    "name": item_name,
                    "quantity": "1",
                    "unit_amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}",
                    },
                }
            ],
            "configuration": {
                "allow_tip": False,
            },
        }

        created = await self._request(
            "POST", "/v2/invoicing/invoices", json_body=draft_payload
        )
        invoice_id = created.get("id") if isinstance(created, dict) else None
        if not invoice_id:
            return self._synthetic_invoice(
                recipient_email,
                recipient_name,
                item_name,
                amount,
                currency,
                warning=(
                    "PayPal invoice creation failed; used deterministic demo invoice. "
                    f"Details: {created.get('details') if isinstance(created, dict) else created}"
                ),
            )

        await self._request(
            "POST",
            f"/v2/invoicing/invoices/{invoice_id}/send",
            json_body={"send_to_invoicer": True, "send_to_recipient": True},
        )

        payer_view_url = f"https://www.sandbox.paypal.com/invoice/p/#{invoice_id}"
        qr_res = await self._request(
            "POST",
            f"/v2/invoicing/invoices/{invoice_id}/generate-qr-code",
            json_body={"width": 300, "height": 300, "action": "pay"},
            extra_headers={"Accept": "*/*"},
        )
        qr_base64 = None
        if isinstance(qr_res, dict):
            qr_base64 = qr_res.get("qr_code")
            if not qr_base64 and qr_res.get("raw_base64"):
                qr_base64 = self._extract_qr_base64(qr_res["raw_base64"])
        if not qr_base64:
            qr_base64 = self._qr_base64(payer_view_url)
        for link in created.get("links", []) if isinstance(created, dict) else []:
            if link.get("rel") == "payer-view":
                payer_view_url = link.get("href") or payer_view_url
                break

        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "item_name": item_name,
            "amount": amount,
            "currency": currency,
            "status": "SENT",
            "payer_view_url": payer_view_url,
            "qr_base64": qr_base64,
            "_simulated": False,
        }

    async def list_live_invoices(self, page_size: int = 20) -> List[Dict[str, Any]]:
        if not self.configured:
            return []
        res = await self._request(
            "GET",
            "/v2/invoicing/invoices",
            params={"page_size": page_size, "total_required": "true"},
        )
        if not isinstance(res, dict) or res.get("error"):
            return []
        items = res.get("items") or []
        return items if isinstance(items, list) else []

    async def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        return await self._request("GET", f"/v2/invoicing/invoices/{invoice_id}")

    # ------------------------------------------------------------------
    # 2. Catalogs + Subscriptions v1
    # ------------------------------------------------------------------
    async def create_subscription_plan(
        self,
        plan_name: str,
        monthly_price: float,
        currency: str = "USD",
    ) -> Dict[str, Any]:
        monthly_price = round(float(monthly_price), 2)
        if not self.configured:
            return {
                "product_id": f"PROD-{uuid.uuid4().hex[:10].upper()}",
                "plan_id": f"P-{uuid.uuid4().hex[:12].upper()}",
                "plan_name": plan_name,
                "monthly_price": monthly_price,
                "currency": currency,
                "status": "ACTIVE",
                "_simulated": True,
                "_warning": "Sandbox credentials inactive - generated a demo plan.",
            }

        product_res = await self._request(
            "POST",
            "/v1/catalogs/products",
            json_body={
                "name": f"{plan_name} Service",
                "description": f"Autonomous AI-managed subscription for {plan_name}",
                "type": "SERVICE",
                "category": "SOFTWARE",
            },
        )
        product_id = product_res.get("id") if isinstance(product_res, dict) else None
        if not product_id:
            return {
                "product_id": f"PROD-{uuid.uuid4().hex[:10].upper()}",
                "plan_id": f"P-{uuid.uuid4().hex[:12].upper()}",
                "plan_name": plan_name,
                "monthly_price": monthly_price,
                "currency": currency,
                "status": "ACTIVE",
                "_simulated": True,
                "_warning": f"Catalog product creation failed: {product_res}",
            }

        plan_res = await self._request(
            "POST",
            "/v1/billing/plans",
            json_body={
                "product_id": product_id,
                "name": plan_name,
                "description": f"{plan_name} - ${monthly_price:.2f}/{currency} monthly",
                "status": "ACTIVE",
                "billing_cycles": [
                    {
                        "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                        "tenure_type": "REGULAR",
                        "sequence": 1,
                        "total_cycles": 12,
                        "pricing_scheme": {
                            "fixed_price": {
                                "value": f"{monthly_price:.2f}",
                                "currency_code": currency,
                            }
                        },
                    }
                ],
                "payment_preferences": {
                    "auto_bill_outstanding": True,
                    "setup_fee_failure_action": "CONTINUE",
                    "payment_failure_threshold": 3,
                },
            },
        )
        plan_id = plan_res.get("id") if isinstance(plan_res, dict) else None
        simulated = not bool(plan_id)
        return {
            "product_id": product_id,
            "plan_id": plan_id or f"P-{uuid.uuid4().hex[:12].upper()}",
            "plan_name": plan_name,
            "monthly_price": monthly_price,
            "currency": currency,
            "status": plan_res.get("status", "ACTIVE")
            if isinstance(plan_res, dict)
            else "ACTIVE",
            "_simulated": simulated,
            "_warning": None if plan_id else f"Plan creation failed: {plan_res}",
        }

    # ------------------------------------------------------------------
    # 3. Orders v2
    # ------------------------------------------------------------------
    async def create_order(
        self, item_name: str, amount: float, currency: str = "USD"
    ) -> Dict[str, Any]:
        amount = round(float(amount), 2)
        if not self.configured:
            return {
                "order_id": f"ORDER-{uuid.uuid4().hex[:12].upper()}",
                "status": "CREATED",
                "amount": amount,
                "item_name": item_name,
                "currency": currency,
                "approve_url": None,
                "_simulated": True,
            }

        res = await self._request(
            "POST",
            "/v2/checkout/orders",
            json_body={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "description": item_name,
                        "amount": {
                            "currency_code": currency,
                            "value": f"{amount:.2f}",
                            "breakdown": {
                                "item_total": {
                                    "currency_code": currency,
                                    "value": f"{amount:.2f}",
                                }
                            },
                        },
                        "items": [
                            {
                                "name": (item_name or "PayPulse recovery")[:127],
                                "quantity": "1",
                                "unit_amount": {
                                    "currency_code": currency,
                                    "value": f"{amount:.2f}",
                                },
                            }
                        ],
                    }
                ],
            },
        )
        order_id = res.get("id") if isinstance(res, dict) else None
        if not order_id:
            return {
                "order_id": f"ORDER-{uuid.uuid4().hex[:12].upper()}",
                "status": "CREATED",
                "amount": amount,
                "item_name": item_name,
                "currency": currency,
                "approve_url": None,
                "_simulated": True,
                "_warning": f"Order creation failed: {res}",
            }

        approve_url = None
        for link in res.get("links", []):
            if link.get("rel") in ("approve", "payer-action"):
                approve_url = link.get("href")
                break
        return {
            "order_id": order_id,
            "status": res.get("status", "CREATED"),
            "amount": amount,
            "item_name": item_name,
            "currency": currency,
            "approve_url": approve_url,
            "_simulated": False,
        }

    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        return await self._request(
            "POST", f"/v2/checkout/orders/{order_id}/capture", json_body={}
        )

    # ------------------------------------------------------------------
    # 4. Shipment tracking, refunds, disputes
    # ------------------------------------------------------------------
    async def attach_shipment_tracking(
        self,
        transaction_id: str,
        tracking_number: str,
        carrier: str = "FEDEX",
        status: str = "DELIVERED",
    ) -> Dict[str, Any]:
        if not self.configured:
            return {
                "status": "SUCCESS",
                "tracker_id": f"TRK-{uuid.uuid4().hex[:10].upper()}",
                "tracking_number": tracking_number,
                "carrier": carrier,
                "_simulated": True,
            }
        return await self._request(
            "POST",
            "/v1/shipping/trackers-batch",
            json_body={
                "trackers": [
                    {
                        "transaction_id": transaction_id,
                        "tracking_number": tracking_number,
                        "status": status,
                        "carrier": carrier,
                    }
                ]
            },
        )

    async def refund_capture(
        self,
        capture_id: str,
        amount: float,
        currency: str = "USD",
        note: str = "Autonomous good-faith refund issued by PayPulse",
    ) -> Dict[str, Any]:
        amount = round(float(amount), 2)
        if not self.configured:
            return {
                "id": f"REFUND-{uuid.uuid4().hex[:12].upper()}",
                "status": "COMPLETED",
                "amount": amount,
                "currency": currency,
                "_simulated": True,
            }
        return await self._request(
            "POST",
            f"/v2/payments/captures/{capture_id}/refund",
            json_body={
                "amount": {"value": f"{amount:.2f}", "currency_code": currency},
                "note_to_payer": note,
            },
        )

    async def provide_dispute_evidence(
        self,
        dispute_id: str,
        tracking_number: str,
        carrier: str = "FEDEX",
        notes: str = "Delivery proof submitted autonomously by PayPulse.",
    ) -> Dict[str, Any]:
        if not self.configured:
            return {
                "status": "SUCCESS",
                "dispute_id": dispute_id,
                "evidence_type": "PROOF_OF_FULFILLMENT",
                "_simulated": True,
            }
        payload = {
            "evidences": [
                {
                    "evidence_type": "PROOF_OF_FULFILLMENT",
                    "evidence_info": {
                        "tracking_info": [
                            {
                                "carrier_name": carrier,
                                "tracking_number": tracking_number,
                            }
                        ]
                    },
                    "notes": notes,
                }
            ]
        }
        return await self._request_multipart(
            f"/v1/customer/disputes/{dispute_id}/provide-evidence", payload
        )

    # ------------------------------------------------------------------
    # 5. Webhook setup and verification
    # ------------------------------------------------------------------
    async def ensure_sandbox_webhook(
        self, webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Return a usable Sandbox webhook ID, creating one when necessary.

        The result never contains PayPal credentials. Startup calls this once so
        a fresh app submission can receive signed Sandbox events without a
        manual dashboard step. Existing Sandbox webhooks are reused first.
        """
        if not self.configured:
            return {
                "status": "SKIPPED",
                "webhook_id": None,
                "reason": "PayPal credentials are not configured",
            }
        if self.webhook_configured:
            return {
                "status": "SUCCESS",
                "webhook_id": self.webhook_id,
                "source": "env",
                "url": self.webhook_url,
            }

        target_url = (
            webhook_url or self.webhook_url or DEFAULT_WEBHOOK_URL
        ).strip()
        event_types = [{"name": name} for name in WEBHOOK_EVENT_NAMES]

        listed = await self._request("GET", "/v1/notifications/webhooks")
        if isinstance(listed, dict) and not listed.get("error"):
            webhooks = listed.get("webhooks")
            if isinstance(webhooks, list):
                chosen = next(
                    (
                        hook
                        for hook in webhooks
                        if isinstance(hook, dict)
                        and str(hook.get("url") or "").strip() == target_url
                    ),
                    None,
                )
                if chosen is None and webhooks:
                    chosen = webhooks[0]
                if isinstance(chosen, dict) and chosen.get("id"):
                    self.webhook_id = str(chosen["id"])
                    self.webhook_url = str(chosen.get("url") or target_url)
                    return {
                        "status": "SUCCESS",
                        "webhook_id": self.webhook_id,
                        "source": "sandbox-existing",
                        "url": self.webhook_url,
                    }

        created = await self._request(
            "POST",
            "/v1/notifications/webhooks",
            json_body={"url": target_url, "event_types": event_types},
        )
        if isinstance(created, dict) and created.get("id"):
            self.webhook_id = str(created["id"])
            self.webhook_url = str(created.get("url") or target_url)
            return {
                "status": "SUCCESS",
                "webhook_id": self.webhook_id,
                "source": "sandbox-created",
                "url": self.webhook_url,
            }

        details = created.get("details") if isinstance(created, dict) else created
        if isinstance(details, dict):
            details = details.get("details") or details
        self.last_error = f"webhook setup failed: {details}"
        return {
            "status": "FAILED",
            "webhook_id": None,
            "source": "sandbox",
            "url": target_url,
            "details": details,
        }

    async def verify_webhook_signature(
        self, headers: Dict[str, str], raw_body: bytes
    ) -> Dict[str, Any]:
        webhook_id = self.webhook_id
        if not self.configured:
            return {
                "verification_status": "SKIPPED",
                "reason": "PayPal is not configured (simulator / local mode).",
            }
        if not self.webhook_configured:
            return {
                "verification_status": "FAILURE",
                "reason": (
                    "PAYPAL_WEBHOOK_ID is not configured; refusing to process "
                    "an unverified webhook while PayPal is live."
                ),
            }
        try:
            event = json.loads(raw_body or b"{}")
        except Exception:
            return {"verification_status": "FAILURE", "reason": "Invalid JSON body"}

        payload = {
            "auth_algo": headers.get("paypal-auth-algo", ""),
            "cert_url": headers.get("paypal-cert-url", ""),
            "transmission_id": headers.get("paypal-transmission-id", ""),
            "transmission_sig": headers.get("paypal-transmission-sig", ""),
            "transmission_time": headers.get("paypal-transmission-time", ""),
            "webhook_id": webhook_id,
            "webhook_event": event,
        }
        missing = [k for k, v in payload.items() if k != "webhook_event" and not v]
        if missing:
            return {
                "verification_status": "FAILURE",
                "reason": f"Missing header values: {', '.join(missing)}",
            }
        res = await self._request(
            "POST", "/v1/notifications/verify-webhook-signature", json_body=payload
        )
        if isinstance(res, dict) and res.get("verification_status"):
            return res
        return {
            "verification_status": "FAILURE",
            "reason": "PayPal verification request failed",
            "details": res,
        }

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------
    async def status(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "configured": self.configured,
            "base_url": self.base_url,
            "webhook_configured": self.webhook_configured,
            "webhook_url": self.webhook_url,
            "token_ok": False,  # nosec B105
            "mode": "SIMULATED",
            "last_error": self.last_error,
        }
        if self.configured:
            try:
                await asyncio.wait_for(self.get_access_token(), timeout=12.0)
                out["token_ok"] = True
                out["mode"] = "LIVE"
                out["last_error"] = None
            except Exception as exc:  # noqa: BLE001
                out["last_error"] = str(exc)
        return out
