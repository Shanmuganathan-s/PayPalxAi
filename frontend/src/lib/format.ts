const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return currency.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCompactCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return compact.format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value: number | string | null | undefined): string {
  const rate = Number(value ?? 0);
  return `${Number.isFinite(rate) ? rate.toFixed(1) : "0.0"}%`;
}

export function outstanding(invoice: {
  issued_amount: number;
  paid_amount: number;
}): number {
  return Math.max(Number(invoice.issued_amount ?? 0) - Number(invoice.paid_amount ?? 0), 0);
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function timeLabel(iso: string | undefined): string {
  if (!iso) return "just now";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
