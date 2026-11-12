import { SkeletonRows } from "./SkeletonLoader";

interface SimulatorBarProps {
  busyScenario: string | null;
  onSimulate: (scenario: string) => Promise<void>;
  onReset: () => Promise<void>;
  resetting: boolean;
}

const scenarios = [
  {
    id: "DISPUTE",
    index: "01",
    title: "Chargeback filed",
    detail: "$480 item-not-received / auto-attach tracking evidence",
  },
  {
    id: "REFUND",
    index: "02",
    title: "Low-value refund",
    detail: "$18.50 claim under the $25 refund threshold",
  },
  {
    id: "DENIED",
    index: "03",
    title: "Capture denied",
    detail: "$74 claim above threshold / escalate with evidence",
  },
  {
    id: "PAID",
    index: "04",
    title: "Invoice paid",
    detail: "Reconcile the next open invoice automatically",
  },
  {
    id: "NUDGE",
    index: "05",
    title: "Collections sweep",
    detail: "Send a 50% Pay Later split for the top overdue invoice",
  },
];

export function SimulatorBar({
  busyScenario,
  onSimulate,
  onReset,
  resetting,
}: SimulatorBarProps) {
  return (
    <section
      data-film-panel="SimulatorBar"
      data-tour-id="webhook-simulator-bar"
      className="border border-[#E2E0D8] bg-[#FCFBF9]"
      aria-busy={Boolean(busyScenario)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E0D8] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              06
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Webhook simulator
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            Send sample PayPal webhook events through the same handler used for real
            callbacks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onReset()}
          disabled={resetting || Boolean(busyScenario)}
          className="border border-[#D3D0C5] bg-[#F6F5F2] px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#475569] hover:border-[#0070BA] hover:text-[#001C64] disabled:opacity-40"
        >
          {resetting ? "Resetting" : "Reset demo"}
        </button>
      </div>

      {busyScenario ? (
        <div className="p-3">
          <SkeletonRows rows={5} label="Sending webhook event" />
        </div>
      ) : (
        <div>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              data-film-scenario={scenario.id}
              onClick={() => void onSimulate(scenario.id)}
              disabled={resetting}
              className="group flex w-full items-start gap-3 border-b border-[#E2E0D8] px-4 py-3 text-left last:border-b-0 hover:bg-[#F6F5F2] disabled:opacity-40"
            >
              <span className="mt-0.5 font-mono text-[9px] text-[#94A3B8] group-hover:text-[#0070BA]">
                {scenario.index}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-[#0F172A]">
                  {scenario.title}
                </span>
                <span className="block text-[10px] leading-4 text-[#64748B]">
                  {scenario.detail}
                </span>
              </span>
              <span className="mt-0.5 border border-[#D3D0C5] bg-[#FCFBF9] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                {scenario.id}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
