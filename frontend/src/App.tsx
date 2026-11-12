import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";
import type {
  AgentResult,
  ChatMessage,
  DashboardData,
  Invoice,
  LlmStatus,
  PayPalStatus,
  Summary,
} from "./types";
import { formatCurrency, timeLabel } from "./lib/format";
import { resumeAudioContext } from "./lib/soundEngine";
import { KpiRibbon } from "./components/KpiRibbon";
import { StudioPanel } from "./components/StudioPanel";
import { AgentConsole } from "./components/AgentConsole";
import { InvoiceTable } from "./components/InvoiceTable";
import { QrModal, type QrTarget } from "./components/QrModal";
import { StudioFilmDirector } from "./components/StudioFilmDirector";
import { SimulatorBar } from "./components/SimulatorBar";
import { WebhookFeed } from "./components/WebhookFeed";
import { PolicyPanel } from "./components/PolicyPanel";
import { CommandRail } from "./components/CommandRail";
import { SkeletonPanel, SkeletonRows } from "./components/SkeletonLoader";

type View = "overview" | "deals" | "events";

interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
}

const navItems: Array<{
  id: View;
  label: string;
  hint: string;
  index: string;
}> = [
  {
    id: "overview",
    label: "Command center",
    hint: "Portfolio overview",
    index: "01",
  },
  {
    id: "deals",
    label: "Deal desk",
    hint: "Actions and ledger",
    index: "02",
  },
  {
    id: "events",
    label: "Webhook room",
    hint: "Tests and audit log",
    index: "03",
  },
];

const viewCopy: Record<View, { title: string; subtitle: string }> = {
  overview: {
    title: "Command center",
    subtitle: "Invoice, subscription, collection, and dispute operations.",
  },
  deals: {
    title: "Deal desk",
    subtitle: "Run PayPal actions, then review the invoice ledger.",
  },
  events: {
    title: "Webhook control room",
    subtitle: "Send sample events and review the structured audit trail.",
  },
};

const emptySummary: Summary = {
  total_issued: 0,
  total_paid: 0,
  overdue_total: 0,
  collection_rate: 0,
  open_invoices: 0,
  disputes_defended_usd: 0,
  disputes_defended_count: 0,
  refunds_issued_usd: 0,
  active_subscriptions: 0,
};

let messageCounter = 0;
function nextId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const docsHref = apiBase
  ? `${apiBase}/docs`
  : import.meta.env.DEV
    ? "http://localhost:8000/docs"
    : "/docs";

const toastTone: Record<Toast["tone"], string> = {
  success: "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]",
  error: "border-[#991B1B]/30 bg-[#FBF1F1] text-[#991B1B]",
  info: "border-[#0070BA]/30 bg-[#F1F7FB] text-[#001C64]",
};

