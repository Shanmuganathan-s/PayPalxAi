export type Mode = "LIVE" | "SIMULATED";

export interface Customer {
  id: string;
  name: string;
  company: string;
  tier: string;
  loyalty_score: number;
  email: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  item_name: string;
  issued_amount: number;
  paid_amount: number;
  status: string;
  issued_date: string;
  nudge_status: string;
  source: string;
  payer_view_url: string | null;
  approve_url: string | null;
  qr_base64: string | null;
}

export interface Subscription {
  id: string;
  customer_id: string;
  customer_name: string;
  plan_id: string;
  plan_name: string;
  monthly_price: number;
  status: string;
  next_billing_date: string;
  source: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agent: string;
  event_type: string;
  summary: string;
  impact: string;
  status: string;
  mode: Mode;
}

export interface Summary {
  total_issued: number;
  total_paid: number;
  overdue_total: number;
  collection_rate: number;
  open_invoices: number;
  disputes_defended_usd: number;
  disputes_defended_count: number;
  refunds_issued_usd: number;
  active_subscriptions: number;
}

export interface DashboardData {
  customers: Customer[];
  invoices: Invoice[];
  subscriptions: Subscription[];
  agent_logs: AgentLog[];
  summary: Summary;
  generated_at: string;
  mode: Mode;
}

export interface AgentResult {
  agent: string;
  action: string;
  reply: string;
  data: Record<string, unknown>;
  mode: Mode;
  log: AgentLog;
  timestamp: string;
  reasoning?: "llm" | "fallback" | string;
  llm_model?: string;
  llm_provider?: string;
}

export interface PayPalStatus {
  configured: boolean;
  base_url: string;
  webhook_configured: boolean;
  token_ok: boolean;
  mode: Mode;
  last_error: string | null;
}

export interface LlmStatus {
  configured: boolean;
  provider: string;
  base_url: string;
  model: string;
  configured_model: string;
  model_available: boolean;
  reachable: boolean;
  available_models: string[];
  last_error: string | null;
  model_note: string | null;
  fallback: string;
  timeout_seconds: number;
}

export interface SimulationResult {
  scenario: string;
  handled?: AgentLog;
  result?: AgentResult;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "error";
  text: string;
  result?: AgentResult;
}

export interface QrPayload {
  invoice_id: string;
  invoice_number: string;
  customer_name?: string | null;
  amount: number;
  qr_code: string | null;
  payer_view_url: string | null;
}
