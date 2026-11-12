import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { QrPayload } from "../types";
import { formatCurrency } from "../lib/format";

export interface QrTarget {
  invoiceId: string;
  invoiceNumber: string;
  customerName?: string | null;
  amount: number;
  qrCode?: string | null;
  payerUrl?: string | null;
}

interface QrModalProps {
  target: QrTarget | null;
  onClose: () => void;
}

function imageSource(code: string | null | undefined): string | null {
  if (!code) return null;
  return code.startsWith("data:") ? code : `data:image/png;base64,${code}`;
}

export function QrModal({ target, onClose }: QrModalProps) {
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!target) return;
    setCopied(false);
    setError("");

    if (target.qrCode) {
      setPayload({
        invoice_id: target.invoiceId,
        invoice_number: target.invoiceNumber,
        customer_name: target.customerName,
        amount: target.amount,
        qr_code: target.qrCode,
        payer_view_url: target.payerUrl ?? null,
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setPayload(null);
    setLoading(true);
    api
      .invoiceQr(target.invoiceId)
      .then((result) => {
        if (!cancelled) setPayload(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  if (!target) return null;

  const source = imageSource(payload?.qr_code);
  const payerUrl = payload?.payer_view_url ?? target.payerUrl ?? null;

  async function copyLink() {
    if (!payerUrl) return;
    try {
      await navigator.clipboard.writeText(payerUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      data-qr-backdrop="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="PayPal checkout QR"
        data-film-panel="QrModal"
        data-tour-id="qr-modal-box"
        className="w-full max-w-md overflow-hidden border border-[#D3D0C5] bg-[#FCFBF9]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E0D8] px-4 py-3">
          <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
              PayPal checkout QR
            </p>
            <h3 className="mt-1 font-mono text-sm font-semibold text-[#0F172A]">
              {payload?.invoice_number ?? target.invoiceNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#D3D0C5] bg-[#F6F5F2] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-[#475569] hover:border-[#0070BA] hover:text-[#001C64]"
            aria-label="Close QR dialog"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="border border-[#E2E0D8] bg-[#F6F5F2] p-4 text-center">
            <div className="mx-auto flex h-56 w-56 items-center justify-center border border-[#D3D0C5] bg-[#FCFBF9] p-3">
              {loading ? (
                <div
                  className="w-full space-y-2"
                  role="status"
                  aria-label="Generating QR code"
                  aria-busy="true"
                >
                  <div className="skeleton-row h-3 w-3/4" />
                  <div className="skeleton-row h-3 w-full" />
                  <div className="skeleton-row h-3 w-5/6" />
                  <div className="skeleton-row h-3 w-2/3" />
                </div>
              ) : source ? (
                <img
                  src={source}
                  alt={`PayPal payment QR for ${payload?.invoice_number ?? target.invoiceNumber}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="px-4 text-center text-[10px] leading-4 text-[#64748B]">
                  {error || "No QR code available for this invoice yet."}
                </div>
              )}
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight text-[#0F172A]">
              {formatCurrency(payload?.amount ?? target.amount)}
            </p>
            <p className="mt-1 text-[10px] text-[#64748B]">
              {payload?.customer_name ?? target.customerName ?? "PayPal Sandbox buyer"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              disabled={!payerUrl}
              className="flex-1 border border-[#D3D0C5] bg-[#F6F5F2] px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#0F172A] hover:border-[#0070BA] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "Copied" : "Copy payer link"}
            </button>
            <a
              href={payerUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 border px-3 py-2 text-center font-mono text-[9px] font-semibold tracking-[0.06em] ${
                payerUrl
                  ? "border-[#001C64] bg-[#001C64] text-[#FCFBF9] hover:bg-[#0070BA]"
                  : "pointer-events-none border-[#D3D0C5] bg-[#F0EEE8] text-[#94A3B8]"
              }`}
            >
              Open in PayPal
            </a>
          </div>

          <p className="text-center text-[9px] leading-4 text-[#64748B]">
            Sandbox artifact. Scan with the PayPal app in sandbox mode or open the payer
            link. Live mode uses the real PayPal-generated QR payload.
          </p>
        </div>
      </div>
    </div>
  );
}
