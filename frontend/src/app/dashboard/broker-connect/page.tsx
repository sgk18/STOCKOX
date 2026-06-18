"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useBrokerStore } from "@/lib/brokerStore";
import {
  brokerApi,
  type BrokerAccount,
  type BrokerInfo,
  type Holding,
  type BrokerInsight,
  type AccountHealth,
  type SecurityInfo,
  type BrokerTransaction,
  type ConnectBrokerPayload,
} from "@/lib/brokerApi";
import {
  Link2,
  RefreshCw,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Shield,
  TrendingUp,
  TrendingDown,
  Eye,
  Unlink,
  ChevronRight,
  ChevronDown,
  Activity,
  BarChart2,
  Clock,
  Lock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";

// ─── Broker Logo Component ─────────────────────────────────────────────────────
const BROKER_LOGOS: Record<string, { bg: string; text: string; initials: string }> = {
  zerodha:   { bg: "#387ED1", text: "#fff", initials: "ZR" },
  groww:     { bg: "#00D09C", text: "#fff", initials: "GW" },
  angelone:  { bg: "#E84030", text: "#fff", initials: "AO" },
  upstox:    { bg: "#6C5CE7", text: "#fff", initials: "UX" },
  robinhood: { bg: "#00C805", text: "#fff", initials: "RH" },
  ibkr:      { bg: "#C8102E", text: "#fff", initials: "IB" },
  fidelity:  { bg: "#006FAD", text: "#fff", initials: "FD" },
  schwab:    { bg: "#00A0DD", text: "#fff", initials: "SC" },
};

function BrokerLogo({ slug, size = 40 }: { slug: string; size?: number }) {
  const style = BROKER_LOGOS[slug] || { bg: "#2563EB", text: "#fff", initials: slug.slice(0, 2).toUpperCase() };
  return (
    <div
      style={{ width: size, height: size, background: style.bg, color: style.text, fontSize: size * 0.32 }}
      className="border-3 border-black rounded-xl flex items-center justify-center font-black uppercase shadow-[2px_2px_0px_#000000] shrink-0"
    >
      {style.initials}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    connected:    { icon: <CheckCircle className="w-3 h-3" />, label: "Connected",    cls: "bg-emerald-100 text-emerald-700 border-emerald-400" },
    syncing:      { icon: <RefreshCw className="w-3 h-3 animate-spin" />, label: "Syncing", cls: "bg-blue-100 text-blue-700 border-blue-400" },
    disconnected: { icon: <XCircle className="w-3 h-3" />, label: "Disconnected",   cls: "bg-gray-100 text-gray-600 border-gray-400" },
    error:        { icon: <AlertTriangle className="w-3 h-3" />, label: "Error",     cls: "bg-red-100 text-red-600 border-red-400" },
  };
  const cfg = configs[status] || configs.disconnected;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 font-black text-[9px] uppercase tracking-wider ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── P&L Badge ────────────────────────────────────────────────────────────────
function PnLBadge({ value, pct }: { value: number; pct: number }) {
  const isPos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-black text-xs ${isPos ? "text-emerald-600" : "text-red-600"}`}>
      {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isPos ? "+" : ""}{value.toFixed(2)}
      <span className="text-[9px] opacity-75">({isPos ? "+" : ""}{pct.toFixed(2)}%)</span>
    </span>
  );
}

// ─── Format Currency ──────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// ─── Connect Flow Modal ────────────────────────────────────────────────────────
interface ConnectFlowProps {
  onClose: () => void;
  onConnected: (account: BrokerAccount) => void;
  token: string;
}

const STEPS = ["Choose Broker", "Authenticate", "Fetching", "Snapshot", "AI Audit"];

function ConnectFlowModal({ onClose, onConnected, token }: ConnectFlowProps) {
  const [step, setStep] = useState(0);
  const [brokers, setBrokers] = useState<{ phase1: BrokerInfo[]; phase2: BrokerInfo[] }>({ phase1: [], phase2: [] });
  const [selectedBroker, setSelectedBroker] = useState<BrokerInfo | null>(null);
  const [authType, setAuthType] = useState<"api_token" | "oauth">("api_token");
  const [accountType, setAccountType] = useState("personal");
  const [accountLabel, setAccountLabel] = useState("");
  const [token_field, setTokenField] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [newAccount, setNewAccount] = useState<BrokerAccount | null>(null);
  const [fetchProgress, setFetchProgress] = useState(0);

  useEffect(() => {
    brokerApi.listBrokers(token).then(setBrokers).catch(() => {});
  }, [token]);

  const handleSelectBroker = (b: BrokerInfo) => {
    setSelectedBroker(b);
    setAuthType(b.auth_type as "api_token" | "oauth");
    setStep(1);
  };

  const handleConnect = async () => {
    if (!selectedBroker) return;
    setConnecting(true);
    setError("");
    try {
      const payload: ConnectBrokerPayload = {
        broker_slug: selectedBroker.slug,
        account_type: accountType,
        account_label: accountLabel,
        auth_type: authType,
        token: token_field || undefined,
        api_key: apiKey || undefined,
        api_secret: apiSecret || undefined,
        client_id: clientId || undefined,
      };
      const result = await brokerApi.connectBroker(token, payload);
      setNewAccount(result.account);
      setStep(2);

      // Simulate fetch progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 300));
        setFetchProgress(i);
      }
      setStep(3);
      await new Promise(r => setTimeout(r, 800));
      setStep(4);
    } catch (e: any) {
      setError(e.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleFinish = () => {
    if (newAccount) onConnected(newAccount);
    onClose();
  };

  const ACCOUNT_TYPES = ["personal", "long_term", "trading", "retirement", "family"];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_#000000] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b-4 border-black flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Connect Broker</h2>
            <p className="text-xs text-gray-500 font-bold mt-0.5">Read-only access · No trade execution</p>
          </div>
          <button onClick={onClose} className="p-2 border-3 border-black bg-white hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b-3 border-black bg-[#F8FAFC] flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 shrink-0 ${i === step ? "text-[#2563EB]" : i < step ? "text-emerald-600" : "text-gray-400"}`}>
                <div className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center font-black text-[10px] ${
                  i === step ? "bg-[#2563EB] text-white" : i < step ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                }`}>{i < step ? "✓" : i + 1}</div>
                <span className="text-[10px] font-black uppercase hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 min-w-[16px] ${i < step ? "bg-emerald-500" : "bg-gray-200"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Step 0: Choose Broker */}
          {step === 0 && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase mb-4">Phase 1 — Indian Brokers</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {brokers.phase1.map(b => (
                  <button key={b.slug} onClick={() => handleSelectBroker(b)}
                    className="flex items-center gap-3 p-4 border-3 border-black rounded-xl bg-white hover:bg-[#F0F4FF] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 transition-all text-left cursor-pointer">
                    <BrokerLogo slug={b.slug} size={36} />
                    <div>
                      <p className="font-black text-sm text-black">{b.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{b.auth_type === "oauth" ? "OAuth" : "API Token"}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                  </button>
                ))}
              </div>
              <p className="text-xs font-black text-gray-400 uppercase mb-3">Phase 2 — Global Brokers (Coming Soon)</p>
              <div className="grid grid-cols-2 gap-3 opacity-50">
                {brokers.phase2.map(b => (
                  <div key={b.slug} className="flex items-center gap-3 p-4 border-3 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed">
                    <BrokerLogo slug={b.slug} size={36} />
                    <div>
                      <p className="font-black text-sm text-gray-600">{b.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Coming Soon</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Authenticate */}
          {step === 1 && selectedBroker && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#F0F4FF] border-3 border-[#2563EB] rounded-xl">
                <BrokerLogo slug={selectedBroker.slug} size={44} />
                <div>
                  <p className="font-black text-base">{selectedBroker.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{selectedBroker.description}</p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border-3 border-red-400 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {ACCOUNT_TYPES.map(t => (
                  <button key={t} onClick={() => setAccountType(t)}
                    className={`p-3 border-3 rounded-xl font-black text-xs uppercase transition-all cursor-pointer ${accountType === t ? "border-black bg-[#2563EB] text-white shadow-[2px_2px_0px_#000]" : "border-gray-200 bg-white hover:border-black"}`}>
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-black uppercase text-gray-600 mb-1.5 block">Account Label (Optional)</label>
                <input value={accountLabel} onChange={e => setAccountLabel(e.target.value)}
                  placeholder="e.g. My Zerodha Account"
                  className="w-full border-3 border-black rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:shadow-[2px_2px_0px_#000]" />
              </div>

              {selectedBroker.auth_type === "api_token" || authType === "api_token" ? (
                <div>
                  <label className="text-xs font-black uppercase text-gray-600 mb-1.5 block">
                    Access Token / API Key
                  </label>
                  <input value={token_field} onChange={e => setTokenField(e.target.value)}
                    type="password" placeholder="Paste your access token here"
                    className="w-full border-3 border-black rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:shadow-[2px_2px_0px_#000]" />
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">
                    Token is AES-256 encrypted before storage. Stockox has read-only access.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-black uppercase text-gray-600 mb-1.5 block">API Key</label>
                    <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Your app API key"
                      className="w-full border-3 border-black rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-gray-600 mb-1.5 block">Client ID</label>
                    <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Your broker client ID"
                      className="w-full border-3 border-black rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700">
                  Stockox only requests read permissions. We will NEVER place orders on your behalf.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 py-2.5 border-3 border-black rounded-xl font-black text-xs uppercase cursor-pointer hover:bg-gray-50">
                  Back
                </button>
                <button onClick={handleConnect} disabled={connecting || (!token_field && !apiKey)}
                  className="flex-1 py-2.5 bg-[#2563EB] border-3 border-black text-white rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {connecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                  {connecting ? "Connecting..." : "Connect Broker"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Fetching */}
          {step === 2 && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 border-4 border-black bg-[#2563EB] rounded-2xl flex items-center justify-center mx-auto shadow-[4px_4px_0px_#000]">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
              <div>
                <p className="font-black text-base uppercase">Fetching Holdings</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Connecting to {selectedBroker?.name} API...</p>
              </div>
              <div className="w-full bg-gray-100 border-2 border-black rounded-full h-3">
                <div
                  className="h-full bg-[#2563EB] rounded-full border-r-2 border-black transition-all duration-300"
                  style={{ width: `${fetchProgress}%` }}
                />
              </div>
              <p className="text-xs font-black text-gray-400">{fetchProgress}% complete</p>
            </div>
          )}

          {/* Step 3: Snapshot */}
          {step === 3 && newAccount && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-14 h-14 border-3 border-black bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0px_#000] mb-3">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <p className="font-black text-base uppercase">Portfolio Snapshot Created</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Holdings imported successfully from {newAccount.broker_name}</p>
              </div>

              <div className="p-4 border-3 border-black rounded-xl bg-[#F8FAFC] flex items-center gap-4">
                <BrokerLogo slug={newAccount.broker_slug} size={44} />
                <div className="flex-1">
                  <p className="font-black text-sm">{newAccount.broker_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{newAccount.account_type} Account</p>
                </div>
                <StatusBadge status={newAccount.status} />
              </div>

              <button onClick={() => setStep(4)}
                className="w-full py-3 bg-[#2563EB] border-3 border-black text-white rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-transform cursor-pointer flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Run AI Audit
              </button>
            </div>
          )}

          {/* Step 4: AI Audit */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-14 h-14 border-3 border-black bg-[#2563EB] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0px_#000] mb-3">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <p className="font-black text-base uppercase">AI Analysis Ready</p>
                <p className="text-xs text-gray-500 font-medium mt-1 max-w-xs mx-auto">
                  The AI Committee, Copilot, and Risk Center will analyze your real holdings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["Copilot Audit", "Risk Audit", "Sector Analysis", "Committee Review"].map(item => (
                  <div key={item} className="flex items-center gap-2 p-3 border-3 border-black rounded-xl bg-emerald-50">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-black text-[10px] uppercase">{item}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleFinish}
                className="w-full py-3 bg-black text-white border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2563EB] hover:-translate-y-0.5 transition-transform cursor-pointer">
                Open Broker Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────
interface AccountCardProps {
  account: BrokerAccount;
  isSelected: boolean;
  onSelect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  isSyncing: boolean;
}

function AccountCard({ account, isSelected, onSelect, onSync, onDisconnect, isSyncing }: AccountCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 border-3 rounded-2xl cursor-pointer transition-all group ${
        isSelected
          ? "border-black bg-[#F0F4FF] shadow-[4px_4px_0px_#000000]"
          : "border-gray-200 bg-white hover:border-black hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start gap-3">
        <BrokerLogo slug={account.broker_slug} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-black text-sm text-black truncate">{account.broker_name}</p>
            <StatusBadge status={account.status} />
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase">{account.account_type.replace("_", " ")} Account</p>
          {account.account_label && (
            <p className="text-[10px] font-medium text-gray-400 mt-0.5 truncate">{account.account_label}</p>
          )}
          <div className="flex items-center gap-1 mt-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400">Synced {timeAgo(account.last_sync_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t-2 border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); onSync(); }}
          disabled={isSyncing}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border-2 border-black rounded-lg font-black text-[10px] uppercase hover:bg-[#2563EB] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
          className="px-2.5 py-1.5 border-2 border-red-200 hover:border-red-400 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <Unlink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Holdings Table ────────────────────────────────────────────────────────────
function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) {
    return (
      <div className="p-8 text-center border-3 border-dashed border-gray-300 rounded-xl">
        <p className="font-black text-xs uppercase text-gray-400">No holdings found. Sync your broker account.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-3 border-black bg-[#F8FAFC]">
            {["Ticker", "Company", "Qty", "Avg Price", "Current", "Value", "P&L", "Sector"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-black uppercase text-gray-500 tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={h.ticker} className={`border-b-2 border-gray-100 hover:bg-[#F0F4FF] transition-colors ${i % 2 === 0 ? "" : "bg-[#FAFBFF]"}`}>
              <td className="px-3 py-2.5">
                <span className="font-black text-xs text-black border-2 border-black rounded px-1.5 py-0.5">{h.ticker}</span>
              </td>
              <td className="px-3 py-2.5 text-xs font-medium text-gray-700 truncate max-w-[140px]">{h.company_name || "—"}</td>
              <td className="px-3 py-2.5 text-xs font-black">{h.quantity.toLocaleString("en-IN")}</td>
              <td className="px-3 py-2.5 text-xs font-bold text-gray-600">₹{h.average_price.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-xs font-bold">₹{h.current_price.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-xs font-black">{fmt(h.current_value)}</td>
              <td className="px-3 py-2.5"><PnLBadge value={h.pnl} pct={h.pnl_percent} /></td>
              <td className="px-3 py-2.5 text-[10px] font-bold text-gray-500">{h.sector || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Transaction Table ─────────────────────────────────────────────────────────
function TransactionTable({ transactions }: { transactions: BrokerTransaction[] }) {
  const txColors: Record<string, string> = {
    buy:       "bg-emerald-100 text-emerald-700 border-emerald-300",
    sell:      "bg-red-100 text-red-600 border-red-300",
    dividend:  "bg-blue-100 text-blue-700 border-blue-300",
    split:     "bg-purple-100 text-purple-700 border-purple-300",
    bonus:     "bg-amber-100 text-amber-700 border-amber-300",
    transfer:  "bg-gray-100 text-gray-600 border-gray-300",
  };
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center border-3 border-dashed border-gray-300 rounded-xl">
        <p className="font-black text-xs uppercase text-gray-400">No transactions found.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-3 border-black bg-[#F8FAFC]">
            {["Type", "Ticker", "Qty", "Price", "Total", "Date"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-black uppercase text-gray-500 tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b-2 border-gray-100 hover:bg-[#F0F4FF] transition-colors">
              <td className="px-3 py-2.5">
                <span className={`inline-block border-2 rounded-lg px-1.5 py-0.5 font-black text-[9px] uppercase ${txColors[t.tx_type] || txColors.transfer}`}>
                  {t.tx_type}
                </span>
              </td>
              <td className="px-3 py-2.5 font-black text-xs">{t.ticker}</td>
              <td className="px-3 py-2.5 text-xs font-bold">{t.quantity}</td>
              <td className="px-3 py-2.5 text-xs font-bold">₹{t.price.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-xs font-black">{fmt(t.total_value)}</td>
              <td className="px-3 py-2.5 text-[10px] font-bold text-gray-500">
                {new Date(t.tx_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Insights Panel ────────────────────────────────────────────────────────────
function InsightsPanel({ insights }: { insights: BrokerInsight[] }) {
  const icons: Record<string, React.ReactNode> = {
    info:     <Info className="w-4 h-4 shrink-0" />,
    warning:  <AlertTriangle className="w-4 h-4 shrink-0" />,
    critical: <AlertCircle className="w-4 h-4 shrink-0" />,
  };
  const colors: Record<string, string> = {
    info:     "bg-blue-50 border-blue-300 text-blue-800",
    warning:  "bg-amber-50 border-amber-400 text-amber-800",
    critical: "bg-red-50 border-red-400 text-red-800",
  };

  if (insights.length === 0) {
    return (
      <div className="p-6 text-center border-3 border-dashed border-gray-200 rounded-xl">
        <Zap className="w-6 h-6 text-gray-300 mx-auto mb-2" />
        <p className="font-black text-xs uppercase text-gray-400">Sync your account to generate insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <div key={i} className={`flex items-start gap-3 p-4 border-3 rounded-xl ${colors[insight.severity] || colors.info}`}>
          {icons[insight.severity] || icons.info}
          <div>
            <p className="font-black text-xs uppercase">{insight.title}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{insight.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Account Health Card ───────────────────────────────────────────────────────
function HealthCard({ label, value, isPositive }: { label: string; value: string; isPositive?: boolean }) {
  return (
    <div className="p-4 border-3 border-black rounded-xl bg-white shadow-[2px_2px_0px_#000000]">
      <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider mb-1">{label}</p>
      <p className={`font-black text-lg ${isPositive === undefined ? "text-black" : isPositive ? "text-emerald-600" : "text-red-600"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BrokerConnectPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const store = useBrokerStore();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState("");

  // Tab for the detail view
  const [detailTab, setDetailTab] = useState<"holdings" | "transactions" | "insights" | "health" | "security">("holdings");

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<BrokerTransaction[]>([]);
  const [insights, setInsights] = useState<BrokerInsight[]>([]);
  const [health, setHealth] = useState<AccountHealth | null>(null);
  const [security, setSecurity] = useState<SecurityInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedAccount = store.connectedAccounts.find(a => a.id === selectedAccountId) || null;

  // Load auth token
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    getToken().then(t => { if (t) setAuthToken(t); });
  }, [isLoaded, isSignedIn, getToken]);

  // Fetch accounts on mount
  const fetchAccounts = useCallback(async () => {
    if (!authToken) return;
    store.setLoading(true);
    try {
      const result = await brokerApi.getAccounts(authToken);
      store.setAccounts(result.accounts);
      // Auto-select first account
      if (result.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(result.accounts[0].id);
      }
    } catch {}
    finally { store.setLoading(false); }
  }, [authToken, selectedAccountId]);

  useEffect(() => { if (authToken) fetchAccounts(); }, [authToken]);

  // Auto-sync polling every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!authToken) return;
      store.connectedAccounts.forEach(async (acc) => {
        const syncStatus = store.syncStatuses[acc.id];
        if (syncStatus === "syncing") return;
        const lastSync = acc.last_sync_at ? new Date(acc.last_sync_at).getTime() : 0;
        if (Date.now() - lastSync > 15 * 60 * 1000) {
          await handleSync(acc.id, true);
        }
      });
    }, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, [authToken, store.connectedAccounts]);

  // Load detail when account changes
  useEffect(() => {
    if (!selectedAccountId || !authToken) return;
    loadDetail(selectedAccountId, detailTab);
  }, [selectedAccountId, detailTab, authToken]);

  const loadDetail = async (accountId: string, tab: string) => {
    setDetailLoading(true);
    try {
      if (tab === "holdings") {
        const r = await brokerApi.getHoldings(authToken, accountId);
        setHoldings(r.holdings);
      } else if (tab === "transactions") {
        const r = await brokerApi.getTransactions(authToken, accountId);
        setTransactions(r.items);
      } else if (tab === "insights") {
        const r = await brokerApi.getInsights(authToken, accountId);
        setInsights(r.insights);
      } else if (tab === "health") {
        const r = await brokerApi.getHealth(authToken, accountId);
        setHealth(r);
      } else if (tab === "security") {
        const r = await brokerApi.getSecurityInfo(authToken, accountId);
        setSecurity(r);
      }
    } catch {}
    finally { setDetailLoading(false); }
  };

  const handleSync = async (accountId: string, isAuto = false) => {
    if (!authToken) return;
    store.setSyncStatus(accountId, "syncing");
    store.updateAccount(accountId, { status: "syncing" });
    try {
      await brokerApi.syncBroker(authToken, accountId);
      store.setSyncStatus(accountId, "idle");
      store.updateAccount(accountId, { status: "connected", last_sync_at: new Date().toISOString() });
      if (selectedAccountId === accountId) {
        loadDetail(accountId, detailTab);
      }
    } catch {
      store.setSyncStatus(accountId, "error");
      store.updateAccount(accountId, { status: "error" });
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!authToken) return;
    if (!confirm("Disconnect this broker account? Your imported data will be removed.")) return;
    try {
      await brokerApi.disconnectBroker(authToken, accountId);
      store.removeAccount(accountId);
      if (selectedAccountId === accountId) {
        const remaining = store.connectedAccounts.filter(a => a.id !== accountId);
        setSelectedAccountId(remaining[0]?.id || null);
      }
    } catch {}
  };

  const handleConnected = (account: BrokerAccount) => {
    store.addAccount(account);
    setSelectedAccountId(account.id);
    // Trigger initial sync
    setTimeout(() => handleSync(account.id), 500);
  };

  const DETAIL_TABS = [
    { key: "holdings",     label: "Holdings",     icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: "transactions", label: "Transactions",  icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "insights",     label: "Insights",      icon: <Zap className="w-3.5 h-3.5" /> },
    { key: "health",       label: "Health",        icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: "security",     label: "Security",      icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-full space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#2563EB] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000]">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">Broker Connect</h1>
          </div>
          <p className="text-xs font-bold text-gray-500 ml-[52px]">
            Read-only portfolio intelligence · No trade execution · Real holdings analysis
          </p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] border-3 border-black text-white rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 transition-transform cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Connect Broker
        </button>
      </div>

      {/* Read-Only Notice */}
      <div className="flex items-center gap-3 p-4 bg-[#F0F4FF] border-3 border-[#2563EB] rounded-xl">
        <Shield className="w-5 h-5 text-[#2563EB] shrink-0" />
        <div>
          <p className="font-black text-xs text-[#2563EB] uppercase">Security Notice — Read Only Access</p>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            Stockox only reads your portfolio data. We never place trades, transfer funds, or modify your account.
            All API tokens are AES-256 encrypted at rest.
          </p>
        </div>
      </div>

      {store.connectedAccounts.length === 0 ? (
        /* ─── Empty State ─────────────────────────────────────────────────────── */
        <div className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-white">
          <div className="w-16 h-16 bg-[#F0F4FF] border-3 border-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000]">
            <Link2 className="w-8 h-8 text-[#2563EB]" />
          </div>
          <h2 className="font-black text-lg uppercase mb-2">No Brokers Connected</h2>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto mb-6">
            Connect your Zerodha, Groww, Angel One, or Upstox account to get real-time portfolio intelligence powered by AI.
          </p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] border-3 border-black text-white rounded-xl font-black text-sm uppercase shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Connect Your First Broker
          </button>
          <div className="flex items-center justify-center gap-6 mt-8">
            {["zerodha", "groww", "angelone", "upstox"].map(slug => (
              <BrokerLogo key={slug} slug={slug} size={40} />
            ))}
          </div>
        </div>
      ) : (
        /* ─── Main Layout ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left: Account List */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              Connected Accounts ({store.connectedAccounts.length})
            </p>
            {store.connectedAccounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                isSelected={selectedAccountId === account.id}
                onSelect={() => setSelectedAccountId(account.id)}
                onSync={() => handleSync(account.id)}
                onDisconnect={() => handleDisconnect(account.id)}
                isSyncing={store.syncStatuses[account.id] === "syncing"}
              />
            ))}
            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-3 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#F0F4FF] transition-all cursor-pointer font-black text-xs uppercase"
            >
              <Plus className="w-4 h-4" /> Add Another Broker
            </button>
          </div>

          {/* Right: Detail Panel */}
          {selectedAccount ? (
            <div className="border-3 border-black rounded-2xl bg-white shadow-[4px_4px_0px_#000000] overflow-hidden">
              {/* Account Header */}
              <div className="p-5 border-b-3 border-black bg-[#F8FAFC] flex items-center gap-4">
                <BrokerLogo slug={selectedAccount.broker_slug} size={52} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-black text-base uppercase">{selectedAccount.broker_name}</h2>
                    <StatusBadge status={selectedAccount.status} />
                  </div>
                  <p className="text-xs font-bold text-gray-500 capitalize">
                    {selectedAccount.account_type.replace("_", " ")} Account
                    {selectedAccount.account_label ? ` · ${selectedAccount.account_label}` : ""}
                    {selectedAccount.client_id ? ` · ID: ${selectedAccount.client_id}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    Last sync: {timeAgo(selectedAccount.last_sync_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleSync(selectedAccount.id)}
                  disabled={store.syncStatuses[selectedAccount.id] === "syncing"}
                  className="flex items-center gap-2 px-3 py-2 border-3 border-black rounded-xl font-black text-[10px] uppercase hover:bg-[#2563EB] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${store.syncStatuses[selectedAccount.id] === "syncing" ? "animate-spin" : ""}`} />
                  Sync Now
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b-3 border-black bg-[#F8FAFC] overflow-x-auto">
                {DETAIL_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key as any)}
                    className={`flex items-center gap-1.5 px-4 py-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap border-r-2 border-gray-200 cursor-pointer transition-colors ${
                      detailTab === tab.key
                        ? "bg-white text-[#2563EB] border-b-3 border-b-white -mb-[3px] relative z-10"
                        : "text-gray-500 hover:text-black hover:bg-white/50"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-5">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 text-[#2563EB] animate-spin" />
                  </div>
                ) : (
                  <>
                    {detailTab === "holdings" && <HoldingsTable holdings={holdings} />}
                    {detailTab === "transactions" && <TransactionTable transactions={transactions} />}
                    {detailTab === "insights" && <InsightsPanel insights={insights} />}

                    {detailTab === "health" && health && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <HealthCard label="Portfolio Value" value={fmt(health.total_value)} />
                        <HealthCard label="Total P&L" value={`${health.total_pnl >= 0 ? "+" : ""}${fmt(health.total_pnl)} (${health.total_pnl_pct.toFixed(2)}%)`} isPositive={health.total_pnl >= 0} />
                        <HealthCard label="Daily P&L" value={`${health.daily_pnl >= 0 ? "+" : ""}${fmt(health.daily_pnl)}`} isPositive={health.daily_pnl >= 0} />
                        <HealthCard label="Open Positions" value={health.open_positions.toString()} />
                        <HealthCard label="Monthly P&L" value={`${health.monthly_pnl >= 0 ? "+" : ""}${fmt(health.monthly_pnl)}`} isPositive={health.monthly_pnl >= 0} />
                        <HealthCard label="Annual P&L" value={`${health.annual_pnl >= 0 ? "+" : ""}${fmt(health.annual_pnl)}`} isPositive={health.annual_pnl >= 0} />
                        <HealthCard label="Broker" value={health.broker_name} />
                        <HealthCard label="Last Sync" value={timeAgo(health.last_sync_at)} />
                      </div>
                    )}
                    {detailTab === "health" && !health && (
                      <div className="p-8 text-center border-3 border-dashed border-gray-300 rounded-xl">
                        <p className="font-black text-xs uppercase text-gray-400">Sync account to view health metrics</p>
                      </div>
                    )}

                    {detailTab === "security" && security && (
                      <div className="space-y-4">
                        {/* Permissions */}
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-500 mb-2">API Permissions</p>
                          <div className="space-y-2">
                            {security.permissions.map(p => (
                              <div key={p.permission} className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="font-black text-xs">{p.permission}</span>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border-2 ${p.granted ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-50 text-red-600 border-red-300"}`}>
                                  {p.granted ? "Granted" : "Denied"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Token Info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 border-3 border-black rounded-xl bg-[#F8FAFC]">
                            <p className="text-[9px] font-black uppercase text-gray-500">Auth Type</p>
                            <p className="font-black text-sm mt-0.5">{security.auth_type.replace("_", " ").toUpperCase()}</p>
                          </div>
                          <div className="p-3 border-3 border-black rounded-xl bg-[#F8FAFC]">
                            <p className="text-[9px] font-black uppercase text-gray-500">Token Expiry</p>
                            <p className="font-black text-sm mt-0.5">
                              {security.token_expiry ? new Date(security.token_expiry).toLocaleDateString("en-IN") : "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Sync History */}
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Recent Sync History</p>
                          <div className="space-y-1.5">
                            {security.sync_history.slice(0, 5).map(s => (
                              <div key={s.id} className="flex items-center justify-between p-2.5 border-2 border-gray-100 rounded-xl hover:border-gray-300 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-[10px] font-bold text-gray-600">{new Date(s.started_at).toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-gray-400 uppercase">{s.trigger_type}</span>
                                  <StatusBadge status={s.status === "completed" ? "connected" : s.status === "failed" ? "error" : "syncing"} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && authToken && (
        <ConnectFlowModal
          token={authToken}
          onClose={() => setShowConnectModal(false)}
          onConnected={handleConnected}
        />
      )}
    </div>
  );
}
