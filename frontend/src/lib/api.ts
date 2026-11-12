import type {
  AgentResult,
  DashboardData,
  LlmStatus,
  PayPalStatus,
  QrPayload,
  SimulationResult,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const API_KEY = (import.meta.env.VITE_PAYPULSE_API_KEY ?? "").trim();

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (body) detail = JSON.stringify(body.detail ?? body);
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  dashboard(): Promise<DashboardData> {
    return request<DashboardData>("/api/dashboard-data");
  },
  paypalStatus(): Promise<PayPalStatus> {
    return request<PayPalStatus>("/api/paypal/status");
  },
  llmStatus(): Promise<LlmStatus> {
    return request<LlmStatus>("/api/llm/status");
  },
  chat(prompt: string): Promise<AgentResult> {
    return request<AgentResult>("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  },
  simulate(scenario: string): Promise<SimulationResult> {
    return request<SimulationResult>("/api/demo/simulate-webhook", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    });
  },
  reset(): Promise<{ status: string; invoices: number }> {
    return request<{ status: string; invoices: number }>("/api/demo/reset", {
      method: "POST",
    });
  },
  invoiceQr(invoiceId: string): Promise<QrPayload> {
    return request<QrPayload>(`/api/invoices/${encodeURIComponent(invoiceId)}/qr`);
  },
};

export { ApiError };
