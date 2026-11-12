"""Generate the eight PayPulse Studio Film neural voiceover tracks.

Install edge-tts and mutagen in a temporary virtual environment, then run:

    python scripts/generate_demo_audio.py

The script writes frontend/public/demo-audio/scene-01.mp3 through scene-08.mp3
and a manifest.json containing scene scripts, actual durations, and timed
subtitle segments. It never reads or writes PayPal credentials.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import edge_tts
from mutagen.mp3 import MP3

VOICE = "en-US-AndrewNeural"
RATE = "+3%"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "frontend" / "public" / "demo-audio"

SCENES: list[dict[str, str]] = [
    {
        "id": "scene-01",
        "title": "Act 01 - The Merchant Problem & Live Seed State",
        "script": (
            "Small businesses lose thousands of dollars and hours every month chasing "
            "unpaid invoices, reconciling subscriptions, and manually defending buyer "
            "disputes. Meet PayPulse: an autonomous AI CFO, deal desk, and dispute "
            "shield built on live PayPal Sandbox APIs and AG Studio 3.1. Our merchant "
            "book starts with 7,920 dollars invoiced, 4,710 dollars collected, 2,750 "
            "dollars overdue, and a 59.5 percent collection rate."
        ),
    },
    {
        "id": "scene-02",
        "title": "Act 02 - Command Center & AG Studio 3.1 Relational Analytics",
        "script": (
            "Inside the Command Center, PayPulse pipes live receivables, customer "
            "loyalty tiers, and recurring subscriptions into an embedded AG Studio 3.1 "
            "canvas. Relational joins connect invoices and subscriptions to customers, "
            "while calculated expressions compute collection rate and outstanding "
            "balance in real time across Executive Cashflow, Overdue and Buy Now "
            "Pay Later, and Subscription presets."
        ),
    },
    {
        "id": "scene-03",
        "title": "Act 03 - Deal Desk Happy Path: Live Invoicing, Orders & QR",
        "script": (
            "Moving to the Deal Desk, the Deal and Billing Agent converts natural "
            "language into live PayPal Sandbox mutations. Watch as our local Ollama model "
            "processes the request to bill Alex Mercer 450 dollars for an AI Vision "
            "Pipeline milestone. In the background, PayPulse attaches an idempotent "
            "PayPal Request ID header, dispatches a live PayPal Sandbox invoice, "
            "creates a matching Checkout Order, and renders a scannable PayPal QR code."
        ),
    },
    {
        "id": "scene-04",
        "title": "Act 04 - Recurring Subscriptions & Deterministic-First Reliability",
        "script": (
            "Next, we instruct our local Ollama model to launch a 79 dollar monthly "
            "Enterprise AI Retainer plan. PayPulse provisions a live PayPal Catalog "
            "Product and Billing Subscription Plan in seconds. Because PayPulse is "
            "deterministic-first and AI-optional, even if local Ollama is offline, "
            "our deterministic router guarantees zero-downtime execution."
        ),
    },
    {
        "id": "scene-05",
        "title": "Act 05 - Collections Nudge-Bot & 50% Pay Later Split",
        "script": (
            "To recover overdue cash without sending robotic reminder spam, the "
            "Collections Nudge-Bot targets our largest overdue invoice: PP-2026-005 "
            "for Priya Nair at FinEdge Global, overdue by 1,600 dollars. With one click, "
            "the agent drafts a customer-facing recovery note, creates a 50 percent "
            "milestone split invoice for 800 dollars, and attaches a PayPal Pay Later "
            "checkout order."
        ),
    },
    {
        "id": "scene-06",
        "title": "Act 06 - Webhook Room: Autonomous Dispute Shield & Unhappy Paths",
        "script": (
            "In the Webhook Room, the Dispute-Shield Agent defends the unhappy path "
            "autonomously. First, when a 480 dollar Item Not Received dispute arrives, "
            "the agent verifies carrier delivery and uploads multipart tracking evidence "
            "to PayPal's Disputes API. Second, when an 18 dollar and 50 cent refund "
            "claim arrives below our 25 dollar threshold, it auto-refunds the capture "
            "to avoid a 15 dollar dispute fee. Third, a 74 dollar denied capture is "
            "escalated, and a paid invoice webhook reconciles our ledger live."
        ),
    },
    {
        "id": "scene-07",
        "title": "Act 07 - 3D Isometric Architecture & Partner Ecosystem Matrix",
        "script": (
            "Under the hood, PayPulse unites eight core capabilities: PayPal Invoicing "
            "and QR, Orders v2 and Pay Later, Catalog Subscriptions, Dispute Evidence "
            "and Tracking, AG Studio 3.1 relational analytics, APIMatic production SDK "
            "patterns with 8.5-hour OAuth caching, local Ollama tool routing, and "
            "zero-vulnerability security hardening."
        ),
    },
    {
        "id": "scene-08",
        "title": "Act 08 - Verification Metrics & Closing Lockup",
        "script": (
            "Verified across 26 desktop and mobile Playwright checks with zero findings "
            "in Bandit, pip-audit, and npm audit. The future of autonomous merchant "
            "cashflow is here. Welcome to PayPulse."
        ),
    },
]


def build_segments(words: list[dict[str, Any]], duration: float) -> list[dict[str, Any]]:
    if not words:
        return [{"start": 0.0, "end": round(duration, 3), "text": ""}]

    segments: list[dict[str, Any]] = []
    bucket: list[dict[str, Any]] = []

    def flush() -> None:
        if not bucket:
            return
        text = " ".join(str(word["text"]) for word in bucket).strip()
        segments.append(
            {
                "start": round(float(bucket[0]["start"]), 3),
                "end": round(float(bucket[-1]["end"]), 3),
                "text": text,
            }
        )
        bucket.clear()

    for word in words:
        bucket.append(word)
        text = str(word["text"])
        span = float(word["end"]) - float(bucket[0]["start"])
        punctuation_break = text.endswith((".", "?", "!", ":", ";"))
        comma_break = text.endswith(",") and len(bucket) >= 5
        if len(bucket) >= 9 or span >= 3.8 or punctuation_break or comma_break:
            flush()
    flush()
    return segments


async def generate_scene(scene: dict[str, str]) -> dict[str, Any]:
    scene_id = scene["id"]
    mp3_path = OUT_DIR / f"{scene_id}.mp3"
    part_path = OUT_DIR / f"{scene_id}.part"
    words: list[dict[str, Any]] = []
    last_error: Exception | None = None

    for attempt in range(1, 7):
        words = []
        if part_path.exists():
            part_path.unlink()
        try:
            communicate = edge_tts.Communicate(
                scene["script"], VOICE, rate=RATE, boundary="WordBoundary"
            )
            with part_path.open("wb") as audio_file:
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_file.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        start = float(chunk["offset"]) / 10_000_000
                        end = start + (float(chunk["duration"]) / 10_000_000)
                        words.append(
                            {
                                "text": str(chunk["text"]).strip(),
                                "start": round(start, 3),
                                "end": round(end, 3),
                            }
                        )
            if part_path.stat().st_size < 1024:
                raise RuntimeError("edge-tts returned an empty audio stream")
            part_path.replace(mp3_path)
            break
        except Exception as exc:  # noqa: BLE001 - retry transient Edge TTS failures
            last_error = exc
            if part_path.exists():
                part_path.unlink()
            if attempt == 6:
                raise RuntimeError(f"{scene_id}: {exc}") from exc
            delay = min(30, 2 ** attempt)
            print(f"  retry {attempt} in {delay}s: {type(exc).__name__}", flush=True)
            await asyncio.sleep(delay)

    if last_error and not mp3_path.exists():
        raise RuntimeError(f"{scene_id}: {last_error}")

    duration = float(MP3(mp3_path).info.length)
    return {
        "id": scene_id,
        "file": f"{scene_id}.mp3",
        "title": scene["title"],
        "script": scene["script"],
        "duration": round(duration, 3),
        "segments": build_segments(words, duration),
    }


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated = []
    for scene in SCENES:
        print(f"Generating {scene['id']} ...", flush=True)
        generated.append(await generate_scene(scene))

    manifest = {
        "voice": VOICE,
        "rate": RATE,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_duration": round(sum(scene["duration"] for scene in generated), 3),
        "scenes": generated,
    }
    manifest_path = OUT_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Wrote {manifest_path}")
    print(f"Total duration: {manifest['total_duration']} seconds")


if __name__ == "__main__":
    asyncio.run(main())
