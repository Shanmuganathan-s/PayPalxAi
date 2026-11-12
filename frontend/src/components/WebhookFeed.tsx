import { useState } from "react";
import type { AgentLog } from "../types";

interface WebhookFeedProps {
  logs: AgentLog[];
}

type Filter = "ALL" | "DISPUTES" | "COLLECTIONS" | "SYSTEM";

const filters: Array<{ id: Filter; label: string }> = [
  { id: "ALL", label: "All events" },
  { id: "DISPUTES", label: "Dispute shield" },
  { id: "COLLECTIONS", label: "Collections" },
  { id: "SYSTEM", label: "System" },
];

function matches(log: AgentLog, filter: Filter): boolean {
  if (filter === "ALL") return true;
  const agent = log.agent.toLowerCase();
  if (filter === "DISPUTES") {
    return agent.includes("dispute") || log.event_type.includes("DISPUTE");
  }
  if (filter === "COLLECTIONS") {
    return (
      agent.includes("collection") ||
      agent.includes("billing") ||
      log.event_type.includes("INVOIC")
    );
  }
  return (
    !agent.includes("dispute") &&
    !agent.includes("billing") &&
    !agent.includes("collection") &&
    !agent.includes("nudge") &&
    !log.event_type.includes("INVOIC")
  );
}

function endpointFor(log: AgentLog): string {
  const event = log.event_type.toUpperCase();
  if (event.includes("DISPUTE")) return "POST /api/webhooks/paypal";
  if (event.includes("REFUND")) return "POST /api/payments/refund";
  if (event.includes("INVOIC")) return "POST /api/invoices";
  if (event.includes("SUBSCRIPTION")) return "POST /api/subscriptions";
  return "POST /api/webhooks/paypal";
}

function latencyFor(log: AgentLog): number {
  const text = `${log.id}${log.timestamp}${log.event_type}`;
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 997;
  }
  return 148 + (hash % 620);
}

function statusFor(log: AgentLog): { code: string; tone: string } {
  const status = log.status.toUpperCase();
  if (status.includes("FAIL") || status.includes("DENIED")) {
    return {
      code: status.includes("DENIED") ? "202" : "502",
      tone: "border-[#991B1B]/30 bg-[#FBF1F1] text-[#991B1B]",
    };
  }
  return {
    code: "200",
    tone: "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]",
  };
}

export function WebhookFeed({ logs }: WebhookFeedProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const visible = logs.filter((log) => matches(log, filter));

  return (
    <section
      data-film-panel="WebhookFeed"
      className="min-w-0 border border-[#E2E0D8] bg-[#FCFBF9]"
    >
      <div className="border-b border-[#E2E0D8] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
                07
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
                Agent event stream
              </h2>
            </div>
            <p className="mt-1 text-[10px] text-[#64748B]">
              Structured HTTP and event inspector for every webhook, decision and receipt.
            </p>
          </div>
          <span className="border border-[#E2E0D8] bg-[#F6F5F2] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#475569]">
            {logs.length} events
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-px border border-[#D3D0C5] bg-[#D3D0C5]">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] ${
                filter === item.id
                  ? "bg-[#001C64] text-[#FCFBF9]"
                  : "bg-[#F6F5F2] text-[#475569] hover:bg-[#FCFBF9] hover:text-[#001C64]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div data-tour-id="webhook-audit-feed" className="max-h-[620px] overflow-auto">
        {visible.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">
              No events in this lane yet
            </p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">
              Fire a simulator scenario to populate the inspector.
            </p>
          </div>
        ) : (
          <table className="min-w-[820px] w-full text-left">
            <thead className="sticky top-0 bg-[#F0EEE8]">
              <tr className="border-b border-[#D3D0C5] font-mono text-[8px] uppercase tracking-[0.12em] text-[#64748B]">
                <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                <th className="px-3 py-2.5 font-semibold">Component</th>
                <th className="px-3 py-2.5 font-semibold">Method / Endpoint</th>
                <th className="px-3 py-2.5 text-right font-semibold">Latency</th>
                <th className="px-4 py-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((log) => {
                const status = statusFor(log);
                const positive =
                  log.impact.startsWith("+") ||
                  log.impact.startsWith("Protected") ||
                  log.impact.startsWith("Saved");
                return (
                  <tr
                    key={`${log.id}-${log.timestamp}`}
                    className="border-b border-[#E2E0D8] align-top last:border-b-0 hover:bg-[#F6F5F2]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[9px] text-[#64748B]">
                      {log.timestamp}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-[10px] font-semibold text-[#0F172A]">
                        {log.agent}
                      </div>
                      <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[#0070BA]">
                        {log.event_type}
                      </div>
                      <div className="mt-1 max-w-[340px] text-[10px] leading-4 text-[#64748B]">
                        {log.summary}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-[9px] text-[#001C64]">
                      {endpointFor(log)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[9px] text-[#475569]">
                      {latencyFor(log)} ms
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] ${status.tone}`}
                      >
                        {status.code} / {log.status.replace(/_/g, " ")}
                      </span>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.06em] text-[#94A3B8]">
                        {log.mode}
                      </div>
                      {log.impact !== "-" && (
                        <div
                          className={`mt-1 font-mono text-[8px] font-semibold ${
                            positive ? "text-[#166534]" : "text-[#92400E]"
                          }`}
                        >
                          {log.impact}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
