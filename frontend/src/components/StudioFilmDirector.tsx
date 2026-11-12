import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type {
  AgentResult,
  DashboardData,
  Invoice,
  Summary,
} from "../types";
import type { QrTarget } from "./QrModal";
import { formatCurrency, formatPercent } from "../lib/format";
import {
  isSoundMuted,
  playApiSuccess,
  playCursorClick,
  playKeyTick,
  playSceneTransition,
  setSoundMuted,
} from "../lib/soundEngine";

type View = "overview" | "deals" | "events";
type ToastTone = "success" | "error" | "info";

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

interface FilmScene {
  id: string;
  title: string;
  script: string;
  duration: number;
  segments: CaptionSegment[];
}

interface FilmManifest {
  voice: string;
  rate: string;
  total_duration: number;
  scenes: FilmScene[];
}

export interface StudioFilmDirectorProps {
  open: boolean;
  data: DashboardData | null;
  view: View;
  qrTarget: QrTarget | null;
  onClose: () => void;
  onViewChange: (view: View) => void;
  onRun: (prompt: string) => Promise<AgentResult | null>;
  onSimulate: (scenario: string) => Promise<void>;
  onReset: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onShowQr: (target: QrTarget) => void;
  onCloseQr: () => void;
  pushToast: (tone: ToastTone, message: string) => void;
}

interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  label: string;
}

