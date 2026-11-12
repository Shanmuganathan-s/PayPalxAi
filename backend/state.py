"""In-memory relational state used by the PayPulse agents and AG Studio.

The store intentionally mixes seeded demo rows with live PayPal Sandbox rows so a
brand-new merchant account still renders a useful dashboard on first launch.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any, Dict, List


def _day(offset_days: int = 0) -> str:
    return (date.today() + timedelta(days=offset_days)).isoformat()


def new_event_id() -> str:
    return f"EVT-{uuid.uuid4().hex[:12].upper()}"


def build_initial_state() -> Dict[str, Any]:
    return {
        "kpis": {
            "disputes_defended_usd": 1240.0,
            "disputes_defended_count": 3,
            "refunds_issued_usd": 0.0,
            "active_subscriptions": 14,
        },
        "customers": [
            {
                "id": "CUST-101",
                "name": "Alex Mercer",
                "company": "Acme Robotics",
                "tier": "Enterprise",
                "loyalty_score": 96,
                "email": "alex.buyer@personal.example.com",
            },
            {
                "id": "CUST-102",
                "name": "Katherine Johnson",
                "company": "Orbital Labs",
                "tier": "Enterprise",
                "loyalty_score": 99,
                "email": "katherine.johnson@example.com",
            },
            {
                "id": "CUST-103",
                "name": "Margaret Hamilton",
                "company": "Apollo Systems",
                "tier": "Growth",
                "loyalty_score": 91,
                "email": "margaret.hamilton@example.com",
            },
            {
                "id": "CUST-104",
                "name": "Linus Vance",
                "company": "Kernel Cloud",
                "tier": "Starter",
                "loyalty_score": 68,
                "email": "linus.vance@example.com",
            },
            {
                "id": "CUST-105",
                "name": "Priya Nair",
                "company": "FinEdge Global",
                "tier": "Growth",
                "loyalty_score": 88,
                "email": "priya.nair@example.com",
            },
        ],
        "invoices": [
            {
                "id": "INV2-X981-AA12",
                "invoice_number": "PP-2026-001",
                "customer_id": "CUST-102",
                "customer_name": "Katherine Johnson (Orbital Labs)",
                "item_name": "Autonomous Telemetry Cluster License",
                "issued_amount": 2400.00,
                "paid_amount": 2400.00,
                "status": "PAID",
                "issued_date": _day(-27),
                "nudge_status": "Settled on Time",
                "source": "seed",
                "payer_view_url": None,
                "approve_url": None,
                "qr_base64": None,
            },
            {
                "id": "INV2-X982-BB34",
                "invoice_number": "PP-2026-002",
                "customer_id": "CUST-104",
                "customer_name": "Linus Vance (Kernel Cloud)",
                "item_name": "Q4 GPU Inference API Overages",
                "issued_amount": 1150.00,
                "paid_amount": 0.00,
                "status": "OVERDUE",
                "issued_date": _day(-21),
                "nudge_status": "Overdue 14d - Ready for AI Nudge",
                "source": "seed",
                "payer_view_url": None,
                "approve_url": None,
                "qr_base64": None,
            },
            {
                "id": "INV2-X983-CC56",
                "invoice_number": "PP-2026-003",
                "customer_id": "CUST-103",
                "customer_name": "Margaret Hamilton (Apollo Systems)",
                "item_name": "Mission Critical Webhook SLA Plan",
                "issued_amount": 1850.00,
                "paid_amount": 1850.00,
                "status": "PAID",
                "issued_date": _day(-14),
                "nudge_status": "Settled via PayPal",
                "source": "seed",
                "payer_view_url": None,
                "approve_url": None,
                "qr_base64": None,
            },
            {
                "id": "INV2-X984-DD78",
                "invoice_number": "PP-2026-004",
                "customer_id": "CUST-101",
                "customer_name": "Alex Mercer (Acme Robotics)",
                "item_name": "Edge Computer Vision Deployment",
                "issued_amount": 920.00,
                "paid_amount": 460.00,
                "status": "PARTIALLY_PAID",
                "issued_date": _day(-7),
                "nudge_status": "50% Paid via Pay Later",
                "source": "seed",
                "payer_view_url": None,
                "approve_url": None,
                "qr_base64": None,
            },
            {
                "id": "INV2-X985-EE90",
                "invoice_number": "PP-2026-005",
                "customer_id": "CUST-105",
                "customer_name": "Priya Nair (FinEdge Global)",
                "item_name": "Multi-Agent Payment Integration",
                "issued_amount": 1600.00,
                "paid_amount": 0.00,
                "status": "OVERDUE",
                "issued_date": _day(-18),
                "nudge_status": "Overdue 11d - Ready for AI Nudge",
                "source": "seed",
                "payer_view_url": None,
                "approve_url": None,
                "qr_base64": None,
            },
        ],
        "subscriptions": [
            {
                "id": "SUB-2001",
                "customer_id": "CUST-102",
                "customer_name": "Katherine Johnson (Orbital Labs)",
                "plan_id": "P-ORBITAL-PRO",
                "plan_name": "Orbital Telemetry Pro",
                "monthly_price": 299.00,
                "status": "ACTIVE",
                "next_billing_date": _day(10),
                "source": "seed",
            },
            {
                "id": "SUB-2002",
                "customer_id": "CUST-103",
                "customer_name": "Margaret Hamilton (Apollo Systems)",
                "plan_id": "P-APOLLO-SLA",
                "plan_name": "Mission Critical SLA",
                "monthly_price": 499.00,
                "status": "ACTIVE",
                "next_billing_date": _day(4),
                "source": "seed",
            },
            {
                "id": "SUB-2003",
                "customer_id": "CUST-105",
                "customer_name": "Priya Nair (FinEdge Global)",
                "plan_id": "P-FINEDGE-GROWTH",
                "plan_name": "FinEdge Growth Retainer",
                "monthly_price": 189.00,
                "status": "ACTIVE",
                "next_billing_date": _day(18),
                "source": "seed",
            },
        ],
        "agent_logs": [
            {
                "id": "EVT-INIT-1",
                "timestamp": "09:15:00",
                "agent": "Dispute-Shield Agent",
                "event_type": "CUSTOMER.DISPUTE.CREATED",
                "summary": (
                    "Auto-resolved Dispute PP-D-40912 ($640.00) by attaching DHL "
                    "Tracking #DH-882193 proof."
                ),
                "impact": "Protected $640.00",
                "status": "EVIDENCE_SUBMITTED",
                "mode": "SIMULATED",
            },
            {
                "id": "EVT-INIT-2",
                "timestamp": "10:02:14",
                "agent": "Collections Nudge-Bot",
                "event_type": "INVOICING.PARTIAL.CAPTURED",
                "summary": (
                    "Captured 50% milestone split ($460.00) from Acme Robotics via "
                    "PayPal Pay Later."
                ),
                "impact": "+$460.00 Recovered",
                "status": "PARTIALLY_PAID",
                "mode": "SIMULATED",
            },
        ],
    }


STATE_STORE: Dict[str, Any] = build_initial_state()


def reset_state() -> None:
    fresh = build_initial_state()
    STATE_STORE.clear()
    STATE_STORE.update(fresh)


def append_agent_log(state: Dict[str, Any], entry: Dict[str, Any], limit: int = 100) -> None:
    logs: List[Dict[str, Any]] = state.setdefault("agent_logs", [])
    logs.insert(0, entry)
    del logs[limit:]
