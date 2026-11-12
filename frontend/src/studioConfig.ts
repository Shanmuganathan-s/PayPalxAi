import type {
  AgDataSourcesDefinition,
  AgFieldDefinition,
  AgReportState,
} from "ag-studio";
import type { DashboardData, Invoice } from "./types";
import { outstanding } from "./lib/format";

const MONEY = { formatOptions: { format: "$#,##0.00" } };
const PERCENT = { formatOptions: { format: "#,##0.0%" } };
const INTEGER = { formatOptions: { format: "#,##0" } };

function field(
  id: string,
  name: string,
  format: string,
  extra: Partial<AgFieldDefinition> = {},
): AgFieldDefinition {
  return {
    id,
    name,
    format: format as AgFieldDefinition["format"],
    ...extra,
  };
}

export type StudioPreset = "executive" | "recovery" | "subscriptions";

export const STUDIO_PRESETS: Array<{ id: StudioPreset; label: string }> = [
  { id: "executive", label: "Executive cashflow" },
  { id: "recovery", label: "Overdue & BNPL" },
  { id: "subscriptions", label: "Subscriptions" },
];

function daysSince(dateText: string): number {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86_400_000));
}

function riskFor(invoice: Invoice, agingDays: number): string {
  const balance = outstanding(invoice);
  const status = invoice.status.toUpperCase();
  if (balance <= 0.01) return "Cleared";
  if (status === "OVERDUE" && agingDays >= 21) return "Critical";
  if (status === "OVERDUE") return "High";
  return "Watch";
}