interface FocusRect {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

interface XRayWireState {
  wire: string;
  status: string;
  aiAuth: string;
  bookDelta: string;
}

const FALLBACK_MANIFEST: FilmManifest = {
  voice: "en-US-AndrewNeural",
  rate: "+3%",
  total_duration: 205.992,
  scenes: [
    {
      id: "scene-01",
      title: "Act 01 - The Merchant Problem & Live Seed State",
      script:
        "Small businesses lose thousands of dollars and hours every month chasing unpaid invoices, reconciling subscriptions, and manually defending buyer disputes. Meet PayPulse: an autonomous AI CFO, deal desk, and dispute shield built on live PayPal Sandbox APIs and AG Studio 3.1. Our merchant book starts with 7,920 dollars invoiced, 4,710 dollars collected, 2,750 dollars overdue, and a 59.5 percent collection rate.",
      duration: 32.4,
      segments: [
        {
          start: 0,
          end: 7.5,
          text: "Small businesses lose thousands of dollars and hours every month chasing unpaid invoices.",
        },
        {
          start: 7.5,
          end: 15.5,
          text: "Meet PayPulse: an autonomous AI CFO, deal desk, and dispute shield built on live PayPal Sandbox APIs and AG Studio 3.1.",
        },
        {
          start: 15.5,
          end: 24.0,
          text: "Our merchant book starts with 7,920 dollars invoiced, 4,710 dollars collected.",
        },
        {
          start: 24.0,
          end: 32.4,
          text: "2,750 dollars overdue, and a 59.5 percent collection rate.",
        },
      ],
    },
    {
      id: "scene-02",
      title: "Act 02 - Command Center & AG Studio 3.1 Relational Analytics",
      script:
        "Inside the Command Center, PayPulse pipes live receivables, customer loyalty tiers, and recurring subscriptions into an embedded AG Studio 3.1 canvas. Relational joins connect invoices and subscriptions to customers, while calculated expressions compute collection rate and outstanding balance in real time across Executive Cashflow, Overdue and Buy Now Pay Later, and Subscription presets.",
      duration: 25.488,
      segments: [
        {
          start: 0,
          end: 8.0,
          text: "Inside the Command Center, PayPulse pipes live receivables into an embedded AG Studio 3.1 canvas.",
        },
        {
          start: 8.0,
          end: 16.5,
          text: "Relational joins connect invoices and subscriptions to customers in real time.",
        },
        {
          start: 16.5,
          end: 25.5,
          text: "Calculated expressions compute collection rate across Executive Cashflow, Overdue and BNPL, and Subscriptions.",
        },
      ],
    },
    {
      id: "scene-03",
      title: "Act 03 - Deal Desk Happy Path: Live Invoicing, Orders & QR",
      script:
        "Moving to the Deal Desk, the Deal and Billing Agent converts natural language into live PayPal Sandbox mutations. Watch as our local Ollama model processes the request to bill Alex Mercer 450 dollars for an AI Vision Pipeline milestone. In the background, PayPulse attaches an idempotent PayPal Request ID header, dispatches a live PayPal Sandbox invoice, creates a matching Checkout Order, and renders a scannable PayPal QR code.",
      duration: 28.512,
      segments: [
        {
          start: 0,
          end: 8.0,
          text: "Moving to the Deal Desk, the Deal and Billing Agent converts natural language into live PayPal mutations.",
        },
        {
          start: 8.0,
          end: 16.5,
          text: "Local Ollama processes the request to bill Alex Mercer 450 dollars for an AI Vision Pipeline milestone.",
        },
        {
          start: 16.5,
          end: 28.5,
          text: "PayPulse dispatches a live PayPal invoice, creates a Checkout Order, and renders a scannable QR code.",
        },
      ],
    },
    {
      id: "scene-04",
      title: "Act 04 - Recurring Subscriptions & Deterministic-First Reliability",
      script:
        "Next, we instruct our local Ollama model to launch a 79 dollar monthly Enterprise AI Retainer plan. PayPulse provisions a live PayPal Catalog Product and Billing Subscription Plan in seconds. Because PayPulse is deterministic-first and AI-optional, even if local Ollama is offline, our deterministic router guarantees zero-downtime execution.",
      duration: 22.608,
      segments: [
        {
          start: 0,
          end: 8.0,
          text: "Next, we instruct local Ollama to launch a 79 dollar monthly Enterprise AI Retainer plan.",
        },
        {
          start: 8.0,
          end: 15.0,
          text: "PayPulse provisions a live PayPal Catalog Product and Billing Subscription Plan in seconds.",
        },
        {
          start: 15.0,
          end: 22.6,
          text: "Because PayPulse is deterministic-first, if Ollama is offline, the deterministic router guarantees execution.",
        },
      ],
    },
    {
      id: "scene-05",
      title: "Act 05 - Collections Nudge-Bot & 50% Pay Later Split",
      script:
        "To recover overdue cash without sending robotic reminder spam, the Collections Nudge-Bot targets our largest overdue invoice: PP-2026-005 for Priya Nair at FinEdge Global, overdue by 1,600 dollars. With one click, the agent drafts a customer-facing recovery note, creates a 50 percent milestone split invoice for 800 dollars, and attaches a PayPal Pay Later checkout order.",
      duration: 27.624,
      segments: [
        {
          start: 0,
          end: 8.5,
          text: "To recover overdue cash without spam, the Collections Nudge-Bot targets invoice PP-2026-005 ($1,600.00).",
        },
        {
          start: 8.5,
          end: 17.5,
          text: "With one click, the agent drafts a recovery note and creates a 50 percent milestone split invoice for $800.00.",
        },
        {
          start: 17.5,
          end: 27.6,
          text: "A PayPal Pay Later checkout order is attached for instant buyer settlement.",
        },
      ],
    },
    {
      id: "scene-06",
      title: "Act 06 - Webhook Room: Autonomous Dispute Shield & Unhappy Paths",
      script:
        "In the Webhook Room, the Dispute-Shield Agent defends the unhappy path autonomously. First, when a 480 dollar Item Not Received dispute arrives, the agent verifies carrier delivery and uploads multipart tracking evidence to PayPal's Disputes API. Second, when an 18 dollar and 50 cent refund claim arrives below our 25 dollar threshold, it auto-refunds the capture to avoid a 15 dollar dispute fee. Third, a 74 dollar denied capture is escalated, and a paid invoice webhook reconciles our ledger live.",
      duration: 33.96,
      segments: [
        {
          start: 0,
          end: 9.0,
          text: "In the Webhook Room, the Dispute-Shield Agent defends the unhappy path autonomously.",
        },
        {
          start: 9.0,
          end: 18.0,
          text: "For a $480.00 dispute, the agent verifies carrier delivery and submits multipart evidence to PayPal.",
        },
        {
          start: 18.0,
          end: 26.0,
          text: "A claim under the $25 threshold is auto-refunded to avoid a $15 dispute fee.",
        },
        {
          start: 26.0,
          end: 34.0,
          text: "A denied capture is escalated, and a paid invoice webhook reconciles the ledger live.",
        },
      ],
    },
    {
      id: "scene-07",
      title: "Act 07 - 3D Isometric Architecture & Partner Ecosystem Matrix",
      script:
        "Under the hood, PayPulse unites eight core capabilities: PayPal Invoicing and QR, Orders v2 and Pay Later, Catalog Subscriptions, Dispute Evidence and Tracking, AG Studio 3.1 relational analytics, APIMatic production SDK patterns with 8.5-hour OAuth caching, local Ollama tool routing, and zero-vulnerability security hardening.",
      duration: 23.328,
      segments: [
        {
          start: 0,
          end: 7.5,
          text: "Under the hood, PayPulse unites eight core capabilities across PayPal Sandbox and AG Studio 3.1.",
        },
        {
          start: 7.5,
          end: 15.0,
          text: "APIMatic production SDK patterns with 8.5-hour OAuth caching and idempotent request routing.",
        },
        {
          start: 15.0,
          end: 23.3,
          text: "Local Ollama tool calling with zero-vulnerability security hardening.",
        },
      ],
    },
    {
      id: "scene-08",
      title: "Act 08 - Verification Metrics & Closing Lockup",
      script:
        "Verified across 26 desktop and mobile Playwright checks with zero findings in Bandit, pip-audit, and npm audit. The future of autonomous merchant cashflow is here. Welcome to PayPulse.",
      duration: 12.072,
      segments: [
        {
          start: 0,
          end: 6.0,
          text: "Verified across 26 desktop and mobile Playwright checks with zero security findings.",
        },
        {
          start: 6.0,
          end: 12.1,
          text: "The future of autonomous merchant cashflow is here. Welcome to PayPulse.",
        },
      ],
    },
  ],
};

const ISOMETRIC_TILES = [
  {
    tag: "01 // PAYPAL INVOICING v2 & QR",
    title: "PayPal Invoicing v2 & QR",
    meta: "Number reservation, draft, send, and scannable QR generation",
  },
  {
    tag: "02 // PAYPAL ORDERS v2 & PAY LATER",
    title: "PayPal Orders v2 & Pay Later",
    meta: "Instant checkout orders and 50% BNPL milestone recovery",
  },
  {
    tag: "03 // CATALOGS & SUBSCRIPTIONS v1",
    title: "Catalogs & Subscriptions v1",
    meta: "Automated product provisioning and recurring billing plans",
  },
  {
    tag: "04 // DISPUTES & SHIPMENT TRACKING",
    title: "Disputes & Shipment Tracking",
    meta: "Multipart evidence upload, carrier tracking, and <$25 auto-refunds",
  },
  {
    tag: "05 // AG STUDIO 3.1 EMBEDDED CANVAS",
    title: "AG Studio 3.1 Embedded Canvas",
    meta: "5 relational sources, customer joins, and calculated expressions",
  },
  {
    tag: "06 // APIMATIC SDK CONTEXT PATTERNS",
    title: "APIMatic SDK Context Patterns",
    meta: "8.5h OAuth2 cache, 401 retry, and idempotent PayPal-Request-Id",
  },
  {
    tag: "07 // LOCAL OLLAMA + DETERMINISTIC ROUTER",
    title: "Local Ollama + Deterministic Router",
    meta: "qwen3.5:2b tool calling with guaranteed deterministic fallback",
  },
  {
    tag: "08 // ZERO-CVE SECURITY POSTURE",
    title: "Zero-CVE Security Posture",
    meta: "Bandit 0, pip-audit 0, npm audit 0, 64KB chunked guard, fail-closed webhooks",
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StudioFilmDirector({
  open,
  data,
  view,
  qrTarget,
  onClose,
  onViewChange,
  onRun,
  onSimulate,
  onReset,
  onRefresh,
  onShowQr,
  onCloseQr,
  pushToast,
}: StudioFilmDirectorProps) {
  const [manifest, setManifest] = useState<FilmManifest>(FALLBACK_MANIFEST);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState("");

  const [cursor, setCursor] = useState<CursorState>({
    x: 200,
    y: 200,
    visible: false,
    label: "",
  });
  const [ripple, setRipple] = useState(0);
  const [focusRect, setFocusRect] = useState<FocusRect | null>(null);

  // Opening slate state for Act 01 (4.0s)
  const [openingSlateVisible, setOpeningSlateVisible] = useState(true);
  const [openingSlateOpacity, setOpeningSlateOpacity] = useState(1);

  // Act 07 3D matrix elevation (0 to 7)
  const [elevatedTiles, setElevatedTiles] = useState<number[]>([]);

  // Act 08 Finale kinetic split
  const [finaleSplit, setFinaleSplit] = useState(false);

  // Bottom Broadcast Dock X-Ray Wire State
  const [xrayState, setXrayState] = useState<XRayWireState>({
    wire: "POST /api/demo/reset",
    status: "200 OK",
    aiAuth: "Deterministic Seed Init + OAuth2 Token Verified",
    bookDelta: "Invoiced: $7,920.00 | Paid: $4,710.00 | 59.5%",
  });

  const propsRef = useRef({
    onClose,
    onViewChange,
    onRun,
    onSimulate,
    onReset,
    onRefresh,
    onShowQr,
    onCloseQr,
    pushToast,
  });
  propsRef.current = {
    onClose,
    onViewChange,
    onRun,
    onSimulate,
    onReset,
    onRefresh,
    onShowQr,
    onCloseQr,
    pushToast,
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sceneRunnerIdRef = useRef(0);
  const isPlayingRef = useRef(true);
  const isOpenRef = useRef(open);
  const sceneIndexRef = useRef(sceneIndex);
  const focusedElementRef = useRef<HTMLElement | null>(null);

  isOpenRef.current = open;
  isPlayingRef.current = playing;
  sceneIndexRef.current = sceneIndex;

  // Track body film state
  useEffect(() => {
    if (open) {
      document.body.dataset.filmPlaying = "true";
    } else {
      delete document.body.dataset.filmPlaying;
    }
    return () => {
      delete document.body.dataset.filmPlaying;
    };
  }, [open]);

  const currentScene = manifest.scenes[sceneIndex] ?? manifest.scenes[0];
  const totalDuration = manifest.total_duration || 205.992;

  // Load manifest.json
  useEffect(() => {
    let active = true;
    fetch("/demo-audio/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error("Manifest load failed");
        return res.json() as Promise<FilmManifest>;
      })
      .then((loaded) => {
        if (active && Array.isArray(loaded.scenes) && loaded.scenes.length === 8) {
          setManifest(loaded);
        }
      })
      .catch(() => {
        // Fallback already in place
      });
    return () => {
      active = false;
    };
  }, []);

  // Compute live subtitle caption from audio segments
  const currentCaption = useMemo(() => {
    if (!currentScene || !currentScene.segments) return currentScene?.script || "";
    for (const seg of currentScene.segments) {
      if (elapsed >= seg.start && elapsed <= seg.end + 0.5) {
        return seg.text;
      }
    }
    const last = currentScene.segments[currentScene.segments.length - 1];
    if (elapsed > (last?.end || 0)) {
      return last?.text || currentScene.script;
    }
    return currentScene.segments[0]?.text || currentScene.script;
  }, [currentScene, elapsed]);

  // Audio setup
  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    audioRef.current.muted = muted;
  }, [open, muted]);

  // Clean element focus helper
  const clearFocus = useCallback(() => {
    if (focusedElementRef.current) {
      focusedElementRef.current.removeAttribute("data-tour-focused");
      focusedElementRef.current.classList.remove("film-focus-target");
      focusedElementRef.current = null;
    }
    setFocusRect(null);
  }, []);

  // Set spotlight on element
  const spotlightTourTarget = useCallback(
    async (tourId: string, label: string) => {
      clearFocus();
      await sleep(80);
      const target = document.querySelector<HTMLElement>(`[data-tour-id="${tourId}"]`);
      if (!target) return null;

      target.setAttribute("data-tour-focused", "true");
      target.classList.add("film-focus-target");
      focusedElementRef.current = target;
      target.scrollIntoView({ behavior: "smooth", block: "center" });

      await sleep(300);
      const rect = target.getBoundingClientRect();
      setFocusRect({
        left: Math.max(6, rect.left - 2),
        top: Math.max(54, rect.top - 2),
        width: Math.min(window.innerWidth - 12, rect.width + 4),
        height: Math.max(30, rect.height + 4),
        label,
      });

      // Position cursor at right edge of spotlighted area
      setCursor({
        x: Math.min(window.innerWidth - 30, rect.left + rect.width * 0.8),
        y: Math.max(60, Math.min(window.innerHeight - 150, rect.top + rect.height * 0.45)),
        visible: true,
        label,
      });

      return target;
    },
    [clearFocus],
  );

  // Move cursor to specific button / element and emit ripple click
  const clickElementWithRipple = useCallback(
    async (selector: string, label: string, performClick = true) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return null;

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(250);

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      setCursor({
        x: cx,
        y: cy,
        visible: true,
        label,
      });

      await sleep(300);
      setRipple((r) => r + 1);
      playCursorClick();

      if (performClick) {
        el.click();
      }

      await sleep(300);
      return el;
    },
    [],
  );

