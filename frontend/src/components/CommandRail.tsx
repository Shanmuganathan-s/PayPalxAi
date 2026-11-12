import type { LlmStatus, PayPalStatus, Summary } from "../types";

interface CommandRailProps {
  paypal: PayPalStatus | null;
  llm: LlmStatus | null;
  summary: Summary;
  busy: boolean;
  onRun: (prompt: string) => Promise<unknown>;
}

const playbooks = [
  {
    index: "01",
    title: "Invoice + QR checkout",
    detail: "Create a PayPal invoice and matching order",
    prompt:
      "Invoice Acme Robotics $1,450 for an edge AI deployment and send a PayPal QR checkout order.",
  },
  {
    index: "02",
    title: "Subscription plan",
    detail: "Publish a recurring Sandbox plan",
    prompt:
      "Create a $299 monthly telemetry retainer subscription plan for Orbital Labs.",
  },
  {
    index: "03",
    title: "Collections sweep",
    detail: "50% Pay Later split on top overdue",
    prompt:
      "Nudge the top overdue invoice with a 50% PayPal Pay Later milestone split.",
  },
  {
    index: "04",
    title: "Dispute defense",
    detail: "Attach tracking evidence automatically",
    prompt:
      "Build dispute evidence for a $480 item-not-received chargeback and attach shipment tracking.",
  },
];

export function CommandRail({
  paypal,
  llm,
  summary,
  busy,
  onRun,
}: CommandRailProps) {
  const modelOnline = Boolean(llm?.configured && llm.reachable);

  return (
    <div data-film-panel="CommandRail" className="space-y-3">
      <section className="border border-[#E2E0D8] bg-[#FCFBF9]">
        <div className="border-b border-[#E2E0D8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              02
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Quick actions
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            Run a prefilled PayPal action through the agent execution rail.
          </p>
        </div>

        <div>
          {playbooks.map((playbook) => (
            <button
              key={playbook.title}
              type="button"
              onClick={() => void onRun(playbook.prompt)}
              disabled={busy}
              className="group flex w-full items-start gap-3 border-b border-[#E2E0D8] px-4 py-3 text-left last:border-b-0 hover:bg-[#F6F5F2] disabled:opacity-40"
            >
              <span className="mt-0.5 font-mono text-[9px] text-[#94A3B8] group-hover:text-[#0070BA]">
                {playbook.index}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-[#0F172A]">
                  {playbook.title}
                </span>
                <span className="block text-[10px] leading-4 text-[#64748B]">
                  {playbook.detail}
                </span>
              </span>
              <span className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#0070BA]">
                Run
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="border border-[#E2E0D8] bg-[#FCFBF9]">
        <div className="border-b border-[#E2E0D8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              03
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Service posture
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            PayPal, webhook, and model state.
          </p>
        </div>

        <dl>
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E0D8] px-4 py-2.5">
            <dt className="text-[10px] text-[#64748B]">PayPal credentials</dt>
            <dd
              className={`border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${
                paypal?.configured
                  ? "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]"
                  : "border-[#92400E]/30 bg-[#FBF6EE] text-[#92400E]"
              }`}
            >
              {paypal?.configured ? "Configured" : "Not configured"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E0D8] px-4 py-2.5">
            <dt className="text-[10px] text-[#64748B]">OAuth token</dt>
            <dd className="font-mono text-[9px] font-medium text-[#0F172A]">
              {paypal?.token_ok
                ? "Valid"
                : paypal?.configured
                  ? "Pending"
                  : "Simulated"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E0D8] px-4 py-2.5">
            <dt className="text-[10px] text-[#64748B]">Webhook verify</dt>
            <dd className="font-mono text-[9px] font-medium text-[#0F172A]">
              {paypal?.webhook_configured ? "Signature enforced" : "Simulator mode"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E0D8] px-4 py-2.5">
            <dt className="text-[10px] text-[#64748B]">Model tool calling</dt>
            <dd
              title={llm?.last_error ?? llm?.model_note ?? undefined}
              className={`max-w-[170px] truncate text-right font-mono text-[9px] font-medium ${
                modelOnline ? "text-[#166534]" : "text-[#92400E]"
              }`}
            >
              {modelOnline
                ? `${llm?.provider ?? "llm"} / ${llm?.model ?? "ready"}`
                : llm?.configured
                  ? "Offline / fallback"
                  : "Deterministic fallback"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <dt className="text-[10px] text-[#64748B]">Active subscriptions</dt>
            <dd className="font-mono text-[9px] font-medium text-[#0F172A]">
              {summary.active_subscriptions} plans billing
            </dd>
          </div>
        </dl>

        {!paypal?.configured && (
          <p className="border-t border-[#E2E0D8] bg-[#FBF6EE] px-4 py-3 text-[10px] leading-4 text-[#92400E]">
            Add the full Sandbox Client ID and secret to{" "}
            <code className="border border-[#92400E]/20 bg-[#FCFBF9] px-1">
              backend/.env
            </code>{" "}
            to switch every flow from SIMULATED to LIVE without code changes.
          </p>
        )}
      </section>
    </div>
  );
}