function labelStatus(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function monthKey(dateText: string): string {
  return /^\d{4}-\d{2}/.test(dateText) ? dateText.slice(0, 7) : "";
}

function monthLabel(key: string): string {
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function buildCashflow(invoices: Invoice[]): Array<Record<string, number | string>> {
  const now = new Date();
  const months: string[] = [];
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  return months.map((month) => {
    const rows = invoices.filter((invoice) => monthKey(invoice.issued_date) === month);
    return {
      month: monthLabel(month),
      invoiced: Number(
        rows
          .reduce((total, invoice) => total + Number(invoice.issued_amount ?? 0), 0)
          .toFixed(2),
      ),
      collected: Number(
        rows
          .reduce((total, invoice) => total + Number(invoice.paid_amount ?? 0), 0)
          .toFixed(2),
      ),
      overdue: Number(
        rows
          .filter((invoice) => invoice.status.toUpperCase() === "OVERDUE")
          .reduce((total, invoice) => total + outstanding(invoice), 0)
          .toFixed(2),
      ),
    };
  });
}

export function buildStudioData(data: DashboardData): AgDataSourcesDefinition {
  const invoiceRows = data.invoices.map((invoice) => {
    const aging = daysSince(invoice.issued_date);
    const balance = outstanding(invoice);
    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      item_name: invoice.item_name,
      issued_amount: Number(invoice.issued_amount ?? 0),
      paid_amount: Number(invoice.paid_amount ?? 0),
      outstanding_amount: Number(balance.toFixed(2)),
      paid_ratio:
        Number(invoice.issued_amount) > 0
          ? Number(
              (
                Number(invoice.paid_amount ?? 0) / Number(invoice.issued_amount)
              ).toFixed(3),
            )
          : 0,
      status: labelStatus(invoice.status),
      issued_date: invoice.issued_date,
      aging_days: aging,
      risk: riskFor(invoice, aging),
      source: invoice.source,
      nudge_status: invoice.nudge_status,
    };
  });

  return {
    sources: [
      {
        id: "summary",
        name: "Portfolio summary",
        primaryKeyField: "id",
        data: [
          {
            id: "summary",
            total_issued: data.summary.total_issued,
            total_paid: data.summary.total_paid,
            overdue_total: data.summary.overdue_total,
            collection_rate: Number((data.summary.collection_rate / 100).toFixed(3)),
            open_invoices: data.summary.open_invoices,
            disputes_defended_usd: data.summary.disputes_defended_usd,
            disputes_defended_count: data.summary.disputes_defended_count,
            refunds_issued_usd: data.summary.refunds_issued_usd,
            active_subscriptions: data.summary.active_subscriptions,
          },
        ],
        fields: [
          field("id", "ID", "textFormat", { hide: true }),
          field("total_issued", "Invoiced", "currencyFormat", MONEY),
          field("total_paid", "Collected", "currencyFormat", MONEY),
          field("overdue_total", "Overdue", "currencyFormat", MONEY),
          field("collection_rate", "Collection rate", "percentageFormat", PERCENT),
          field("open_invoices", "Open invoices", "integerFormat", INTEGER),
          field("disputes_defended_usd", "Disputes defended", "currencyFormat", MONEY),
          field(
            "disputes_defended_count",
            "Disputes defended (count)",
            "integerFormat",
            INTEGER,
          ),
          field("refunds_issued_usd", "Refunds issued", "currencyFormat", MONEY),
          field(
            "active_subscriptions",
            "Active subscriptions",
            "integerFormat",
            INTEGER,
          ),
        ],
      },
      {
        id: "invoices",
        name: "Invoices",
        primaryKeyField: "id",
        data: invoiceRows,
        fields: [
          field("id", "Invoice ID", "textFormat", { hide: true }),
          field("invoice_number", "Invoice", "textFormat"),
          field("customer_id", "Customer ID", "textFormat", { hide: true }),
          field("customer_name", "Customer", "textFormat"),
          field("item_name", "Line item", "textFormat"),
          field("issued_amount", "Invoiced", "currencyFormat", MONEY),
          field("paid_amount", "Collected", "currencyFormat", MONEY),
          field("outstanding_amount", "Outstanding", "currencyFormat", MONEY),
          field("paid_ratio", "Paid %", "percentageFormat", PERCENT),
          field("status", "Status", "textFormat"),
          field("issued_date", "Issued", "textFormat"),
          field("aging_days", "Age (days)", "integerFormat", INTEGER),
          field("risk", "Risk", "textFormat"),
          field("source", "Source", "textFormat", { hide: true }),
          field("nudge_status", "Last agent action", "textFormat"),
        ],
      },
      {
        id: "customers",
        name: "Customers",
        primaryKeyField: "id",
        data: data.customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          company: customer.company,
          tier: customer.tier,
          loyalty_score: Number(customer.loyalty_score ?? 0),
          email: customer.email,
        })),
        fields: [
          field("id", "Customer ID", "textFormat", { hide: true }),
          field("name", "Customer", "textFormat"),
          field("company", "Company", "textFormat"),
          field("tier", "Tier", "textFormat"),
          field("loyalty_score", "Loyalty", "integerFormat", INTEGER),
          field("email", "Email", "textFormat"),
        ],
      },
      {
        id: "subscriptions",
        name: "Subscriptions",
        primaryKeyField: "id",
        data: data.subscriptions.map((subscription) => ({
          id: subscription.id,
          customer_id: subscription.customer_id,
          customer_name: subscription.customer_name,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          monthly_price: Number(subscription.monthly_price ?? 0),
          status: labelStatus(subscription.status),
          next_billing_date: subscription.next_billing_date,
          source: subscription.source,
        })),
        fields: [
          field("id", "Subscription ID", "textFormat", { hide: true }),
          field("customer_id", "Customer ID", "textFormat", { hide: true }),
          field("customer_name", "Customer", "textFormat"),
          field("plan_id", "Plan ID", "textFormat", { hide: true }),
          field("plan_name", "Plan", "textFormat"),
          field("monthly_price", "MRR", "currencyFormat", MONEY),
          field("status", "Status", "textFormat"),
          field("next_billing_date", "Next billing", "textFormat"),
          field("source", "Source", "textFormat", { hide: true }),
        ],
      },
      {
        id: "cashflow",
        name: "Cashflow",
        primaryKeyField: "month",
        data: buildCashflow(data.invoices),
        fields: [
          field("month", "Month", "textFormat"),
          field("invoiced", "Invoiced", "currencyFormat", MONEY),
          field("collected", "Collected", "currencyFormat", MONEY),
          field("overdue", "Overdue", "currencyFormat", MONEY),
        ],
      },
    ],
    relationships: [
      {
        id: "invoices-to-customers",
        type: "many-to-one",
        source: "invoices.customer_id",
        target: "customers.id",
      },
      {
        id: "subscriptions-to-customers",
        type: "many-to-one",
        source: "subscriptions.customer_id",
        target: "customers.id",
      },
    ],
    expressions: [
      {
        id: "invoices.collection_rate",
        name: "Collection rate (calculated)",
        isMeasure: false,
        format: "percentageFormat",
        formatOptions: PERCENT.formatOptions,
        expression: {
          operator: "divide",
          inputs: [
            { id: "invoices.paid_amount" },
            { id: "invoices.issued_amount" },
          ],
        },
      },
      {
        id: "invoices.outstanding_balance",
        name: "Outstanding balance (calculated)",
        isMeasure: false,
        format: "currencyFormat",
        formatOptions: MONEY.formatOptions,
        expression: {
          operator: "subtract",
          inputs: [
            { id: "invoices.issued_amount" },
            { id: "invoices.paid_amount" },
          ],
        },
      },
      {
        id: "summary.outstanding_balance",
        name: "Portfolio outstanding balance (calculated)",
        isMeasure: true,
        format: "currencyFormat",
        formatOptions: MONEY.formatOptions,
        expression: {
          operator: "subtract",
          inputs: [
            { id: "summary.total_issued", aggregation: "sum" },
            { id: "summary.total_paid", aggregation: "sum" },
          ],
        },
      },
    ],
    description:
      "PayPulse receivables portfolio: invoices, customers, subscriptions and monthly cashflow.",
  } as AgDataSourcesDefinition;
}

