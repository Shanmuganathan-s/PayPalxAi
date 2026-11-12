import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AgentResult, ChatMessage, LlmStatus } from "../types";
import type { QrTarget } from "./QrModal";
import { formatCurrency } from "../lib/format";
import { SkeletonRows } from "./SkeletonLoader";

interface AgentConsoleProps {
  messages: ChatMessage[];
  busy: boolean;
  llm: LlmStatus | null;
  onRun: (prompt: string) => Promise<AgentResult | null>;
  onShowQr: (target: QrTarget) => void;
}

const suggestions = [
  {
    index: "01",
    label: "Invoice Acme Robotics $1,450",
    prompt:
      "Invoice Acme Robotics $1,450 for an edge AI deployment and send a PayPal QR checkout order.",
  },
  {
    index: "02",
    label: "Launch $299/mo retainer",
    prompt:
      "Create a $299 monthly telemetry retainer subscription plan for Orbital Labs.",
  },
  {
    index: "03",
    label: "Collect overdue balance",
    prompt:
      "Nudge the top overdue invoice with a 50% PayPal Pay Later milestone split.",
  },
  {
    index: "04",
    label: "Defend a $480 dispute",
    prompt:
      "Build dispute evidence for a $480 item-not-received chargeback and attach shipment tracking.",
  },
];

function richText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[#0F172A]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="border border-[#D3D0C5] bg-[#F0EEE8] px-1 py-0.5 text-[10px] text-[#001C64]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function qrTargetFor(result: AgentResult): QrTarget | null {
  const data = result.data ?? {};
  const invoiceId = String(data.invoice_id ?? data.id ?? "");
  if (!invoiceId) return null;
  return {
    invoiceId,
    invoiceNumber: String(
      data.invoice_number ?? data.invoice_id ?? "PayPal invoice",
    ),
    customerName:
      typeof data.recipient_name === "string"
        ? data.recipient_name
        : typeof data.customer_name === "string"
          ? data.customer_name
          : null,
    amount: Number(data.amount ?? data.issued_amount ?? 0),
    qrCode:
      typeof data.qr_code === "string"
        ? data.qr_code
        : typeof data.qr_base64 === "string"
          ? data.qr_base64
          : null,
    payerUrl:
      typeof data.payer_view_url === "string"
        ? data.payer_view_url
        : typeof data.approve_url === "string"
          ? data.approve_url
          : null,
  };
}