const toastLabel: Record<Toast["tone"], string> = {
  success: "OK",
  error: "ERR",
  info: "INFO",
};

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [paypal, setPaypal] = useState<PayPalStatus | null>(null);
  const [llm, setLlm] = useState<LlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentBusy, setAgentBusy] = useState(false);
  const [busyScenario, setBusyScenario] = useState<string | null>(null);
  const agentBusyCount = useRef(0);
  const simulateBusyCount = useRef(0);
  const [resetting, setResetting] = useState(false);
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [filmOpen, setFilmOpen] = useState(false);

  const summary = data?.summary ?? emptySummary;
  const mode = data?.mode ?? paypal?.mode ?? "SIMULATED";
  const apiOnline = Boolean(data) && !error;
  const modelOnline = Boolean(llm?.configured && llm.reachable);

  const pushToast = useCallback((tone: Toast["tone"], message: string) => {
    setToast({ id: Date.now(), tone, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (filmOpen) {
      document.body.dataset.filmPlaying = "true";
    } else {
      delete document.body.dataset.filmPlaying;
      document.querySelectorAll("[data-tour-focused]").forEach((node) => {
        node.removeAttribute("data-tour-focused");
      });
    }
    return () => {
      delete document.body.dataset.filmPlaying;
    };
  }, [filmOpen]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [dashboard, paypalStatus, llmStatus] = await Promise.all([
        api.dashboard(),
        api.paypalStatus(),
        api.llmStatus(),
      ]);
      setData(dashboard);
      setPaypal(paypalStatus);
      setLlm(llmStatus);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the PayPulse API");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runPrompt = useCallback(
    async (prompt: string): Promise<AgentResult | null> => {
      agentBusyCount.current += 1;
      setAgentBusy(true);
      setMessages((current) => [
        ...current,
        { id: nextId("user"), role: "user", text: prompt },
      ]);
      try {
        const result = await api.chat(prompt);
        setMessages((current) => [
          ...current,
          {
            id: nextId("agent"),
            role: "agent",
            text: result.reply,
            result,
          },
        ]);
        void load(true);
        pushToast(
          "success",
          `${result.agent}: ${result.log?.impact ?? result.action.replace(/_/g, " ")}`,
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Agent run failed";
        setMessages((current) => [
          ...current,
          { id: nextId("error"), role: "error", text: message },
        ]);
        pushToast("error", message);
        return null;
      } finally {
        agentBusyCount.current = Math.max(0, agentBusyCount.current - 1);
        if (agentBusyCount.current === 0) setAgentBusy(false);
      }
    },
    [load, pushToast],
  );

  const simulate = useCallback(
    async (scenario: string) => {
      simulateBusyCount.current += 1;
      setBusyScenario(scenario);
      try {
        const result = await api.simulate(scenario);
        await load(true);
        if (result.result) {
          setMessages((current) => [
            ...current,
            {
              id: nextId("agent"),
              role: "agent",
              text: result.result?.reply ?? "Collections sweep executed.",
              result: result.result,
            },
          ]);
        }
        const impact =
          result.handled?.impact ?? result.result?.log?.impact ?? "state updated";
        pushToast("success", `${scenario} processed: ${impact}`);
      } catch (err) {
        pushToast(
          "error",
          err instanceof Error ? err.message : `Could not run ${scenario}`,
        );
      } finally {
        simulateBusyCount.current = Math.max(0, simulateBusyCount.current - 1);
        if (simulateBusyCount.current === 0) setBusyScenario(null);
      }
    },
    [load, pushToast],
  );

  const resetDemo = useCallback(async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await api.reset();
      setMessages([]);
      await load(true);
      pushToast("info", "Demo state reset to the seeded receivables book.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }, [load, pushToast, resetting]);

  const showInvoiceQr = useCallback((invoice: Invoice) => {
    setQrTarget({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      amount: Number(invoice.issued_amount ?? 0),
      qrCode: invoice.qr_base64,
      payerUrl: invoice.payer_view_url,
    });
  }, []);

  const nudgeInvoice = useCallback(
    async (invoice: Invoice) => {
      setBusyInvoiceId(invoice.id);
      try {
        await runPrompt(
          `Nudge ${invoice.invoice_number} for ${invoice.customer_name} with a 50% PayPal Pay Later split.`,
        );
      } finally {
        setBusyInvoiceId(null);
      }
    },
    [runPrompt],
  );

  const dataKey = useMemo(() => {
    if (!data) return "empty";
    return [
      data.generated_at,
      data.invoices.length,
      data.summary.total_paid,
      data.summary.disputes_defended_usd,
      data.summary.refunds_issued_usd,
    ].join(":");
  }, [data]);

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-[#0F172A]">
      <div
        id="film-viewport"
        className="flex min-h-screen transition-transform duration-700"
      >
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[#E2E0D8] bg-[#FCFBF9] px-4 py-5 lg:flex">
          <button
            type="button"
            onClick={() => setView("overview")}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center border-2 border-[#001C64] bg-[#001C64] font-mono text-[11px] font-semibold tracking-[0.08em] text-[#FCFBF9]">
              PP
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-[#0F172A]">
                PayPulse
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-[#64748B]">
                PayPal operations ledger
              </span>
            </span>
          </button>

          <nav className="mt-8 border-t border-[#E2E0D8] pt-4" aria-label="Workspace">
            <p className="px-1 pb-2 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[#64748B]">
              Workspace
            </p>
            <div className="space-y-px">
              {navItems.map((item) => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-film-nav={item.id}
                    onClick={() => setView(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-start gap-3 border-l-2 px-2 py-2.5 text-left ${
                      active
                        ? "border-[#0070BA] bg-[#F1F7FB]"
                        : "border-transparent hover:bg-[#F0EEE8]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 font-mono text-[9px] ${
                        active ? "text-[#0070BA]" : "text-[#94A3B8]"
                      }`}
                    >
                      {item.index}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[11px] font-semibold ${
                          active ? "text-[#001C64]" : "text-[#0F172A]"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="block text-[10px] text-[#64748B]">
                        {item.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto border-t border-[#E2E0D8] pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#64748B]">
                Environment
              </span>
              <span
                className={`border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] ${
                  mode === "LIVE"
                    ? "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]"
                    : "border-[#92400E]/30 bg-[#FBF6EE] text-[#92400E]"
                }`}
              >
                {mode}
              </span>
            </div>
            <dl className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <dt className="text-[#64748B]">Invoices</dt>
                <dd className="font-mono font-medium text-[#0F172A]">
                  {data?.invoices.length ?? 0}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <dt className="text-[#64748B]">Open exposure</dt>
                <dd className="font-mono font-medium text-[#92400E]">
                  {formatCurrency(summary.overdue_total)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <dt className="text-[#64748B]">Agent events</dt>
                <dd className="font-mono font-medium text-[#0F172A]">
                  {data?.agent_logs.length ?? 0}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <dt className="text-[#64748B]">PayPal API</dt>
                <dd className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#166534]">
                  {paypal?.token_ok ? "Token valid" : "Pending"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border border-[#E2E0D8] bg-[#F6F5F2] p-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
                AG Studio 3.1
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[#64748B]">
                Embedded receivables analytics with cross-filtering, calculated
                fields and saved report state.
              </p>
            </div>

            <p className="mt-3 font-mono text-[9px] leading-4 text-[#94A3B8]">
              Sandbox demo / FastAPI + React
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[#E2E0D8] bg-[#F6F5F2]">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setView("overview")}
                className="flex items-center gap-2 lg:hidden"
              >
                <span className="flex h-8 w-8 items-center justify-center border-2 border-[#001C64] bg-[#001C64] font-mono text-[10px] font-semibold text-[#FCFBF9]">
                  PP
                </span>
                <span className="text-sm font-semibold text-[#0F172A]">PayPulse</span>
              </button>

              <div className="hidden min-w-0 flex-1 lg:block">
                <div className="flex items-center gap-3">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-[#0F172A]">
                    {viewCopy[view].title}
                  </h1>
                  <span
                    className={`hidden items-center gap-1.5 border px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] sm:inline-flex ${
                      apiOnline
                        ? "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]"
                        : "border-[#991B1B]/30 bg-[#FBF1F1] text-[#991B1B]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 ${
                        apiOnline ? "bg-[#166534]" : "bg-[#991B1B]"
                      }`}
                    />
                    {apiOnline ? "API connected" : "API offline"}
                  </span>
                </div>
                <p className="truncate text-[11px] text-[#64748B]">
                  {viewCopy[view].subtitle}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span
                  className={`hidden items-center gap-1.5 border px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] sm:inline-flex ${
                    mode === "LIVE"
                      ? "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]"
                      : "border-[#92400E]/30 bg-[#FBF6EE] text-[#92400E]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 ${
                      mode === "LIVE" ? "bg-[#166534]" : "bg-[#92400E]"
                    }`}
                  />
                  {mode === "LIVE" ? "ENVIRONMENT LIVE" : "ENVIRONMENT SIMULATED"}
                </span>
                <span className="hidden border border-[#E2E0D8] bg-[#FCFBF9] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#001C64] md:inline-flex">
                  PAYPAL API
                </span>
                <span
                  title={llm?.model_note ?? llm?.last_error ?? llm?.base_url ?? undefined}
                  className="hidden border border-[#E2E0D8] bg-[#FCFBF9] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#475569] md:inline-flex"
                >
                  {modelOnline
                    ? "MODEL TOOLS"
                    : llm?.configured
                      ? "MODEL OFFLINE"
                      : "DETERMINISTIC"}
                </span>
                <button
                  type="button"
                  data-film-open="studio-film"
                  onClick={() => {
                    resumeAudioContext();
                    setFilmOpen(true);
                  }}
                  className="border border-[#001C64] bg-[#001C64] px-2.5 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#FCFBF9] hover:bg-[#0070BA]"
                >
                  Watch 2:45 Studio Film
                </button>
                <button
                  type="button"
                  onClick={() => void load(true)}
                  disabled={refreshing}
                  className="border border-[#D3D0C5] bg-[#FCFBF9] px-2.5 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#475569] hover:border-[#0070BA] hover:text-[#001C64] disabled:opacity-50"
                >
                  {refreshing ? "Refreshing" : "Refresh"}
                </button>
                <span className="flex h-8 w-8 items-center justify-center border border-[#D3D0C5] bg-[#FCFBF9] font-mono text-[10px] font-semibold text-[#001C64]">
                  AR
                </span>
              </div>
            </div>

            <div className="flex gap-px overflow-x-auto border-t border-[#E2E0D8] bg-[#E2E0D8] px-4 py-0 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-film-nav={item.id}
                  onClick={() => setView(item.id)}
                  className={`whitespace-nowrap bg-[#FCFBF9] px-3 py-2 font-mono text-[9px] font-semibold tracking-[0.02em] ${
                    view === item.id ? "text-[#0070BA]" : "text-[#475569]"
                  }`}
                >
                  {item.index} / {item.label}
                </button>
              ))}
            </div>
          </header>

          <main
            id="film-camera"
            data-film-camera="true"
            data-film-active={filmOpen ? "true" : "false"}
            className="mx-auto w-full max-w-[1520px] flex-1 px-4 py-4 transition-[padding] duration-300 sm:px-6 sm:py-5"
            style={filmOpen ? { paddingBottom: "156px" } : undefined}
          >
            {error && (
              <div className="mb-3 flex flex-wrap items-center gap-3 border border-[#991B1B]/30 bg-[#FBF1F1] px-3.5 py-2.5 text-xs text-[#991B1B]">
                <span className="border border-[#991B1B]/30 px-1.5 py-0.5 font-mono text-[9px] font-semibold">
                  ERR
                </span>
                <span className="min-w-0 flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="border border-[#991B1B]/30 bg-[#FCFBF9] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]"
                >
                  Retry
                </button>
              </div>
            )}

            {refreshing && data && (
              <div className="mb-3">
                <SkeletonRows rows={1} label="Refreshing dashboard data" />
              </div>
            )}

            {loading && !data && (
              <div className="space-y-3">
                <SkeletonPanel label="Loading dashboard data" />
                <SkeletonRows rows={4} label="Loading invoice records" />
              </div>
            )}

            {!loading && !data && !error && (
              <div className="border border-[#E2E0D8] bg-[#FCFBF9] px-5 py-12 text-center">
                <p className="text-sm font-semibold text-[#0F172A]">No data yet</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Start the FastAPI backend on port 8000 and refresh.
                </p>
              </div>
            )}

            {data && view === "overview" && (
              <div className="space-y-3">
                <KpiRibbon summary={data.summary} />
                <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
                  <StudioPanel data={data} dataKey={dataKey} />
                  <CommandRail
                    paypal={paypal}
                    llm={llm}
                    summary={data.summary}
                    busy={agentBusy}
                    onRun={runPrompt}
                  />
                </div>
              </div>
            )}

            {data && view === "deals" && (
              <div className="space-y-3">
                <KpiRibbon summary={data.summary} />
                <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
                  <div className="min-w-0 space-y-3">
                    <AgentConsole
                      messages={messages}
                      busy={agentBusy}
                      llm={llm}
                      onRun={runPrompt}
                      onShowQr={setQrTarget}
                    />
                    <InvoiceTable
                      invoices={data.invoices}
                      onShowQr={showInvoiceQr}
                      onNudge={nudgeInvoice}
                      busyInvoiceId={busyInvoiceId}
                      busy={agentBusy}
                    />
                  </div>
                  <CommandRail
                    paypal={paypal}
                    llm={llm}
                    summary={data.summary}
                    busy={agentBusy}
                    onRun={runPrompt}
                  />
                </div>
              </div>
            )}

            {data && view === "events" && (
              <div className="space-y-3">
                <KpiRibbon summary={data.summary} />
                <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
                  <div className="min-w-0 space-y-3">
                    <SimulatorBar
                      busyScenario={busyScenario}
                      onSimulate={simulate}
                      onReset={resetDemo}
                      resetting={resetting}
                    />
                    <WebhookFeed logs={data.agent_logs} />
                  </div>
                  <PolicyPanel summary={data.summary} />
                </div>
              </div>
            )}
          </main>

          <footer className="sticky bottom-0 z-20 mt-auto border-t border-[#E2E0D8] bg-[#FCFBF9] px-4 py-2 sm:px-6">
            <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.06em] text-[#64748B]">
              <span className="hidden sm:inline">
                PayPulse / PayPal Invoicing, Orders, Subscriptions, Disputes, Webhooks
              </span>
              <span className="flex items-center gap-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 ${
                      apiOnline ? "bg-[#166534]" : "bg-[#991B1B]"
                    }`}
                  />
                  {apiOnline ? "API connected" : "API offline"}
                </span>
                <span className="hidden md:inline">
                  Synced {timeLabel(data?.generated_at)}
                </span>
                <a
                  href={docsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden hover:text-[#001C64] sm:inline"
                >
                  API docs
                </a>
                <a href="/terms.html" className="hover:text-[#001C64]">
                  Terms of Service
                </a>
                <a href="/privacy.html" className="hover:text-[#001C64]">
                  Privacy Policy
                </a>
              </span>
            </div>
          </footer>
        </div>
      </div>

      <QrModal target={qrTarget} onClose={() => setQrTarget(null)} />

      <StudioFilmDirector
        open={filmOpen}
        data={data}
        view={view}
        qrTarget={qrTarget}
        onClose={() => setFilmOpen(false)}
        onViewChange={setView}
        onRun={runPrompt}
        onSimulate={simulate}
        onReset={resetDemo}
        onRefresh={() => load(true)}
        onShowQr={setQrTarget}
        onCloseQr={() => setQrTarget(null)}
        pushToast={pushToast}
      />

      {toast && (
        <div className="fixed bottom-14 right-4 z-50 max-w-sm">
          <div
            className={`flex items-start gap-2.5 border bg-[#FCFBF9] px-3.5 py-3 ${
              toastTone[toast.tone]
            }`}
          >
            <span className="mt-0.5 border border-current px-1 py-0.5 font-mono text-[8px] font-semibold">
              {toastLabel[toast.tone]}
            </span>
            <p className="min-w-0 flex-1 text-[11px] leading-4">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="font-mono text-[10px] text-current hover:underline"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
