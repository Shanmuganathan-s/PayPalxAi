import type { Invoice } from "../types";
import { formatCurrency, outstanding } from "../lib/format";

interface InvoiceTableProps {
  invoices: Invoice[];
  onShowQr: (invoice: Invoice) => void;
  onNudge: (invoice: Invoice) => void;
  busyInvoiceId?: string | null;
  busy?: boolean;
}

const statusStyles: Record<string, string> = {
  PAID: "border-[#166534]/30 bg-[#F0F7F1] text-[#166534]",
  OVERDUE: "border-[#991B1B]/30 bg-[#FBF1F1] text-[#991B1B]",
  PARTIALLY_PAID: "border-[#92400E]/30 bg-[#FBF6EE] text-[#92400E]",
  SENT: "border-[#0070BA]/30 bg-[#F1F7FB] text-[#001C64]",
  REFUNDED: "border-[#991B1B]/30 bg-[#FBF1F1] text-[#991B1B]",
};

export function InvoiceTable({
  invoices,
  onShowQr,
  onNudge,
  busyInvoiceId,
  busy,
}: InvoiceTableProps) {
  const totalOutstanding = invoices.reduce(
    (total, invoice) => total + outstanding(invoice),
    0,
  );

  return (
    <section
      data-film-panel="InvoiceTable"
      className="min-w-0 overflow-hidden border border-[#E2E0D8] bg-[#FCFBF9]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E0D8] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0070BA]">
              05
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              Invoice ledger
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            {invoices.length} invoices / {formatCurrency(totalOutstanding)} outstanding
          </p>
        </div>
        <span className="border border-[#E2E0D8] bg-[#F6F5F2] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#475569]">
          PayPal Invoicing v2
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[#D3D0C5] bg-[#F0EEE8] font-mono text-[8px] uppercase tracking-[0.12em] text-[#64748B]">
              <th className="px-4 py-2.5 font-semibold">Invoice</th>
              <th className="px-3 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              <th className="px-3 py-2.5 text-right font-semibold">Collected</th>
              <th className="px-3 py-2.5 text-right font-semibold">Open</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const balance = outstanding(invoice);
              const paidRatio =
                Number(invoice.issued_amount) > 0
                  ? Math.min(
                      100,
                      (Number(invoice.paid_amount) /
                        Number(invoice.issued_amount)) *
                        100,
                    )
                  : 0;
              const isBusy = busyInvoiceId === invoice.id;
              return (
                <tr
                  key={invoice.id}
                  data-film-invoice={invoice.invoice_number}
                  data-tour-id={
                    invoice.invoice_number === "PP-2026-005" ||
                    invoice.invoice_number === "PP-2026-002"
                      ? "invoice-row-overdue"
                      : invoice.item_name.toLowerCase().includes("split")
                        ? "split-invoice-row"
                        : undefined
                  }
                  className="border-b border-[#E2E0D8] last:border-b-0 hover:bg-[#F6F5F2]"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-[#0F172A]">
                      {invoice.invoice_number}
                    </div>
                    <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-[#64748B]">
                      {invoice.item_name}
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-[#94A3B8]">
                      Issued {invoice.issued_date}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[170px] truncate font-medium text-[#0F172A]">
                      {invoice.customer_name.replace(/\s*\(.*?\)\s*/g, "")}
                    </div>
                    <div className="text-[9px] text-[#94A3B8]">
                      {invoice.customer_name.match(/\((.*?)\)/)?.[1] ?? "Direct"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${
                        statusStyles[invoice.status.toUpperCase()] ??
                        "border-[#D3D0C5] bg-[#F6F5F2] text-[#475569]"
                      }`}
                    >
                      {invoice.status.replace(/_/g, " ")}
                    </span>
                    <div className="mt-2 h-1 w-20 bg-[#E2E0D8]">
                      <div
                        className="h-full bg-[#166534]"
                        style={{ width: `${paidRatio}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[#0F172A]">
                    {formatCurrency(invoice.issued_amount)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[#166534]">
                    {formatCurrency(invoice.paid_amount)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    <span
                      className={
                        balance > 0
                          ? "font-semibold text-[#92400E]"
                          : "text-[#94A3B8]"
                      }
                    >
                      {formatCurrency(balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        data-film-qr={invoice.invoice_number}
                        onClick={() => onShowQr(invoice)}
                        title="Show PayPal QR"
                        aria-label={`Show PayPal QR for ${invoice.invoice_number}`}
                        className="border border-[#D3D0C5] bg-[#F6F5F2] px-2 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] text-[#475569] hover:border-[#0070BA] hover:text-[#001C64]"
                      >
                        QR
                      </button>
                      {balance > 0 && (
                        <button
                          type="button"
                          data-film-nudge={invoice.invoice_number}
                          onClick={() => onNudge(invoice)}
                          disabled={Boolean(busyInvoiceId) || Boolean(busy)}
                          title="Send collection nudge"
                          className="border border-[#92400E]/30 bg-[#FBF6EE] px-2 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] text-[#92400E] hover:border-[#92400E] disabled:opacity-40"
                        >
                          {isBusy ? "Sending" : "Nudge"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
