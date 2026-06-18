"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import DashboardLayout from "@/app/dashboard/layout";
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Zap,
  RefreshCw,
  Activity,
  PieChart,
  CheckCircle,
  XCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Play,
  Calculator,
  Star,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════════ */
interface HealthScore {
  score: number;
  grade: string;
  diversification_score: number;
  concentration_score: number;
  volatility_score: number;
  cash_allocation_score: number;
  sector_balance_score: number;
  explanation: string;
}

interface AuditItem {
  icon: string;
  title: string;
  message: string;
}

interface CopilotAudit {
  strengths: AuditItem[];
  weaknesses: AuditItem[];
  recommendations: AuditItem[];
  generated_at: string;
}

interface SectorExposure {
  sector: string;
  current_pct: number;
  recommended_pct: number;
  risk_level: string;
  status: string;
}

interface PositionRisk {
  ticker: string;
  company_name: string;
  sector: string;
  allocation_pct: number;
  market_value: number;
  risk_score: number;
  recommendation: string;
  rationale: string;
}

interface AllocationItem {
  ticker: string;
  current_pct: number;
  suggested_pct: number;
  action: string;
  action_amount: number;
}

interface RebalancePlan {
  goal: string;
  current_allocations: AllocationItem[];
  suggested_allocations: AllocationItem[];
  expected_risk_reduction: string;
  expected_return_impact: string;
  generated_at: string;
}

interface SimulationResult {
  new_health_score: HealthScore;
  health_score_delta: number;
  new_sector_exposures: SectorExposure[];
  new_total_value: number;
  risk_change: string;
  diversification_note: string;
}

interface CopilotAlert {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  created_at: string;
}

interface DailyBrief {
  user_name: string;
  health_score: number;
  health_grade: string;
  total_value: number;
  top_sector_exposure: string;
  top_sector_pct: number;
  risk_level: string;
  opportunities: string[];
  warnings: string[];
  committee_highlights: string[];
  market_risks: string[];
  generated_at: string;
}

/* ════════════════════════════════════════════════════════════════════
   GOALS
════════════════════════════════════════════════════════════════════ */
const GOALS = [
  { id: "growth", label: "Growth", emoji: "📈" },
  { id: "balanced", label: "Balanced", emoji: "⚖️" },
  { id: "dividend", label: "Dividend", emoji: "💰" },
  { id: "aggressive", label: "Aggressive", emoji: "🚀" },
  { id: "preservation", label: "Capital Preservation", emoji: "🛡️" },
];

