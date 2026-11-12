import type { Summary } from "../types";
import { formatCurrency, formatPercent } from "../lib/format";

interface KpiRibbonProps {
  summary: Summary;
}

export function KpiRibbon({ summary }: KpiRibbonProps) {
  const metrics = [
    {
      index: "01",
      label: "Total invoiced",
      value: formatCurrency(summary.total_issued),
      detail: `${summary.open_invoices} invoices still open`,
      tone: "text-[#001C64]",
    },
    {
      index: "02",
      label: "Cash collected",
      value: formatCurrency(summary.total_paid),
      detail: `${formatPercent(summary.collection_rate)} of book settled`,
      tone: "text-[#166534]",
    },
    {
      index: "03",
      label: "Overdue balance",
      value: formatCurrency(summary.overdue_total),
      detail: "Eligible for collection follow-up",
      tone: "text-[#92400E]",
    },
    {
      index: "04",
      label: "Collection rate",
      value: formatPercent(summary.collection_rate),
      detail: "Portfolio health across all invoices",
      tone: "text-[#0070BA]",
    },
    {
      index: "05",
      label: "Disputes defended",
      value: formatCurrency(summary.disputes_defended_usd),
      detail: `${summary.disputes_defended_count} cases with evidence submitted`,
      tone: "text-[#166534]",
    },
    {
      index: "06",
      label: "Refunds issued",
      value: formatCurrency(summary.refunds_issued_usd),
      detail: "Refunds issued for low-value claims",
      tone: "text-[#991B1B]",
    },
  ];

  return (
    <section
      data-film-panel="KpiRibbon"
      data-tour-id="kpi-ribbon"
      className="grid grid-cols-2 gap-px border border-[#E2E0D8] bg-[#E2E0D8] md:grid-cols-3 xl:grid-cols-6"
      aria-label="Financial ledger ribbon"
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0 bg-[#FCFBF9] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[8px] font-medium tracking-[0.14em] text-[#94A3B8]">
              {metric.index}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#64748B]">
              {metric.label}
            </span>
          </div>
          <p
            className={`mt-2 truncate font-mono text-[20px] font-semibold leading-none tracking-tight ${metric.tone}`}
          >
            {metric.value}
          </p>
          <p className="mt-2 truncate text-[10px] leading-4 text-[#64748B]">
            {metric.detail}
          </p>
        </div>
      ))}
    </section>
  );
}