const TITLE = {
  text: "",
  typography: { fontSize: 12, fontWeight: "bold" as const },
  color: "#475569",
};

function titleFormat(text: string) {
  return { title: { ...TITLE, text } };
}

function valueWidget(
  title: string,
  fieldId: string,
  color: string,
): Record<string, unknown> {
  return {
    type: "value",
    format: {
      ...titleFormat(title),
      style: {
        color,
        typography: { fontSize: 30, fontWeight: "bold" as const },
        label: { enabled: false },
        textScaling: { enabled: true },
        verticalAlign: "center",
      },
    },
    dataMapping: {
      value: [{ id: fieldId, aggregation: "sum" }],
    },
  };
}

function barWidget(
  title: string,
  category: string,
  values: Array<{ id: string; aggregation?: string }>,
  type: "bar-chart-grouped" | "column-chart-grouped" = "bar-chart-grouped",
): Record<string, unknown> {
  return {
    type,
    format: titleFormat(title),
    dataMapping: {
      categoryKey: [{ id: category }],
      valueKey: values,
    },
  };
}

function gridWidget(
  title: string,
  columns: Array<{ id: string }>,
): Record<string, unknown> {
  return {
    type: "grid",
    format: titleFormat(title),
    dataMapping: { cols: columns },
  };
}

function filterForPreset(preset: StudioPreset) {
  if (preset === "recovery") {
    return {
      page: [
        {
          field: { id: "invoices.status" },
          model: {
            operator: "isIn",
            value: ["Overdue", "Partially Paid"],
          },
        },
      ],
    };
  }
  if (preset === "subscriptions") {
    return {
      page: [
        {
          field: { id: "subscriptions.status" },
          model: {
            operator: "isIn",
            value: ["Active"],
          },
        },
      ],
    };
  }
  return undefined;
}