/* ════════════════════════════════════════════════════════════════════
   API HOOK
════════════════════════════════════════════════════════════════════ */
function useCopilotApi<T>(endpoint: string, staleTime = 5 * 60 * 1000, params = "") {
  const { getToken } = useAuth();
  return useQuery<T>({
    queryKey: ["copilot", endpoint, params],
    queryFn: async () => {
      const token = await getToken();
      const url = `/api/v1/copilot/${endpoint}${params ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    },
    staleTime,
    retry: 1,
  });
}

/* ════════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════════ */
function gradeColor(grade: string) {
  switch (grade) {
    case "Excellent": return "#16a34a";
    case "Good":      return "#2563EB";
    case "Moderate":  return "#d97706";
    default:          return "#dc2626";
  }
}

function gradeLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "High Risk";
}

function scoreBgClass(score: number) {
  if (score >= 80) return "bg-green-50 border-green-600";
  if (score >= 60) return "bg-blue-50 border-blue-600";
  if (score >= 40) return "bg-amber-50 border-amber-600";
  return "bg-red-50 border-red-600";
}

function alertTypeStyle(type: string) {
  switch (type) {
    case "danger":      return { bg: "bg-red-50",    border: "border-red-600",    text: "text-red-700",    badge: "bg-red-600 text-white",    icon: XCircle };
    case "warning":     return { bg: "bg-amber-50",  border: "border-amber-500",  text: "text-amber-700",  badge: "bg-amber-500 text-white",  icon: AlertTriangle };
    case "opportunity": return { bg: "bg-green-50",  border: "border-green-600",  text: "text-green-700",  badge: "bg-green-600 text-white",  icon: TrendingUp };
    default:            return { bg: "bg-blue-50",   border: "border-blue-500",   text: "text-blue-700",   badge: "bg-blue-500 text-white",   icon: Info };
  }
}

function recStyle(rec: string) {
  switch (rec) {
    case "Reduce":     return "bg-red-100 text-red-700 border-red-400";
    case "Watch":      return "bg-amber-100 text-amber-700 border-amber-400";
    case "Accumulate": return "bg-blue-100 text-blue-700 border-blue-400";
    default:           return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function actionStyle(action: string) {
  switch (action) {
    case "BUY":  return "bg-blue-600 text-white";
    case "SELL": return "bg-red-600 text-white";
    default:     return "bg-slate-200 text-slate-800";
  }
}

function statusStyle(status: string) {
  switch (status) {
    case "Overexposed":  return "bg-red-100 text-red-700 border border-red-400";
    case "Underexposed": return "bg-amber-100 text-amber-700 border border-amber-400";
    default:             return "bg-green-100 text-green-700 border border-green-400";
  }
}

function fmt(n: number, dec = 1) {
  return n.toFixed(dec);
}

/* ════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS
════════════════════════════════════════════════════════════════════ */
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 bg-[#2563EB] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000] shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-base font-black uppercase tracking-widest text-[#0F172A]">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000] p-5 ${className}`}>
      {children}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />;
}

/* ════════════════════════════════════════════════════════════════════
   HEALTH SCORE SECTION
════════════════════════════════════════════════════════════════════ */
function HealthScoreSection({ goal }: { goal: string }) {
  const { data, isLoading } = useCopilotApi<HealthScore>("health", 5 * 60 * 1000, `goal=${goal}`);

  const score = data?.score ?? 0;
  const grade = data?.grade ?? "Loading…";
  const color = gradeColor(grade);

  const subScores = data
    ? [
        { label: "Diversification",  value: data.diversification_score },
        { label: "Concentration",    value: data.concentration_score },
        { label: "Sector Balance",   value: data.sector_balance_score },
        { label: "Cash Allocation",  value: data.cash_allocation_score },
        { label: "Volatility",       value: data.volatility_score },
      ]
    : [];

  return (
    <Card className="col-span-1">
      <SectionHeader icon={ShieldCheck} title="Portfolio Health" subtitle="Composite health score" />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <>
          {/* Big Score */}
          <div className={`rounded-xl border-3 p-5 text-center mb-5 ${scoreBgClass(score)}`}>
            <p className="text-7xl font-black leading-none" style={{ color }}>{score}</p>
            <p className="text-xs font-black uppercase tracking-widest mt-1" style={{ color }}>/100</p>
            <span
              className="inline-block mt-2 px-3 py-1 text-xs font-black uppercase border-2 border-black rounded-full"
              style={{ background: color, color: "#fff" }}
            >
              {grade}
            </span>
          </div>

          {/* Sub-scores */}
          <div className="flex flex-col gap-3">
            {subScores.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs font-black uppercase mb-1">
                  <span className="text-slate-600">{s.label}</span>
                  <span>{s.value}/100</span>
                </div>
                <div className="h-2.5 bg-slate-100 border border-slate-300 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.value}%`,
                      background: s.value >= 70 ? "#16a34a" : s.value >= 50 ? "#2563EB" : s.value >= 30 ? "#d97706" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {data?.explanation && (
            <p className="mt-4 text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
              {data.explanation}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AUDIT SECTION
════════════════════════════════════════════════════════════════════ */
function AuditSection({ goal }: { goal: string }) {
  const { data, isLoading } = useCopilotApi<CopilotAudit>("audit", 15 * 60 * 1000, `goal=${goal}`);

  const cols = [
    { key: "strengths",       label: "Strengths",       color: "text-green-700",  bg: "bg-green-50",  border: "border-green-500", icon: CheckCircle, items: data?.strengths ?? [] },
    { key: "weaknesses",      label: "Weaknesses",      color: "text-red-700",    bg: "bg-red-50",    border: "border-red-500",   icon: XCircle,     items: data?.weaknesses ?? [] },
    { key: "recommendations", label: "Recommendations", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-500",  icon: Target,      items: data?.recommendations ?? [] },
  ];

  return (
    <Card className="col-span-full">
      <SectionHeader icon={Brain} title="AI Portfolio Audit" subtitle="Comprehensive portfolio evaluation" />
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cols.map(({ key, label, color, bg, border, icon: Icon, items }) => (
            <div key={key} className={`rounded-xl ${bg} border-2 ${border} p-4`}>
              <div className={`flex items-center gap-2 mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{label}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400">No items found.</p>
                ) : (
                  items.map((item, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                      <p className={`text-xs font-black uppercase ${color} mb-0.5`}>{item.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SECTOR EXPOSURE SECTION
════════════════════════════════════════════════════════════════════ */
function SectorSection({ goal }: { goal: string }) {
  const { data, isLoading } = useCopilotApi<SectorExposure[]>("sectors", 5 * 60 * 1000, `goal=${goal}`);

  return (
    <Card className="col-span-full">
      <SectionHeader icon={PieChart} title="Sector Exposure Analysis" subtitle={`Vs. ${goal} allocation targets`} />
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No holdings to analyse. Buy stocks to see sector breakdown.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left pb-3 font-black uppercase tracking-widest text-slate-600">Sector</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Current</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Target</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Risk</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Status</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600 w-40">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.sector} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-bold">{s.sector}</td>
                  <td className="py-3 text-right font-black">{fmt(s.current_pct)}%</td>
                  <td className="py-3 text-right text-slate-500">{fmt(s.recommended_pct)}%</td>
                  <td className={`py-3 text-right font-bold ${s.risk_level === "High" ? "text-red-600" : s.risk_level === "Medium" ? "text-amber-600" : "text-green-600"}`}>
                    {s.risk_level}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusStyle(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    <div className="h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                      <div className="relative h-full">
                        {/* Target line */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${Math.min(s.recommended_pct, 100)}%` }} />
                        {/* Current bar */}
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(s.current_pct, 100)}%`,
                            background: s.status === "Overexposed" ? "#dc2626" : s.status === "Underexposed" ? "#d97706" : "#16a34a",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   POSITION RISK SECTION
════════════════════════════════════════════════════════════════════ */
function PositionRiskSection() {
  const { data, isLoading } = useCopilotApi<PositionRisk[]>("positions", 5 * 60 * 1000);

  return (
    <Card className="col-span-full">
      <SectionHeader icon={Activity} title="Position Risk Analysis" subtitle="Per-holding risk scoring and recommendations" />
      {isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No holdings in portfolio. Buy stocks to see position risk analysis.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left pb-3 font-black uppercase tracking-widest text-slate-600">Ticker</th>
                <th className="text-left pb-3 font-black uppercase tracking-widest text-slate-600">Company</th>
                <th className="text-left pb-3 font-black uppercase tracking-widest text-slate-600">Sector</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Allocation</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Value</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600 w-28">Risk Score</th>
                <th className="text-right pb-3 font-black uppercase tracking-widest text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.ticker} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-black text-[#2563EB]">{p.ticker}</td>
                  <td className="py-3 text-slate-600 max-w-[140px] truncate">{p.company_name}</td>
                  <td className="py-3 text-slate-500">{p.sector}</td>
                  <td className="py-3 text-right font-bold">{fmt(p.allocation_pct)}%</td>
                  <td className="py-3 text-right text-slate-600">${p.market_value.toLocaleString()}</td>
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.risk_score}%`,
                            background: p.risk_score >= 55 ? "#dc2626" : p.risk_score >= 35 ? "#d97706" : "#2563EB",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-black w-6 text-right">{p.risk_score}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${recStyle(p.recommendation)}`}>
                      {p.recommendation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   REBALANCE ENGINE SECTION
════════════════════════════════════════════════════════════════════ */
function RebalanceSection({ goal }: { goal: string }) {
  const { getToken } = useAuth();
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/copilot/rebalance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (res.ok) setPlan(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="col-span-full md:col-span-1">
      <SectionHeader icon={RefreshCw} title="Rebalance Engine" subtitle="AI-generated allocation plan" />

      {!plan ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 bg-[#EFF6FF] border-3 border-[#2563EB] rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_#2563EB]">
            <RefreshCw className="w-8 h-8 text-[#2563EB]" />
          </div>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Click below to generate an AI rebalance plan for your <strong>{goal}</strong> goal. No trades will be executed automatically.
          </p>
          <button
            id="copilot-generate-rebalance"
            onClick={generate}
            disabled={loading}
            className="px-6 py-3 bg-[#2563EB] text-white border-3 border-black font-black text-xs uppercase tracking-widest rounded-xl shadow-[3px_3px_0px_#000000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate Rebalance Plan"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-green-50 border-2 border-green-500 p-3 text-center">
              <p className="text-[10px] font-black uppercase text-green-700">Risk Reduction</p>
              <p className="text-xs font-bold text-green-800 mt-1">{plan.expected_risk_reduction}</p>
            </div>
            <div className="flex-1 rounded-xl bg-blue-50 border-2 border-blue-500 p-3 text-center">
              <p className="text-[10px] font-black uppercase text-blue-700">Return Impact</p>
              <p className="text-xs font-bold text-blue-800 mt-1">{plan.expected_return_impact}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left pb-2 font-black uppercase text-slate-600">Ticker</th>
                  <th className="text-right pb-2 font-black uppercase text-slate-600">Current</th>
                  <th className="text-right pb-2 font-black uppercase text-slate-600">Target</th>
                  <th className="text-right pb-2 font-black uppercase text-slate-600">Action</th>
                  <th className="text-right pb-2 font-black uppercase text-slate-600">Amt ($)</th>
                </tr>
              </thead>
              <tbody>
                {plan.suggested_allocations.map((a) => (
                  <tr key={a.ticker} className="border-b border-slate-100">
                    <td className="py-2 font-black text-[#2563EB]">{a.ticker}</td>
                    <td className="py-2 text-right">{fmt(a.current_pct)}%</td>
                    <td className="py-2 text-right">{fmt(a.suggested_pct)}%</td>
                    <td className="py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${actionStyle(a.action)}`}>
                        {a.action}
                      </span>
                    </td>
                    <td className="py-2 text-right">{a.action_amount > 0 ? `$${a.action_amount.toLocaleString()}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setPlan(null)}
            className="text-xs text-slate-400 hover:text-slate-600 underline self-center"
          >
            Reset
          </button>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   WHAT-IF SIMULATOR SECTION
════════════════════════════════════════════════════════════════════ */
function SimulatorSection({ goal }: { goal: string }) {
  const { getToken } = useAuth();
  const [action, setAction] = useState("BUY");
  const [ticker, setTicker] = useState("NVDA");
  const [quantity, setQuantity] = useState(5);
  const [price, setPrice] = useState(500);
  const [amount, setAmount] = useState(5000);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const simulate = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const body = action === "ADD_CASH" || action === "REMOVE_CASH"
        ? { action, amount }
        : { action, ticker: ticker.toUpperCase(), quantity, price };
      const res = await fetch(`/api/v1/copilot/simulate?goal=${goal}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const isCash = action === "ADD_CASH" || action === "REMOVE_CASH";

  return (
    <Card className="col-span-full md:col-span-1">
      <SectionHeader icon={Calculator} title="What-If Simulator" subtitle="Simulate portfolio changes instantly" />

      <div className="flex flex-col gap-3">
        {/* Action selector */}
        <div className="grid grid-cols-2 gap-2">
          {["BUY", "SELL", "ADD_CASH", "REMOVE_CASH"].map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`py-2 text-xs font-black uppercase border-2 border-black rounded-lg transition-all ${
                action === a ? "bg-[#2563EB] text-white shadow-[2px_2px_0px_#000]" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {a.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Inputs */}
        {!isCash ? (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Ticker</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full border-2 border-black rounded-lg px-2 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-[#2563EB]"
                placeholder="NVDA"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Qty</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(+e.target.value)}
                className="w-full border-2 border-black rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Price $</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(+e.target.value)}
                className="w-full border-2 border-black rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Amount $</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
              className="w-full border-2 border-black rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        )}

        <button
          id="copilot-simulate"
          onClick={simulate}
          disabled={loading}
          className="py-2.5 bg-black text-white border-2 border-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#2563EB] hover:translate-y-[-1px] active:translate-y-0 transition-all disabled:opacity-50"
        >
          {loading ? "Simulating…" : "▶ Run Simulation"}
        </button>

        {/* Results */}
        {result && (
          <div className="border-t-2 border-slate-200 pt-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-600">New Health Score</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">{result.new_health_score.score}</span>
                <span
                  className={`text-xs font-black flex items-center gap-0.5 ${
                    result.health_score_delta > 0 ? "text-green-600" : result.health_score_delta < 0 ? "text-red-600" : "text-slate-500"
                  }`}
                >
                  {result.health_score_delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : result.health_score_delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {result.health_score_delta > 0 ? "+" : ""}{result.health_score_delta}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
              <p className="font-bold text-slate-600">Risk: <span className={result.risk_change === "Improved" ? "text-green-600" : result.risk_change === "Worsened" ? "text-red-600" : "text-slate-500"}>{result.risk_change}</span></p>
              <p className="text-slate-500 mt-0.5">{result.diversification_note}</p>
              <p className="text-slate-500">New Value: <strong>${result.new_total_value.toLocaleString()}</strong></p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ALERTS SECTION
════════════════════════════════════════════════════════════════════ */
function AlertsSection({ goal }: { goal: string }) {
  const { data, isLoading } = useCopilotApi<CopilotAlert[]>("alerts", 0, `goal=${goal}`);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = (data ?? []).filter((a) => !dismissed.has(a.id));

  return (
    <Card className="col-span-full">
      <SectionHeader icon={AlertTriangle} title="Alert Engine" subtitle={`${visible.length} active alert${visible.length !== 1 ? "s" : ""}`} />
      {isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : visible.length === 0 ? (
        <div className="flex items-center gap-3 bg-green-50 border-2 border-green-500 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-bold text-green-700">No active alerts. Portfolio is within healthy parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((alert) => {
            const style = alertTypeStyle(alert.type);
            const Icon = style.icon;
            return (
              <div key={alert.id} className={`rounded-xl ${style.bg} border-2 ${style.border} p-4 flex gap-3`}>
                <Icon className={`w-4 h-4 ${style.text} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-black uppercase ${style.text}`}>{alert.title}</p>
                    <button
                      onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
                      className="text-slate-400 hover:text-slate-600 text-[10px] shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <p className={`text-xs mt-1 ${style.text} opacity-80 leading-relaxed`}>{alert.message}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${style.badge}`}>
                    {alert.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DAILY BRIEF SECTION
════════════════════════════════════════════════════════════════════ */
function DailyBriefSection() {
  const { data, isLoading } = useCopilotApi<DailyBrief>("brief", 60 * 60 * 1000);

  return (
    <Card className="col-span-full md:col-span-1 bg-[#0F172A] border-black">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 bg-[#2563EB] border-3 border-[#334155] rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#2563EB] shrink-0">
          <Star className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-black uppercase tracking-widest text-white">Daily Copilot Brief</h2>
          {data?.generated_at && (
            <p className="text-xs text-slate-400 mt-0.5">{new Date(data.generated_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 bg-slate-700" />)}
        </div>
      ) : !data ? (
        <p className="text-slate-400 text-sm">Unable to load brief.</p>
      ) : (
        <div className="flex flex-col gap-4 text-white">
          {/* Greeting */}
          <p className="text-sm font-bold">
            Good morning, <span className="text-[#60A5FA]">{data.user_name}</span>.
          </p>

          {/* Key metrics row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Health", value: `${data.health_score}/100`, sub: data.health_grade },
              { label: "Top Sector", value: data.top_sector_exposure, sub: `${fmt(data.top_sector_pct)}%` },
              { label: "Risk Level", value: data.risk_level, sub: "portfolio" },
            ].map((m) => (
              <div key={m.label} className="bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase">{m.label}</p>
                <p className="text-sm font-black text-white mt-1 leading-tight">{m.value}</p>
                <p className="text-[10px] text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Opportunities */}
          {data.opportunities.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase text-[#60A5FA] mb-2">Opportunities</p>
              {data.opportunities.map((o, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">{o}</p>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase text-amber-400 mb-2">Warnings</p>
              {data.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Committee */}
          <div>
            <p className="text-[10px] font-black uppercase text-[#60A5FA] mb-2">Committee Highlights</p>
            {data.committee_highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <Zap className="w-3 h-3 text-[#60A5FA] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">{h}</p>
              </div>
            ))}
          </div>

          {/* Market Risks */}
          <div>
            <p className="text-[10px] font-black uppercase text-red-400 mb-2">Market Risks</p>
            {data.market_risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <TrendingDown className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GOAL SELECTOR
════════════════════════════════════════════════════════════════════ */
function GoalSelector({ goal, onGoal }: { goal: string; onGoal: (g: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500 mr-1">Goal:</span>
      {GOALS.map((g) => (
        <button
          key={g.id}
          onClick={() => onGoal(g.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase border-2 border-black rounded-lg transition-all ${
            goal === g.id
              ? "bg-[#2563EB] text-white shadow-[2px_2px_0px_#000]"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span>{g.emoji}</span> {g.label}
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
export default function CopilotPage() {
  const [goal, setGoal] = useState("balanced");

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── HERO HEADER ── */}
          <div className="bg-white border-3 border-black rounded-2xl shadow-[5px_5px_0px_#000000] p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#2563EB] border-3 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_#000000] rotate-[-2deg] shrink-0">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-[#0F172A]">AI Portfolio Copilot</h1>
                    <span className="bg-[#2563EB] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-black">Module 9</span>
                  </div>
                  <p className="text-sm text-slate-500 max-w-xl">
                    Your personal AI investment advisor. Continuously analyses your portfolio for risk, opportunity, and diversification — and delivers actionable recommendations.
                  </p>
                </div>
              </div>
            </div>
            {/* Goal selector */}
            <div className="mt-5 pt-4 border-t-2 border-slate-100">
              <GoalSelector goal={goal} onGoal={setGoal} />
            </div>
          </div>

          {/* ── SECTION 1 & BRIEF (side by side) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <HealthScoreSection goal={goal} />
            </div>
            <div className="md:col-span-2">
              <DailyBriefSection />
            </div>
          </div>

          {/* ── SECTION 2: AUDIT ── */}
          <AuditSection goal={goal} />

          {/* ── SECTION 3: SECTOR EXPOSURE ── */}
          <SectorSection goal={goal} />

          {/* ── SECTION 4: POSITION RISK ── */}
          <PositionRiskSection />

          {/* ── SECTION 5 & 6: REBALANCE + SIMULATOR ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <RebalanceSection goal={goal} />
            <SimulatorSection goal={goal} />
          </div>

          {/* ── SECTION 7: ALERTS ── */}
          <AlertsSection goal={goal} />

          {/* Footer */}
          <div className="text-center text-xs text-slate-400 pb-4 font-bold uppercase tracking-widest">
            AI Copilot · All recommendations are educational and not financial advice · Stockox
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
