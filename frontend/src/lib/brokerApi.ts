/**
 * Broker Connect API client (Module 10)
 * All operations are READ-ONLY from the broker's perspective.
 * Stockox never places trades.
 */

const BASE = "/api/v1";

export interface BrokerInfo {
  slug: string;
  name: string;
  phase: number;
  country: string;
  auth_type: "oauth" | "api_token";
  logo_url: string;
  description: string;
}

export interface BrokerAccount {
  id: string;
  broker_slug: string;
  broker_name: string;
  account_type: string;
  account_label?: string;
  auth_type: string;
  client_id?: string;
  status: "connected" | "syncing" | "disconnected" | "error";
  token_expiry?: string;
  last_sync_at?: string;
  created_at: string;
}

export interface Holding {
  ticker: string;
  company_name: string;
  quantity: number;
  average_price: number;
  current_price: number;
  current_value: number;
  pnl: number;
  pnl_percent: number;
  sector: string;
  exchange: string;
  asset_type: string;
  currency: string;
}

export interface BrokerTransaction {
  id: string;
  broker_tx_id?: string;
  ticker: string;
  company_name: string;
  tx_type: string;
  quantity: number;
  price: number;
  total_value: number;
  currency: string;
  exchange: string;
  tx_at: string;
}

export interface TransactionPage {
  total: number;
  items: BrokerTransaction[];
}

export interface SyncStatus {
  account_id: string;
  sync_id?: string;
  status: string;
  sync_status?: string;
  holdings_fetched: number;
  new_positions: number;
  closed_positions?: number;
  last_sync_at?: string;
}

export interface AccountHealth {
  account_id: string;
  broker_name: string;
  total_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  monthly_pnl: number;
  annual_pnl: number;
  open_positions: number;
  last_sync_at?: string;
}

export interface BrokerInsight {
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
}

export interface SecurityInfo {
  account_id: string;
  broker_name: string;
  auth_type: string;
  token_expiry?: string;
  last_sync_at?: string;
  permissions: { permission: string; granted: boolean; granted_at?: string }[];
  sync_history: {
    id: string;
    status: string;
    trigger_type: string;
    started_at: string;
    completed_at?: string;
  }[];
}

export interface ConnectBrokerPayload {
  broker_slug: string;
  account_type?: string;
  account_label?: string;
  auth_type: string;
  token?: string;
  api_key?: string;
  api_secret?: string;
  auth_code?: string;
  client_id?: string;
}

async function authFetch(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const brokerApi = {
  /** GET /api/v1/brokers — catalog of all supported brokers */
  listBrokers: (token: string): Promise<{ phase1: BrokerInfo[]; phase2: BrokerInfo[] }> =>
    authFetch(`${BASE}/brokers`, token),

  /** GET /api/v1/brokers/accounts */
  getAccounts: (token: string): Promise<{ accounts: BrokerAccount[]; count: number }> =>
    authFetch(`${BASE}/brokers/accounts`, token),

  /** POST /api/v1/brokers/connect */
  connectBroker: (token: string, payload: ConnectBrokerPayload): Promise<{ account: BrokerAccount; message: string }> =>
    authFetch(`${BASE}/brokers/connect`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** POST /api/v1/brokers/accounts/:id/disconnect */
  disconnectBroker: (token: string, accountId: string): Promise<{ message: string }> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/disconnect`, token, { method: "POST" }),

  /** POST /api/v1/brokers/accounts/:id/sync */
  syncBroker: (token: string, accountId: string): Promise<SyncStatus> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/sync`, token, { method: "POST" }),

  /** GET /api/v1/brokers/accounts/:id/status */
  getStatus: (token: string, accountId: string): Promise<SyncStatus> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/status`, token),

  /** GET /api/v1/brokers/accounts/:id/holdings */
  getHoldings: (token: string, accountId: string): Promise<{ holdings: Holding[]; count: number }> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/holdings`, token),

  /** GET /api/v1/brokers/accounts/:id/transactions */
  getTransactions: (token: string, accountId: string, limit = 50, offset = 0): Promise<TransactionPage> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/transactions?limit=${limit}&offset=${offset}`, token),

  /** GET /api/v1/brokers/accounts/:id/health */
  getHealth: (token: string, accountId: string): Promise<AccountHealth> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/health`, token),

  /** GET /api/v1/brokers/accounts/:id/insights */
  getInsights: (token: string, accountId: string): Promise<{ insights: BrokerInsight[]; count: number }> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/insights`, token),

  /** GET /api/v1/brokers/accounts/:id/security */
  getSecurityInfo: (token: string, accountId: string): Promise<SecurityInfo> =>
    authFetch(`${BASE}/brokers/accounts/${accountId}/security`, token),

  /** POST /api/v1/brokers/import */
  importPortfolio: (token: string, accountId: string, holdings: Holding[]): Promise<{ message: string }> =>
    authFetch(`${BASE}/brokers/import`, token, {
      method: "POST",
      body: JSON.stringify({ account_id: accountId, holdings: JSON.stringify(holdings) }),
    }),
};