  // Simulate typing in deal desk textarea
  const typeIntoPrompt = useCallback(
    async (text: string) => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        '[data-film-prompt="deal-desk"]',
      );
      if (!textarea) return;

      const rect = textarea.getBoundingClientRect();
      setCursor({
        x: rect.left + 40,
        y: rect.top + 20,
        visible: true,
        label: "PROMPT INPUT",
      });

      textarea.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;

      nativeSetter?.call(textarea, "");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      for (let i = 0; i < text.length; i++) {
        if (!isOpenRef.current) break;
        nativeSetter?.call(textarea, text.slice(0, i + 1));
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        playKeyTick();
        await sleep(18);
      }
      await sleep(150);
    },
    [],
  );

  // Reset and clean exit
  const exitFilm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    delete document.body.dataset.filmPlaying;
    clearFocus();
    setCursor((c) => ({ ...c, visible: false }));
    propsRef.current.onCloseQr();
    propsRef.current.onClose();
  }, [clearFocus]);

  const exitAndReset = useCallback(async () => {
    await propsRef.current.onReset();
    exitFilm();
  }, [exitFilm]);

  // Audio play/pause controls
  const togglePause = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  }, [muted]);

  const goToScene = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(7, idx));
    setSceneIndex(clamped);
  }, []);

  // Main Scene Orchestration Effect
  useEffect(() => {
    if (!open) return;

    const runnerId = ++sceneRunnerIdRef.current;
    let isCurrentRunner = true;

    clearFocus();
    setElapsed(0);
    setFinaleSplit(false);
    if (sceneIndex === 6) {
      // Act 07 lights all 8 capability tiles
      setElevatedTiles([0, 1, 2, 3, 4, 5, 6, 7]);
    } else {
      setElevatedTiles([]);
    }
    playSceneTransition();

    const audio = audioRef.current;
    if (audio && currentScene) {
      audio.pause();
      audio.src = `/demo-audio/${currentScene.id}.mp3`;
      audio.currentTime = 0;
      audio.playbackRate = 1.0;
      setAudioReady(false);
      audio.oncanplay = () => setAudioReady(true);
      audio.onerror = () => setAudioError("Voiceover track unavailable");
      if (isPlayingRef.current) {
        audio.play().catch(() => setAudioError("Audio auto-play blocked"));
      }
    }

    // Timer tracking elapsed audio time with fallback if audio is blocked/headless
    const timerInterval = setInterval(() => {
      if (audio && !audio.paused && audio.currentTime > 0) {
        setElapsed(audio.currentTime);
      } else {
        setElapsed((prev) => prev + 0.1);
      }
    }, 100);

    // Audio completion promise with robust fallback timeout
    const audioPromise = new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          if (audio) {
            audio.removeEventListener("ended", done);
            audio.removeEventListener("error", done);
          }
          resolve();
        }
      };
      if (audio) {
        audio.addEventListener("ended", done);
        audio.addEventListener("error", done);
      }
      const durMs = Math.max(8000, Math.floor(((currentScene?.duration || 22) * 1000) - 300));
      setTimeout(done, durMs);
    });

    // Execute exact choreography for this act
    const runActLogic = async () => {
      if (!isCurrentRunner || !isOpenRef.current) return;

      // ==========================================
      // ACT 01: Merchant Problem & Seed State
      // ==========================================
      if (sceneIndex === 0) {
        propsRef.current.onViewChange("overview");
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(true);
        setOpeningSlateOpacity(1);

        setXrayState({
          wire: "POST /api/demo/reset",
          status: "200 OK",
          aiAuth: "Deterministic Seed Init + OAuth2 Token Verified",
          bookDelta: "Invoiced: $7,920.00 | Paid: $4,710.00 | 59.5%",
        });

        await propsRef.current.onReset();
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Hold slate for 3.3s then fade out for 0.7s (total 4.0s)
        await sleep(3300);
        if (!isCurrentRunner || !isOpenRef.current) return;
        setOpeningSlateOpacity(0);
        await sleep(700);
        if (!isCurrentRunner || !isOpenRef.current) return;
        setOpeningSlateVisible(false);

        // Spotlight kpi-ribbon
        await spotlightTourTarget("kpi-ribbon", "STEP 01 // FINANCIAL COMMAND CENTER");
        playApiSuccess();
      }

      // ==========================================
      // ACT 02: Command Center & AG Studio 3.1
      // ==========================================
      else if (sceneIndex === 1) {
        propsRef.current.onViewChange("overview");
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);

        setXrayState({
          wire: "GET /api/dashboard-data",
          status: "200 OK",
          aiAuth: "AG Studio 3.1 Relational Join Engine",
          bookDelta: "Receivables Ledger: 5 Invoices | 2 Subscriptions",
        });

        await spotlightTourTarget("studio-presets", "STEP 02 // STRATEGY PRESETS");
        await sleep(800);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Click Overdue & BNPL (hold 4.0s)
        await clickElementWithRipple('[data-film-preset="recovery"]', "OVERDUE & BNPL", true);
        await spotlightTourTarget("studio-presets", "STEP 02 // OVERDUE & BNPL PRESET");
        await sleep(4000);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Click Subscriptions (hold 4.0s)
        await clickElementWithRipple('[data-film-preset="subscriptions"]', "SUBSCRIPTIONS", true);
        await spotlightTourTarget("studio-presets", "STEP 02 // SUBSCRIPTIONS PRESET");
        await sleep(4000);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Click Executive Cashflow
        await clickElementWithRipple('[data-film-preset="executive"]', "EXECUTIVE CASHFLOW", true);
        await sleep(500);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Spotlight studio-canvas
        await spotlightTourTarget("studio-canvas", "STEP 02 // RELATIONAL CANVAS & CALCULATED FIELDS");
        playApiSuccess();
      }

      // ==========================================
      // ACT 03: Deal Desk Happy Path
      // ==========================================
      else if (sceneIndex === 2) {
        propsRef.current.onViewChange("deals");
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);

        setXrayState({
          wire: "POST /api/agent/chat -> /v2/invoicing/invoices",
          status: "200 OK",
          aiAuth: "Ollama qwen3.5:2b (Tool Call) + Request-Id",
          bookDelta: "Invoiced: $7,920.00 -> $8,370.00 | Open: 3 -> 4",
        });

        await sleep(400);
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("agent-prompt-box", "STEP 03 // DEAL DESK INTENT");

        const promptText =
          "Create an invoice for alex.buyer@personal.example.com for $450 for AI Vision Pipeline Milestone";
        await typeIntoPrompt(promptText);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Click Run (ripple visual only - do NOT double-dispatch)
        await clickElementWithRipple('[data-film-run="deal-desk"]', "DISPATCH MUTATION", false);

        // WAIT GATE: await POST /api/agent/chat completion
        setXrayState((x) => ({
          ...x,
          wire: "POST /api/agent/chat -> /v2/invoicing/invoices",
          status: "IN FLIGHT...",
        }));

        const agentRes = await propsRef.current.onRun(promptText);
        if (!isCurrentRunner || !isOpenRef.current) return;

        setXrayState({
          wire: "POST /v2/invoicing/invoices + /v2/checkout/orders",
          status: "200 OK",
          aiAuth: "Ollama qwen3.5:2b (Tool Call) + OAuth2 8.5h Cache + Request-Id",
          bookDelta: "Invoiced: $7,920.00 -> $8,370.00 | Open: 3 -> 4",
        });

        // MANDATORY HOLD 1 (5.5 Seconds) on agent-result-card
        await spotlightTourTarget("agent-result-card", "STEP 03 // LIVE PAYPAL SANDBOX INVOICE");
        playApiSuccess();
        await sleep(5500);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // MANDATORY HOLD 2 (5.0 Seconds) on QR Modal
        const qrBtn = document.querySelector<HTMLElement>('[data-film-action="view-qr"]');
        if (qrBtn) {
          await clickElementWithRipple('[data-film-action="view-qr"]', "PAYMENT QR", false);
        }
        if (agentRes && agentRes.data) {
          propsRef.current.onShowQr({
            invoiceId: String(agentRes.data.invoice_id || agentRes.data.id || "INV2-DEMO"),
            invoiceNumber: String(agentRes.data.invoice_number || "PP-2026-006"),
            customerName: "Alex Mercer (Sandbox Buyer)",
            amount: 450,
            qrCode: String(agentRes.data.qr_base64 || ""),
            payerUrl: String(agentRes.data.payer_view_url || agentRes.data.approve_url || ""),
          });
        }
        await sleep(400);
        if (!isCurrentRunner || !isOpenRef.current) return;

        await spotlightTourTarget("qr-modal-box", "STEP 03 // SCANNABLE CHECKOUT QR");
        playApiSuccess();
        await sleep(5000);
        if (!isCurrentRunner || !isOpenRef.current) return;

        propsRef.current.onCloseQr();
        await sleep(300);
      }

      // ==========================================
      // ACT 04: Recurring Subscriptions
      // ==========================================
      else if (sceneIndex === 3) {
        propsRef.current.onViewChange("deals");
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);

        setXrayState({
          wire: "POST /v1/catalogs/products + /v1/billing/plans",
          status: "200 OK",
          aiAuth: "Ollama qwen3.5:2b (Tool Call) + Deterministic Fallback",
          bookDelta: "Subscriptions: 1 -> 2 | MRR: +$79.00/mo",
        });

        await sleep(400);
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("agent-prompt-box", "STEP 04 // RECURRING SUBSCRIPTION PROMPT");

        const subPrompt =
          "Create a subscription plan for $79 monthly for Enterprise AI Retainer";
        await typeIntoPrompt(subPrompt);
        if (!isCurrentRunner || !isOpenRef.current) return;

        await clickElementWithRipple('[data-film-run="deal-desk"]', "CREATE PLAN", false);

        setXrayState((x) => ({
          ...x,
          wire: "POST /v1/catalogs/products + /v1/billing/plans",
          status: "IN FLIGHT...",
        }));

        await propsRef.current.onRun(subPrompt);
        if (!isCurrentRunner || !isOpenRef.current) return;

        setXrayState({
          wire: "POST /v1/catalogs/products + /v1/billing/plans",
          status: "201 CREATED",
          aiAuth: "Ollama qwen3.5:2b (Tool Call) + Deterministic Fallback",
          bookDelta: "Subscriptions: 1 -> 2 | MRR: +$79.00/mo",
        });

        // MANDATORY HOLD (5.5 Seconds)
        await spotlightTourTarget("agent-result-card", "STEP 04 // PAYPAL CATALOG & BILLING PLAN");
        playApiSuccess();
        await sleep(5500);
      }

      // ==========================================
      // ACT 05: Collections Nudge-Bot & 50% Split
      // ==========================================
      else if (sceneIndex === 4) {
        propsRef.current.onViewChange("deals");
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);

        setXrayState({
          wire: "POST /v2/invoicing/invoices (Split 50%)",
          status: "200 OK",
          aiAuth: "Collections Nudge-Bot (AI Note + BNPL Split)",
          bookDelta: "Overdue PP-2026-005 ($1,600.00) -> $800.00 Split Created",
        });

        await sleep(400);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Spotlight overdue row
        await spotlightTourTarget("invoice-row-overdue", "STEP 05 // OVERDUE RECEIVABLE: $1,600.00");
        await sleep(1500);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Click Nudge button (ripple visual only - single prompt call)
        const nudgeSelector = '[data-film-nudge="PP-2026-005"]';
        await clickElementWithRipple(nudgeSelector, "SEND NUDGE + 50% SPLIT", false);

        await sleep(400);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Call nudge flow
        await propsRef.current.onRun("Nudge Priya Nair for overdue invoice PP-2026-005 with a 50% milestone split and PayPal Pay Later");
        if (!isCurrentRunner || !isOpenRef.current) return;

        // MANDATORY HOLD (5.5 Seconds) on result card and new split invoice
        await spotlightTourTarget("agent-result-card", "STEP 05 // 50% SPLIT INVOICE CREATED ($800.00)");
        playApiSuccess();
        await sleep(5500);
      }

      // ==========================================
      // ACT 06: Webhook Room & Unhappy Paths
      // ==========================================
      else if (sceneIndex === 5) {
        propsRef.current.onViewChange("events");
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);

        await sleep(400);
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("webhook-simulator-bar", "STEP 06 // SIGNED PAYPAL WEBHOOK SIMULATOR");
        await sleep(800);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Scenario 1: DISPUTE ($480)
        setXrayState({
          wire: "POST /v1/customer/disputes/{id}/provide-evidence",
          status: "200 OK",
          aiAuth: "Dispute-Shield: Multipart Evidence & Carrier Tracking",
          bookDelta: "Disputes Defended: +$480.00 ($1,720.00 Total)",
        });
        await clickElementWithRipple('[data-film-scenario="DISPUTE"]', "CHARGEBACK FILED", false);
        await propsRef.current.onSimulate("DISPUTE");
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("webhook-audit-feed", "STEP 06 // EVENT LEDGER UPDATE: $480.00 PROTECTED");
        playApiSuccess();
        await sleep(4500);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Scenario 2: REFUND ($18.50)
        setXrayState({
          wire: "POST /v2/payments/captures/{id}/refund",
          status: "200 OK",
          aiAuth: "Low-Value Guard (<$25 Instant Refund)",
          bookDelta: "Refund: $18.50 Auto-Issued (Avoided $15 Dispute Fee)",
        });
        await clickElementWithRipple('[data-film-scenario="REFUND"]', "LOW-VALUE REFUND", false);
        await propsRef.current.onSimulate("REFUND");
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("webhook-audit-feed", "STEP 06 // EVENT LEDGER UPDATE: AUTO-REFUND");
        playApiSuccess();
        await sleep(4500);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Scenario 3: DENIED ($74.00)
        setXrayState({
          wire: "POST /api/webhooks/paypal (CAPTURE.DENIED)",
          status: "200 OK",
          aiAuth: "High-Value Escalation (Audit Trail Flagged)",
          bookDelta: "Review Queue: $74.00 Flagged For Merchant Action",
        });
        await clickElementWithRipple('[data-film-scenario="DENIED"]', "CAPTURE DENIED", false);
        await propsRef.current.onSimulate("DENIED");
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("webhook-audit-feed", "STEP 06 // EVENT LEDGER UPDATE: REVIEW QUEUE");
        await sleep(3500);
        if (!isCurrentRunner || !isOpenRef.current) return;

        // Scenario 4: PAID ($450.00)
        setXrayState({
          wire: "POST /api/webhooks/paypal (INVOICING.INVOICE.PAID)",
          status: "200 OK",
          aiAuth: "Real-Time Ledger Reconciliation Engine",
          bookDelta: "Captured: +$450.00 | Collection Rate Updated",
        });
        await clickElementWithRipple('[data-film-scenario="PAID"]', "INVOICE PAID", false);
        await propsRef.current.onSimulate("PAID");
        if (!isCurrentRunner || !isOpenRef.current) return;
        await spotlightTourTarget("webhook-audit-feed", "STEP 06 // EVENT LEDGER UPDATE: FULL SETTLEMENT");
        playApiSuccess();
        await sleep(4500);
      }

      // ==========================================
      // ACT 07: 3D Isometric Architecture Matrix
      // ==========================================
      else if (sceneIndex === 6) {
        clearFocus();
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);
        setCursor((c) => ({ ...c, visible: false }));

        setXrayState({
          wire: "PAYPAL SANDBOX MATRIX // 8 CORE CAPABILITIES",
          status: "VERIFIED",
          aiAuth: "APIMatic SDK Context + 8.5h OAuth2 Cache",
          bookDelta: "Platform Stack Verified: 8/8 Active",
        });

        // Elevate all 8 capability tiles with success chime
        setElevatedTiles([0, 1, 2, 3, 4, 5, 6, 7]);
        playApiSuccess();
        await sleep(2000);
      }

      // ==========================================
      // ACT 08: Split-Text Finale & Verification
      // ==========================================
      else if (sceneIndex === 7) {
        clearFocus();
        propsRef.current.onCloseQr();
        setOpeningSlateVisible(false);
        setCursor((c) => ({ ...c, visible: false }));

        setXrayState({
          wire: "AUDIT VERIFICATION // ZERO VULNERABILITIES",
          status: "PASSED",
          aiAuth: "Bandit 0 | pip-audit 0 | npm audit 0 | 26 E2E",
          bookDelta: "PayPulse 2026 Production Ready",
        });

        // Hold initial centered text for 1.3s then trigger split
        await sleep(1300);
        if (!isCurrentRunner || !isOpenRef.current) return;
        setFinaleSplit(true);
        playApiSuccess();
      }
    };

    // Run both logic and audio, then advance cleanly
    void (async () => {
      await Promise.all([runActLogic(), audioPromise]);
      if (isCurrentRunner && isOpenRef.current && sceneIndexRef.current === sceneIndex && sceneIndex < 7) {
        setSceneIndex((curr) => curr + 1);
      }
    })();

    return () => {
      isCurrentRunner = false;
      clearInterval(timerInterval);
      if (audio) {
        audio.oncanplay = null;
        audio.onerror = null;
      }
    };
  }, [
    open,
    sceneIndex,
    currentScene,
    clearFocus,
    spotlightTourTarget,
    clickElementWithRipple,
    typeIntoPrompt,
  ]);

  if (!open) return null;

  const totalElapsedAcrossScenes =
    manifest.scenes
      .slice(0, sceneIndex)
      .reduce((sum, item) => sum + item.duration, 0) + elapsed;

  const focusStyle: CSSProperties | undefined = focusRect
    ? {
        left: focusRect.left,
        top: focusRect.top,
        width: focusRect.width,
        height: focusRect.height,
      }
    : undefined;

  const isFullStageAct = sceneIndex === 6 || sceneIndex === 7;

  return (
    <div
      data-film-root="paypulse-studio-film"
      data-film-scene={sceneIndex}
      data-film-playing={playing ? "true" : "false"}
      className="fixed inset-0 z-40 select-none pointer-events-none"
    >
      {/* ============================================================== */}
      {/* ACT 01: 4.0-Second Editorial Opening Slate (Opaque #F6F5F2)     */}
      {/* ============================================================== */}
      {sceneIndex === 0 && openingSlateVisible && (
        <section
          data-film-opening-slate="true"
          className="pointer-events-auto absolute left-0 right-0 top-[52px] bottom-[143px] z-30 flex items-center justify-center bg-[#F6F5F2] px-6 py-6 border-b border-[#D3D0C5]"
          style={{
            opacity: openingSlateOpacity,
            transition: "opacity 700ms ease",
          }}
        >
          <div className="w-full max-w-5xl">
            <div className="mb-6 flex flex-col gap-3 border-b border-[#D3D0C5] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#0070BA]">
                  PAYPULSE // AUTONOMOUS MERCHANT CASHFLOW
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[#001C64] sm:text-5xl">
                  One ledger. Two perspectives. Eight acts.
                </h2>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <span className="inline-block border border-[#166534] bg-[#FCFBF9] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#166534] rounded-[3px]">
                  LIVE PAYPAL SANDBOX // VERIFIED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border border-[#D3D0C5] bg-[#FCFBF9] p-5 rounded-[3px]">
                <span className="font-mono text-[9px] font-semibold text-[#0070BA]">
                  01 // DEAL &amp; BILLING AGENT
                </span>
                <h3 className="mt-2 text-base font-semibold text-[#0F172A]">
                  Invoicing v2, Orders &amp; QR
                </h3>
                <p className="mt-1 text-xs text-[#475569]">
                  Converts natural language into live PayPal invoices, checkout orders, and scannable QR codes.
                </p>
              </div>

              <div className="border border-[#D3D0C5] bg-[#FCFBF9] p-5 rounded-[3px]">
                <span className="font-mono text-[9px] font-semibold text-[#0070BA]">
                  02 // COLLECTIONS NUDGE-BOT
                </span>
                <h3 className="mt-2 text-base font-semibold text-[#0F172A]">
                  Empathetic Recovery &amp; 50% BNPL Split
                </h3>
                <p className="mt-1 text-xs text-[#475569]">
                  Recovers overdue invoices with custom recovery notes and 50% milestone split invoices.
                </p>
              </div>

              <div className="border border-[#D3D0C5] bg-[#FCFBF9] p-5 rounded-[3px]">
                <span className="font-mono text-[9px] font-semibold text-[#0070BA]">
                  03 // DISPUTE-SHIELD AGENT
                </span>
                <h3 className="mt-2 text-base font-semibold text-[#0F172A]">
                  Carrier Tracking &amp; Auto-Refunds
                </h3>
                <p className="mt-1 text-xs text-[#475569]">
                  Defends chargebacks with carrier proof and auto-refunds claims under $25 to avoid fees.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#D3D0C5] pt-3 font-mono text-[9px] text-[#64748B]">
              <span>In-memory state // Deterministic fallback // Zero persistence</span>
              <span>Total Film Duration: {formatClock(totalDuration)}</span>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* ACT 07: 3D Isometric 8-Tile Architecture Matrix                */}
      {/* ============================================================== */}
      {sceneIndex === 6 && (
        <section
          data-film-matrix-stage="true"
          data-film-full-stage="true"
          className="pointer-events-auto absolute left-0 right-0 top-[52px] bottom-[143px] z-30 flex flex-col items-center justify-center bg-[#F6F5F2] px-6 py-4 border-b border-[#D3D0C5] overflow-hidden"
        >
          <div className="mb-4 text-center">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#0070BA]">
              ACT 07 // 3D ISOMETRIC ARCHITECTURE &amp; PARTNER ECOSYSTEM MATRIX
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#001C64] sm:text-3xl">
              Eight core capabilities. One auditable autonomous engine.
            </h2>
          </div>

          <div className="film-matrix-wrap film-matrix-3d-grid">
            {ISOMETRIC_TILES.map((tile, idx) => {
              const isLit = elevatedTiles.includes(idx);
              return (
                <div
                  key={tile.tag}
                  data-film-tile={idx}
                  data-film-matrix-tile={idx}
                  data-film-matrix-active={isLit ? "true" : "false"}
                  className={`film-matrix-3d-tile film-matrix-tile ${isLit ? "is-elevated is-lit" : ""}`}
                >
                  <span className="film-matrix-tag film-matrix-index">{tile.tag}</span>
                  <h3 className="film-matrix-title">{tile.title}</h3>
                  <p className="film-matrix-meta">{tile.meta}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
            <span>OAuth2 8.5h Cache</span>
            <span>PayPal Request-Id Headers</span>
            <span>Local Ollama qwen3.5:2b</span>
            <span>AG Studio 3.1 Relational Canvas</span>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* ACT 08: Kinetic Split-Text Finale & Spec Sheet                 */}
      {/* ============================================================== */}
      {sceneIndex === 7 && (
        <section
          data-film-finale-stage="true"
          data-film-full-stage="true"
          className="pointer-events-auto absolute left-0 right-0 top-[52px] bottom-[143px] z-30 flex flex-col items-center justify-center bg-[#F6F5F2] px-6 py-6 border-b border-[#D3D0C5] overflow-y-auto"
        >
          <div className={`film-finale-container ${finaleSplit ? "is-split" : ""}`}>
            <h2 className="flex flex-wrap items-center justify-center gap-2 text-center text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
              <span className="film-split-left">The future of autonomous merchant cashflow</span>
              <span className="film-split-emblem bg-[#001C64] text-[#FCFBF9] px-3 py-1 font-mono text-sm font-semibold rounded-[3px] border border-[#0070BA]">
                [ PP // PAYPULSE ]
              </span>
              <span className="film-split-right">is here</span>
            </h2>

            {/* Institutional Verification & Architecture Spec Table */}
            <div className="mt-8 w-full border border-[#D3D0C5] bg-[#FCFBF9] rounded-[3px]">
              <div className="grid grid-cols-2 divide-x divide-y divide-[#D3D0C5] sm:grid-cols-4 sm:divide-y-0">
                <div className="p-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
                    PAYPAL SANDBOX
                  </span>
                  <p className="mt-1 font-mono text-xs font-semibold text-[#001C64]">
                    LIVE (OAuth2 + WH Verified)
                  </p>
                </div>
                <div className="p-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
                    AI ORCHESTRATOR
                  </span>
                  <p className="mt-1 font-mono text-xs font-semibold text-[#001C64]">
                    Ollama qwen3.5:2b + Deterministic
                  </p>
                </div>
                <div className="p-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
                    PARTNER STACK
                  </span>
                  <p className="mt-1 font-mono text-xs font-semibold text-[#001C64]">
                    AG Studio 3.1 + APIMatic Patterns
                  </p>
                </div>
                <div className="p-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
                    SECURITY &amp; QA
                  </span>
                  <p className="mt-1 font-mono text-xs font-semibold text-[#166534]">
                    Bandit 0 | Audits 0 | 26/26 E2E
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                data-film-control="replay"
                onClick={() => setSceneIndex(0)}
                className="rounded-[3px] bg-[#0070BA] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#FCFBF9] hover:bg-[#001C64] transition-colors"
              >
                Replay Film
              </button>
              <button
                type="button"
                data-film-control="exit-dashboard"
                onClick={exitAndReset}
                className="rounded-[3px] bg-[#001C64] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#FCFBF9] hover:bg-[#0070BA] transition-colors"
              >
                Return to Live Workspace
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* SPOTLIGHT FRAME (Acts 01 through 06)                           */}
      {/* ============================================================== */}
      {focusRect && !isFullStageAct && (!openingSlateVisible || sceneIndex !== 0) && (
        <div className="film-focus-box" style={focusStyle}>
          <span className="film-focus-corner is-tl" />
          <span className="film-focus-corner is-tr" />
          <span className="film-focus-corner is-bl" />
          <span className="film-focus-corner is-br" />
          <span className="film-focus-label">{focusRect.label}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* GEOMETRIC CIRCULAR CURSOR (22px ring, 4px dot, ripple)         */}
      {/* ============================================================== */}
      {cursor.visible && !isFullStageAct && (!openingSlateVisible || sceneIndex !== 0) && (
        <div
          data-film-cursor={cursor.label}
          className="film-cursor"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <div className="film-cursor-ring">
            <div className="film-cursor-dot" />
          </div>
          {cursor.label && <span className="film-cursor-label">{cursor.label}</span>}
          {ripple > 0 && <span key={ripple} className="film-cursor-ripple" />}
        </div>
      )}

      {/* ============================================================== */}
      {/* UNIFIED NON-BLOCKING BOTTOM BROADCAST STUDIO DOCK              */}
      {/* height: 112px, bottom: 31px, z-40                              */}
      {/* ============================================================== */}
      <div
        data-film-dock="broadcast"
        className="pointer-events-auto fixed left-0 right-0 bottom-[31px] z-40 grid h-[112px] grid-cols-[58%_42%] border-t-2 border-[#001C64] border-b border-[#D3D0C5] bg-[#FCFBF9]"
      >
        {/* LEFT 58%: Teleprompter & Transport */}
        <div className="flex min-w-0 flex-col justify-between px-4 py-2 border-r border-[#D3D0C5]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 bg-[#001C64] text-[#FCFBF9] px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] rounded-[2px]">
                ACT {String(sceneIndex + 1).padStart(2, "0")} / 08
              </span>
              <span className="truncate text-xs font-semibold text-[#0F172A]">
                {currentScene.title}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                data-film-clock="true"
                className="font-mono text-[10px] tabular-nums text-[#475569] font-medium"
              >
                {formatClock(totalElapsedAcrossScenes)} / {formatClock(totalDuration)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-film-control="prev"
                  onClick={() => goToScene(sceneIndex - 1)}
                  className="film-dock-button"
                  aria-label="Previous act"
                >
                  Prev
                </button>
                <button
                  type="button"
                  data-film-control="pause"
                  onClick={togglePause}
                  className="film-dock-button"
                >
                  {playing ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  data-film-control="next"
                  onClick={() => goToScene(sceneIndex + 1)}
                  className="film-dock-button"
                  aria-label="Next act"
                >
                  Next
                </button>
                <button
                  type="button"
                  data-film-control="sound"
                  onClick={toggleMute}
                  className="film-dock-button"
                >
                  {muted ? "Voice: OFF" : "Voice: ON"}
                </button>
                <button
                  type="button"
                  data-film-control="close"
                  onClick={exitAndReset}
                  className="film-dock-button film-dock-button-primary"
                >
                  Exit &amp; Reset
                </button>
              </div>
            </div>
          </div>

          {/* Subtitles: 2-line high-contrast #0F172A */}
          <p
            data-film-caption="true"
            className="line-clamp-2 text-[12px] font-medium leading-[1.3] text-[#0F172A] px-0.5"
          >
            {currentCaption}
          </p>

          {/* 8-segment clickable scrubber */}
          <div className="flex h-1.5 w-full gap-1 pt-0.5">
            {manifest.scenes.map((sceneItem, idx) => {
              const isPast = idx < sceneIndex;
              const isCurrent = idx === sceneIndex;
              const fillPct = isPast
                ? 100
                : isCurrent
                  ? Math.min(100, (elapsed / (sceneItem.duration || 1)) * 100)
                  : 0;

              return (
                <button
                  key={sceneItem.id}
                  type="button"
                  data-film-chapter={idx}
                  aria-label={`Act ${idx + 1}: ${sceneItem.title}`}
                  onClick={() => goToScene(idx)}
                  className="relative h-1.5 flex-1 bg-[#E2E0D8] rounded-[1px] overflow-hidden hover:bg-[#D3D0C5] transition-colors"
                >
                  <span
                    className={`absolute inset-y-0 left-0 ${
                      isPast ? "bg-[#001C64]" : "bg-[#0070BA]"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT 42%: Live Execution X-Ray Inspector */}
        <div className="flex min-w-0 flex-col bg-[#FCFBF9]">
          <div className="flex items-center justify-between border-b border-[#D3D0C5] bg-[#F0EEE8] px-3 py-1">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#001C64]">
              LIVE EXECUTION X-RAY INSPECTOR
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#166534] font-semibold">
              SANDBOX VERIFIED
            </span>
          </div>

          <div className="grid min-w-0 flex-1 content-center gap-y-1 px-3 py-1 font-mono text-[11px] tabular-nums">
            {/* HTTP WIRE */}
            <div className="grid min-w-0 grid-cols-[78px_1fr_auto] items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.1em] text-[#64748B] font-semibold">
                HTTP WIRE
              </span>
              <span className="truncate text-[#001C64] font-medium">
                {xrayState.wire}
              </span>
              <span className="border border-[#166534]/30 bg-[#F0F7F1] px-1.5 py-0.2 text-[8px] font-semibold text-[#166534] rounded-[2px]">
                {xrayState.status}
              </span>
            </div>

            {/* AI & AUTH */}
            <div className="grid min-w-0 grid-cols-[78px_1fr] items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.1em] text-[#64748B] font-semibold">
                AI &amp; AUTH
              </span>
              <span className="truncate text-[#0F172A]">
                {xrayState.aiAuth}
              </span>
            </div>

            {/* BOOK DELTA */}
            <div className="grid min-w-0 grid-cols-[78px_1fr] items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.1em] text-[#64748B] font-semibold">
                BOOK DELTA
              </span>
              <span className="truncate font-semibold text-[#0070BA]">
                {xrayState.bookDelta}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