export function buildStudioState(preset: StudioPreset = "executive"): AgReportState {
  const filter = filterForPreset(preset);
  const widgets: Record<string, Record<string, unknown>> = {
    "kpi-issued": valueWidget(
      "TOTAL INVOICED",
      "summary.total_issued",
      "#001C64",
    ),
    "kpi-collected": valueWidget(
      "CASH COLLECTED",
      "summary.total_paid",
      "#166534",
    ),
    "kpi-overdue": valueWidget(
      "OVERDUE BALANCE",
      "summary.overdue_total",
      "#991B1B",
    ),
    "kpi-rate": valueWidget(
      "COLLECTION RATE",
      "summary.collection_rate",
      "#0070BA",
    ),
    "kpi-disputes": valueWidget(
      "DISPUTES DEFENDED",
      "summary.disputes_defended_usd",
      "#166534",
    ),
    "kpi-refunds": valueWidget(
      "REFUNDS ISSUED",
      "summary.refunds_issued_usd",
      "#92400E",
    ),
    "chart-outstanding": barWidget(
      "Outstanding balance by customer",
      "invoices.customer_name",
      [{ id: "invoices.outstanding_balance", aggregation: "sum" }],
    ),
    "chart-status": {
      type: "donut-chart",
      format: titleFormat("Invoice status mix"),
      dataMapping: {
        categoryKey: [{ id: "invoices.status" }],
        valueKey: [{ id: "invoices.id", aggregation: "count" }],
      },
    },
    "chart-mrr": barWidget(
      "Monthly recurring revenue by plan",
      "subscriptions.plan_name",
      [{ id: "subscriptions.monthly_price", aggregation: "sum" }],
    ),
    "grid-invoices": gridWidget("Invoice ledger", [
      { id: "invoices.invoice_number" },
      { id: "invoices.customer_name" },
      { id: "invoices.status" },
      { id: "invoices.issued_amount" },
      { id: "invoices.paid_amount" },
      { id: "invoices.collection_rate" },
      { id: "invoices.outstanding_balance" },
      { id: "invoices.aging_days" },
      { id: "invoices.nudge_status" },
    ]),
    "grid-subs": gridWidget("Subscription book", [
      { id: "subscriptions.plan_name" },
      { id: "subscriptions.customer_name" },
      { id: "subscriptions.monthly_price" },
      { id: "subscriptions.status" },
      { id: "subscriptions.next_billing_date" },
    ]),
    "chart-cashflow": barWidget(
      "Invoiced vs collected, trailing six months",
      "cashflow.month",
      [
        { id: "cashflow.invoiced", aggregation: "sum" },
        { id: "cashflow.collected", aggregation: "sum" },
      ],
      "column-chart-grouped",
    ),
  };

  const widgetLayout = {
    "kpi-issued": { xTrack: 0, yTrack: 0, xSpan: 4, ySpan: 8 },
    "kpi-collected": { xTrack: 4, yTrack: 0, xSpan: 4, ySpan: 8 },
    "kpi-overdue": { xTrack: 8, yTrack: 0, xSpan: 4, ySpan: 8 },
    "kpi-rate": { xTrack: 12, yTrack: 0, xSpan: 4, ySpan: 8 },
    "kpi-disputes": { xTrack: 16, yTrack: 0, xSpan: 4, ySpan: 8 },
    "kpi-refunds": { xTrack: 20, yTrack: 0, xSpan: 4, ySpan: 8 },
    "chart-outstanding": { xTrack: 0, yTrack: 8, xSpan: 8, ySpan: 20 },
    "chart-status": { xTrack: 8, yTrack: 8, xSpan: 8, ySpan: 20 },
    "chart-mrr": { xTrack: 16, yTrack: 8, xSpan: 8, ySpan: 20 },
    "grid-invoices": { xTrack: 0, yTrack: 28, xSpan: 16, ySpan: 22 },
    "grid-subs": { xTrack: 16, yTrack: 28, xSpan: 8, ySpan: 22 },
    "chart-cashflow": { xTrack: 0, yTrack: 50, xSpan: 24, ySpan: 18 },
  };

  return {
    selectedPageId: "receivables-command-center",
    pages: [
      {
        id: "receivables-command-center",
        widgets,
        widgetLayout,
        ...(filter ? { filter } : {}),
        layout: {
          type: "widget",
          columns: 24,
          rowHeight: 16,
          height: 1120,
          minWidth: 0,
          backgroundColor: "#F6F5F2",
          pagePadding: 12,
          widgetPadding: 10,
          widgetBackgroundColor: "#FCFBF9",
          widgetBorderEnabled: true,
          widgetBorderRadius: 3,
          widgetBorderColor: "#E2E0D8",
          widgetBorderWidth: 1,
        },
      },
    ],
    version: "3.1.0",
  } as unknown as AgReportState;
}