export function AgentConsole({
  messages,
  busy,
  llm,
  onRun,
  onShowQr,
}: AgentConsoleProps) {
  const aiOnline = Boolean(llm?.configured && llm.reachable);
  const aiLabel = aiOnline
    ? `${llm?.provider ?? "llm"} / ${llm?.model ?? "ready"}`
    : llm?.configured
      ? "Model offline / fallback"
      : "Deterministic fallback";
  const [prompt, setPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  async function submit(text?: string) {
    const value = (text ?? prompt).trim();
    if (!value || busy) return;
    setPrompt("");
    await onRun(value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <section
      data-film-panel="AgentConsole"
      className="flex h-full min-w-0 flex-col border border-[#E2E0D8] bg-[#FCFBF9]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E0D8] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
            04
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Deal desk
            </h2>
            <p className="text-[10px] text-[#64748B]">
              Invoicing / collections / disputes
            </p>
          </div>
        </div>
        <span
          title={llm?.model_note ?? llm?.last_error ?? llm?.base_url ?? undefined}
          className={`inline-flex max-w-[240px] items-center gap-1.5 truncate border px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${
            aiOnline
              ? "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]"
              : "border-[#92400E]/30 bg-[#FBF6EE] text-[#92400E]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 ${
              aiOnline ? "bg-[#166534]" : "bg-[#92400E]"
            }`}
          />
          <span className="truncate">{aiLabel}</span>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-[340px] flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <span className="border border-[#D3D0C5] bg-[#F6F5F2] px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#001C64]">
              AGENT
            </span>
            <p className="mt-3 text-sm font-semibold text-[#0F172A]">
              Choose a PayPal action
            </p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#64748B]">
              Create an invoice, start a subscription, send a collection nudge, or
              prepare dispute evidence. Results update the ledger and inspector.
            </p>
          </div>
        )}

        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] border border-[#001C64] bg-[#001C64] px-3.5 py-2.5 text-[11px] leading-5 text-[#FCFBF9]">
                  {message.text}
                </div>
              </div>
            );
          }

          if (message.role === "error") {
            return (
              <div
                key={message.id}
                className="border border-[#991B1B]/30 bg-[#FBF1F1] px-3.5 py-2.5 text-[11px] leading-5 text-[#991B1B]"
              >
                {message.text}
              </div>
            );
          }

          const result = message.result;
          const target = result ? qrTargetFor(result) : null;
          return (
            <div key={message.id} className="flex gap-3">
              <span className="mt-0.5 h-7 w-7 shrink-0 border border-[#D3D0C5] bg-[#F6F5F2] px-1 py-1.5 text-center font-mono text-[8px] font-semibold text-[#001C64]">
                AG
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="border border-[#E2E0D8] bg-[#F6F5F2] px-3.5 py-3 text-[11px] leading-5 text-[#334155]">
                  <p className="whitespace-pre-wrap">{richText(message.text)}</p>
                  {result && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#D3D0C5] pt-2.5">
                      <span className="border border-[#D3D0C5] bg-[#FCFBF9] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                        {result.agent}
                      </span>
                      <span className="border border-[#D3D0C5] bg-[#FCFBF9] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                        {result.action.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${
                          result.mode === "LIVE"
                            ? "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]"
                            : "border-[#92400E]/30 bg-[#FBF6EE] text-[#92400E]"
                        }`}
                      >
                        {result.mode}
                      </span>
                      {result.reasoning === "llm" && (
                        <span className="border border-[#0070BA]/30 bg-[#F1F7FB] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#001C64]">
                          Model tool call
                        </span>
                      )}
                      {result.log?.impact && (
                        <span className="border border-[#0070BA]/30 bg-[#F1F7FB] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#001C64]">
                          {result.log.impact}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {result && target && (
                  <div
                    data-tour-id="agent-result-card"
                    className="flex flex-wrap items-center gap-2 border border-[#E2E0D8] bg-[#FCFBF9] px-3 py-2"
                  >
                    <div className="mr-auto min-w-0">
                      <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">
                        PayPal artifact
                      </p>
                      <p className="truncate font-mono text-[10px] text-[#0F172A]">
                        {target.invoiceNumber} / {formatCurrency(target.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onShowQr(target)}
                      className="border border-[#D3D0C5] bg-[#F6F5F2] px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#001C64] hover:border-[#0070BA]"
                    >
                      Payment QR
                    </button>
                    {target.payerUrl && (
                      <a
                        href={target.payerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[#D3D0C5] bg-[#FCFBF9] px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#475569] hover:border-[#0070BA] hover:text-[#001C64]"
                      >
                        Payer link
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="space-y-2" aria-busy="true">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#64748B]">
              {aiOnline
                ? `Running ${llm?.model ?? "model"} and calling PayPal tools`
                : "Calling PayPal tools"}
            </p>
            <SkeletonRows rows={2} label="Agent execution in progress" />
          </div>
        )}
      </div>

      <div className="border-t border-[#E2E0D8] p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => void submit(suggestion.prompt)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 border border-[#D3D0C5] bg-[#F6F5F2] px-2.5 py-1.5 text-[10px] font-medium text-[#475569] hover:border-[#0070BA] hover:text-[#001C64] disabled:opacity-40"
            >
              <span className="font-mono text-[8px] text-[#94A3B8]">
                {suggestion.index}
              </span>
              {suggestion.label}
            </button>
          ))}
        </div>
        <div
          data-tour-id="agent-prompt-box"
          className="flex items-end gap-2 border border-[#D3D0C5] bg-[#FCFBF9] p-2 focus-within:border-[#0070BA]"
        >
          <textarea
            data-film-prompt="deal-desk"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Describe the invoice, collection, dispute, or report you need."
            className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[11px] leading-5 text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          />
          <button
            type="button"
            data-film-run="deal-desk"
            onClick={() => void submit()}
            disabled={busy || !prompt.trim()}
            className="border border-[#001C64] bg-[#001C64] px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#FCFBF9] hover:bg-[#0070BA] disabled:border-[#D3D0C5] disabled:bg-[#F0EEE8] disabled:text-[#94A3B8]"
            aria-label="Send prompt"
          >
            {busy ? "Working" : "Run"}
          </button>
        </div>
        <p className="mt-2 font-mono text-[9px] text-[#94A3B8]">
          Enter to send / Shift+Enter for a new line / deterministic fallback always
          available
        </p>
      </div>
    </section>
  );
}
