import type { Summary } from "../types";
import { formatCurrency } from "../lib/format";

interface PolicyPanelProps {
  summary: Summary;
}

const rules = [
  {
    index: "01",
    title: "Auto-evidence disputes",
    detail: "Attach tracking and proof of fulfillment on CUSTOMER.DISPUTE.CREATED",
  },
  {
    index: "02",
    title: "Instant refund under $25",
    detail: "Close low-value claims before a $15 chargeback fee lands",
  },
  {
    index: "03",
    title: "Human review above $25",
    detail: "Flag high-value claims with evidence staged for one-click approval",
  },
  {
    index: "04",
    title: "50% Pay Later collection split",
    detail: "Recover overdue balances without stalling the customer relationship",
  },
];

export function PolicyPanel({ summary }: PolicyPanelProps) {
  return (
    <div data-film-panel="PolicyPanel" className="space-y-3">
      <section className="border border-[#E2E0D8] bg-[#FCFBF9]">
        <div className="border-b border-[#E2E0D8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              07
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Dispute defense
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            {summary.disputes_defended_count} cases /{" "}
            {formatCurrency(summary.disputes_defended_usd)} defended
          </p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-end justify-between gap-3 border-b border-[#E2E0D8] pb-3">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#64748B]">
                Cases defended
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#166534]">
                {summary.disputes_defended_count}
              </p>
            </div>
            <span className="border border-[#166534]/30 bg-[#F0F7F1] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#166534]">
              Evidence filed
            </span>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-[#64748B]">
            Evidence packets are generated from the invoice, transaction and tracking
            records, then submitted through the PayPal Disputes API before the seller
            response window closes.
          </p>
        </div>
      </section>

      <section className="border border-[#E2E0D8] bg-[#FCFBF9]">
        <div className="border-b border-[#E2E0D8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              08
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Policy guardrails
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            Refunds over $25 require manual review.
          </p>
        </div>

        <div>
          {rules.map((rule) => (
            <div
              key={rule.title}
              className="flex items-start gap-3 border-b border-[#E2E0D8] px-4 py-3 last:border-b-0"
            >
              <span className="mt-0.5 font-mono text-[9px] text-[#94A3B8]">
                {rule.index}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-[#0F172A]">
                  {rule.title}
                </p>
                <p className="text-[10px] leading-4 text-[#64748B]">{rule.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
