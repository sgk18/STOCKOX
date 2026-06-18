"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocketStore } from "@/lib/websocketStore";
import DashboardLayout from "@/app/dashboard/layout";
import {
  Bot,
  Database,
  Globe,
  LineChart,
  ShieldCheck,
  Cpu,
  MessageSquare,
  Award,
  Clock,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  Zap,
  Search,
  AlertCircle,
} from "lucide-react";

/* ─────────────────────────────── Types ─────────────────────────────── */
interface WarRoomSession {
  id: string;
  ticker: string;
  company_name: string;
  status: string;
  progress_percent: number;
  current_agent: string;
  agent_status: string;
  recommendation?: string;
  confidence_score?: number;
  risk_level?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

interface WarRoomMessage {
  id: string;
  agent_name: string;
  message: string;
  message_type: string;
  confidence_score: number;
  created_at: string;
}

interface WarRoomVotes {
  research_vote: string;
  technical_vote: string;
  news_vote: string;
  risk_vote: string;
  valuation_vote: string;
  buy_count: number;
  hold_count: number;
  sell_count: number;
}

interface WarRoomAnalysis {
  research_summary: string;
  technical_summary: string;
  news_summary: string;
  risk_summary: string;
  valuation_summary: string;
  target_price: number;
  bull_case: string;
  bear_case: string;
  risk_factors: string;
  investment_horizon: string;
}

interface WarRoomSessionResponse {
  session: WarRoomSession;
  messages: WarRoomMessage[];
  votes?: WarRoomVotes;
  analysis?: WarRoomAnalysis;
}

interface HistorySession {
  id: string;
  ticker: string;
  company_name: string;
  status: string;
  recommendation?: string;
  confidence_score?: number;
  progress_percent: number;
  created_at: string;
}

/* ─────────────────────── Agent Config ───────────────────────────────── */
const AGENT_CONFIG = [
  { name: "Research Agent",   icon: Database,    color: "#2563EB", label: "Fundamentals",  abbrev: "RES" },
  { name: "Technical Agent",  icon: LineChart,   color: "#3B82F6", label: "Technical",     abbrev: "TEC" },
  { name: "News Agent",       icon: Globe,       color: "#6366F1", label: "Sentiment",     abbrev: "NEWS" },
  { name: "Risk Agent",       icon: ShieldCheck, color: "#F59E0B", label: "Risk Audit",    abbrev: "RISK" },
  { name: "Portfolio Agent",  icon: TrendingUp,  color: "#8B5CF6", label: "Portfolio Fit", abbrev: "PORT" },
  { name: "Committee Agent",  icon: Cpu,         color: "#10B981", label: "Consensus",     abbrev: "COM" },
];

const TICKERS = ["NVDA", "AAPL", "TSLA", "MSFT", "AMD", "AMZN", "GOOGL", "META", "NFLX"];

const recColor = (r?: string) => {
  if (!r) return "text-[#64748B]";
  const u = r.toUpperCase();
  if (u.includes("BUY")) return "text-[#2563EB]";
  if (u.includes("SELL")) return "text-rose-500";
  return "text-amber-500";
};

const recBg = (r?: string) => {
  if (!r) return "bg-slate-100 border-slate-300 text-slate-400";
  const u = r.toUpperCase();
  if (u.includes("BUY")) return "bg-[#2563EB]/15 border-[#2563EB]/30 text-[#2563EB]";
  if (u.includes("SELL")) return "bg-rose-50 border-rose-300 text-rose-600";
  return "bg-amber-50 border-amber-300 text-amber-600";
};

/* ──────────────── Skeleton ───────────────────────────────────────────── */
const Skel = ({ className = "h-4 w-full" }: { className?: string }) => (
  <div className={`bg-black/5 animate-pulse rounded-lg ${className}`} />
);

/* ╔════════════════════════════════════════════════════════════════════╗
   ║                     WAR ROOM COMMITTEE PAGE                       ║
   ╚════════════════════════════════════════════════════════════════════╝ */
export default function WarRoomPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  /* ── State ── */
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState("NVDA");
  const [customTicker, setCustomTicker] = useState("");
  const [agentStates, setAgentStates] = useState<Record<string, string>>({});
  const [liveMessages, setLiveMessages] = useState<WarRoomMessage[]>([]);
  const [liveDone, setLiveDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ── Load session from URL ── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const querySessionId = searchParams.get("session_id");
      if (querySessionId) {
        setActiveSessionId(querySessionId);
      }
    }
  }, []);

  /* ── WebSocket ── */
  const socketConnected = useWebSocketStore(s => s.connected);
  const connectSocket  = useWebSocketStore(s => s.connect);
  const subscribeSocket = useWebSocketStore(s => s.subscribe);

  /* ── Connect WS ── */
  useEffect(() => {
    if (!isSignedIn) return;
    getToken().then(t => connectSocket(t));
  }, [isSignedIn, getToken, connectSocket]);

  /* ── WS event subscriptions ── */
  useEffect(() => {
    if (!socketConnected || !activeSessionId) return;

    const unsubs = [
      subscribeSocket("agent_started", ev => {
        if (ev.payload.session_id !== activeSessionId) return;
        setAgentStates(p => ({ ...p, [ev.payload.agent_name]: "thinking" }));
      }),
      subscribeSocket("agent_message", ev => {
        if (ev.payload.session_id !== activeSessionId) return;
        const msg: WarRoomMessage = {
          id: ev.id,
          agent_name: ev.payload.agent_name,
          message: ev.payload.message,
          message_type: ev.payload.message_type,
          confidence_score: ev.payload.confidence_score,
          created_at: ev.timestamp,
        };
        setLiveMessages(p => {
          if (p.some(m => m.id === msg.id)) return p;
          return [...p, msg];
        });
        setAgentStates(p => ({ ...p, [ev.payload.agent_name]: "analyzing" }));
      }),
      subscribeSocket("agent_completed", ev => {
        if (ev.payload.session_id !== activeSessionId) return;
        setAgentStates(p => ({ ...p, [ev.payload.agent_name]: "completed" }));
      }),
      subscribeSocket("analysis_completed", ev => {
        if (ev.payload.session_id !== activeSessionId) return;
        setLiveDone(true);
        sessionQuery.refetch();
      }),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [socketConnected, activeSessionId, subscribeSocket]);

  /* ── Auto scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  /* ── Session Query ── */
  const sessionQuery = useQuery<WarRoomSessionResponse>({
    queryKey: ["war-room-session", activeSessionId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/war-room/session/${activeSessionId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load session");
      return res.json();
    },
    enabled: !!activeSessionId && !!isSignedIn,
    refetchInterval: liveDone ? false : 3000,
    staleTime: 0,
  });

  /* ── History Query ── */
  const historyQuery = useQuery<HistorySession[]>({
    queryKey: ["war-room-history"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/v1/war-room/history", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
    enabled: !!isSignedIn,
    staleTime: 30000,
  });

  /* ── Start Analysis Mutation ── */
  const startMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const token = await getToken();
      const res = await fetch("/api/v1/analysis/start", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start analysis");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActiveSessionId(data.session_id);
      setLiveMessages([]);
      setLiveDone(false);
      setAgentStates({});
      historyQuery.refetch();
    },
  });

  const session = sessionQuery.data?.session;
  const messages = liveMessages.length > 0 ? liveMessages : (sessionQuery.data?.messages || []);
  const votes = sessionQuery.data?.votes;
  const analysis = sessionQuery.data?.analysis;
  const isRunning = session && (session.status === "running" || session.status === "pending");
  const isCompleted = session?.status === "completed";

  const handleStart = () => {
    const ticker = customTicker.trim().toUpperCase() || selectedTicker;
    startMutation.mutate(ticker);
  };

  /* ─────────────────────────── RENDER ──────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 pb-8">

        {/* ── HERO HEADER ── */}
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-4 border-black p-6 md:p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,_rgba(37,99,235,0.06)_0%,_transparent_60%)] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-[#2563EB] rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest font-black text-[#2563EB] border border-[#2563EB]/30 bg-[#2563EB]/10 px-2.5 py-0.5 rounded-full">
                  Module 8 — Band of Agents
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-[#0F172A] leading-tight">
                AI Committee<br className="hidden md:block" /> War Room
              </h1>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-2 font-mono max-w-md">
                Watch 5 specialized AI agents debate, vote, and reach consensus on any stock in real time.
              </p>
            </div>

            {/* Quick launch pill */}
            <div className="flex items-center gap-3 bg-[#F8FAFC] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_#000000]">
              {AGENT_CONFIG.slice(0, 5).map((a, i) => (
                <div
                  key={a.name}
                  title={a.name}
                  className="w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000]"
                  style={{ background: a.color + "22", color: a.color, zIndex: 10 - i }}
                >
                  <a.icon className="w-4 h-4" />
                </div>
              ))}
              <ChevronRight className="w-4 h-4 text-black/40" />
              <div className="w-9 h-9 rounded-xl border-2 border-black bg-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000]">
                <Award className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── LAUNCHER + ACTIVE SESSION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Launcher */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000000] p-6 flex flex-col gap-4">
              <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-black/50 border-b-2 border-black/5 pb-3 flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-[#2563EB]" />
                Launch New Analysis
              </h3>

              {/* Ticker grid */}
              <div className="grid grid-cols-3 gap-2">
                {TICKERS.map(t => (
                  <button
                    key={t}
                    onClick={() => { setSelectedTicker(t); setCustomTicker(""); }}
                    className={`py-2 rounded-xl border-2 font-mono font-black text-[10px] uppercase transition-all cursor-pointer ${
                      selectedTicker === t && !customTicker
                        ? "bg-[#2563EB] text-white border-black shadow-[2px_2px_0px_#000000]"
                        : "bg-[#F8FAFC] text-[#0F172A]/70 border-black/20 hover:border-black hover:text-[#0F172A]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Custom ticker input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30" />
                <input
                  type="text"
                  placeholder="Custom ticker (e.g. INFY)..."
                  value={customTicker}
                  onChange={e => setCustomTicker(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border-2 border-black/20 focus:border-[#2563EB] rounded-xl font-mono text-xs font-bold outline-none transition-colors"
                />
              </div>

              {/* Error state */}
              {startMutation.isError && (
                <div className="flex items-start gap-2 bg-rose-50 border-2 border-rose-400 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-mono font-bold text-rose-600 leading-relaxed">
                    {(startMutation.error as Error)?.message || "Failed to start analysis"}
                  </p>
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm uppercase rounded-xl border-3 border-black shadow-[3px_3px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {startMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /><span>Convening Committee...</span></>
                ) : (
                  <><Zap className="w-4 h-4" /><span>Analyze {customTicker || selectedTicker}</span></>
                )}
              </button>
            </div>

            {/* Recent sessions */}
            <div className="bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000000] p-6 flex flex-col gap-4 flex-grow">
              <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-black/50 border-b-2 border-black/5 pb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                Recent Sessions
              </h3>

              {historyQuery.isLoading ? (
                <div className="flex flex-col gap-2">
                  {[...Array(4)].map((_, i) => <Skel key={i} className="h-12 w-full" />)}
                </div>
              ) : (historyQuery.data || []).length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Bot className="w-8 h-8 text-[#2563EB]/30" />
                  <p className="text-[10px] font-mono text-black/30 uppercase text-center">No sessions yet. Launch your first analysis above.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-80">
                  {(historyQuery.data || []).map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSessionId(s.id);
                        setLiveMessages([]);
                        setLiveDone(s.status === "completed");
                        setAgentStates({});
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left cursor-pointer hover:shadow-[2px_2px_0px_#000000] ${
                        activeSessionId === s.id
                          ? "border-[#2563EB] bg-[#2563EB]/5 shadow-[2px_2px_0px_#2563EB]"
                          : "border-black/15 hover:border-black/40 bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-black text-xs text-[#0F172A]">{s.ticker}</span>
                        <span className="font-mono text-[9px] text-black/40 uppercase">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.recommendation && (
                          <span className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded-lg ${recBg(s.recommendation)}`}>
                            {s.recommendation}
                          </span>
                        )}
                        <span className={`text-[9px] font-mono uppercase ${
                          s.status === "completed" ? "text-emerald-500" :
                          s.status === "failed" ? "text-rose-500" : "text-amber-500"
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Active War Room */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {!activeSessionId ? (
              <div className="bg-white border-4 border-black rounded-[24px] shadow-[4px_4px_0px_#000000] p-12 flex flex-col items-center justify-center gap-4 min-h-[500px]">
                <div className="w-16 h-16 bg-[#F8FAFC] border-4 border-black rounded-2xl shadow-[3px_3px_0px_#000000] flex items-center justify-center">
                  <Bot className="w-8 h-8 text-[#2563EB]" />
                </div>
                <h3 className="text-lg font-black uppercase text-[#0F172A] tracking-tight">Ready to Convene</h3>
                <p className="text-xs font-mono font-bold text-[#64748B] text-center max-w-sm uppercase tracking-wide leading-relaxed">
                  Select a ticker and click "Analyze" to watch the AI Committee deliberate in real time.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {AGENT_CONFIG.map(a => (
                    <div key={a.name} style={{ background: a.color + "15", color: a.color }}
                      className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center">
                      <a.icon className="w-4 h-4" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <WarRoom
                sessionId={activeSessionId}
                session={session}
                messages={messages}
                votes={votes}
                analysis={analysis}
                agentStates={agentStates}
                isRunning={!!isRunning}
                isCompleted={!!isCompleted}
                isLoading={sessionQuery.isLoading}
                messagesEndRef={messagesEndRef}
                onRefresh={() => {
                  const ticker = session?.ticker || selectedTicker;
                  startMutation.mutate(ticker);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ╔════════════════════════════════════════════════════════════════════╗
   ║                        WAR ROOM COMPONENT                        ║
   ╚════════════════════════════════════════════════════════════════════╝ */
interface WarRoomProps {
  sessionId: string;
  session?: WarRoomSession;
  messages: WarRoomMessage[];
  votes?: WarRoomVotes;
  analysis?: WarRoomAnalysis;
  agentStates: Record<string, string>;
  isRunning: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onRefresh: () => void;
}

function WarRoom({
  session, messages, votes, analysis, agentStates,
  isRunning, isCompleted, isLoading, messagesEndRef, onRefresh,
}: WarRoomProps) {
  /* Determine agent status from DB session when not live */
  const getAgentStatus = (agentName: string): string => {
    if (agentStates[agentName]) return agentStates[agentName];
    const hasMessage = messages.some(m => m.agent_name === agentName);
    if (hasMessage) return "completed";
    if (isCompleted) return "completed";
    return "idle";
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Session Header ── */}
      <div className="bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000000] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#64748B] font-black">
              Active Session
            </span>
            <span className={`font-mono text-[8px] uppercase px-2 py-0.5 rounded border-2 border-black font-black ${
              isCompleted ? "bg-emerald-100 text-emerald-600" :
              isRunning ? "bg-amber-100 text-amber-600 animate-pulse" :
              "bg-slate-100 text-slate-400"
            }`}>
              {session?.status || "loading"}
            </span>
          </div>
          <h2 className="text-xl font-black uppercase text-[#0F172A] tracking-tight">
            {session?.ticker || <Skel className="h-7 w-24" />}
            {session?.company_name && (
              <span className="text-xs font-mono font-bold text-[#64748B] ml-2 normal-case tracking-normal">
                {session.company_name}
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isCompleted && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 border-2 border-black rounded-xl text-[10px] font-black uppercase hover:bg-[#F8FAFC] transition-all cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-y-0.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Analysis
            </button>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-black text-amber-600 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{session?.progress_percent || 0}% — {session?.current_agent || "Initializing"}...</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Agent Pipeline ── */}
      <div className="bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000000] p-5">
        <h4 className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40 mb-5 flex items-center gap-2">
          <Zap className="w-3 h-3 text-[#2563EB]" />
          Multi-Agent Pipeline
        </h4>
        <div className="flex items-start justify-between gap-1 sm:gap-2 relative">
          {AGENT_CONFIG.map((agent, idx) => {
            const status = getAgentStatus(agent.name);
            const isThinking = status === "thinking";
            const isAnalyzing = status === "analyzing";
            const isDone = status === "completed";
            const isIdle = status === "idle";

            return (
              <React.Fragment key={agent.name}>
                <div className="flex flex-col items-center gap-1.5 relative z-10 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-3 border-black flex items-center justify-center relative transition-all duration-300 shadow-[2px_2px_0px_#000000] ${
                    isDone ? "bg-emerald-100" :
                    isThinking ? "bg-amber-100 scale-110" :
                    isAnalyzing ? "bg-blue-100 scale-105" :
                    "bg-[#F8FAFC]"
                  }`}
                  style={{ color: isDone ? "#10B981" : isThinking || isAnalyzing ? agent.color : "#94A3B8" }}
                  >
                    <agent.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${(isThinking || isAnalyzing) ? "animate-pulse" : ""}`} />
                    {(isThinking || isAnalyzing || isDone) && (
                      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        isDone ? "bg-emerald-500" : isThinking ? "bg-amber-500 animate-ping" : "bg-[#2563EB]"
                      }`} />
                    )}
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-center leading-tight text-[#0F172A]/70 max-w-[52px]">
                    {agent.label}
                  </span>
                  <span className={`text-[7px] font-mono uppercase ${
                    isDone ? "text-emerald-500" :
                    isThinking ? "text-amber-500" :
                    isAnalyzing ? "text-[#2563EB]" :
                    "text-black/25"
                  }`}>
                    {isDone ? "✓ done" : isThinking ? "thinking" : isAnalyzing ? "writing" : "idle"}
                  </span>
                </div>

                {idx < AGENT_CONFIG.length - 1 && (
                  <div className="h-1 flex-1 bg-black/10 rounded-full self-start mt-5 sm:mt-6 relative overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: isDone ? "100%" : isAnalyzing ? "60%" : isThinking ? "25%" : "0%" }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Split Panel: Chat + Votes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Chat Timeline */}
        <div className="lg:col-span-7 bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000000] p-5 flex flex-col min-h-[400px]">
          <h4 className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40 border-b-2 border-black/5 pb-3 mb-4 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
            Agent Debate Timeline
          </h4>

          {/* Typing indicator */}
          {isRunning && session?.current_agent && (
            <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-[#64748B] animate-pulse">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>{session.current_agent} is analyzing...</span>
            </div>
          )}

          <div className="flex-grow flex flex-col gap-3 overflow-y-auto max-h-[450px] pr-1">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skel key={i} className="h-20 w-full" />)
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-grow gap-3 py-8">
                <Bot className="w-10 h-10 text-[#2563EB]/30 animate-bounce" />
                <p className="text-[10px] font-mono text-black/30 uppercase text-center">
                  {isRunning ? "Agents are preparing their analysis..." : "Waiting for analysis to start..."}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map(msg => {
                  const agent = AGENT_CONFIG.find(a => a.name === msg.agent_name);
                  const Icon = agent?.icon || Bot;
                  const isCommittee = msg.agent_name === "Committee Agent";

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 p-4 rounded-2xl border-2 border-black transition-all ${
                        isCommittee
                          ? "bg-[#0F172A] text-white border-black shadow-[3px_3px_0px_#000000]"
                          : "bg-[#F8FAFC] hover:bg-white shadow-[2px_2px_0px_#000000]"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl border-2 border-black/20 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#00000020]"
                        style={{ background: (agent?.color || "#64748B") + "20", color: agent?.color || "#64748B" }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-tight ${isCommittee ? "text-white" : "text-[#0F172A]"}`}>
                            {msg.agent_name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-mono border px-1.5 py-0.5 rounded uppercase font-black ${
                              isCommittee
                                ? "border-white/20 text-white/70"
                                : msg.message_type === "BUY" ? "border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/10" :
                                  msg.message_type === "SELL" ? "border-rose-300 text-rose-600 bg-rose-50" :
                                  "border-amber-300 text-amber-600 bg-amber-50"
                            }`}>
                              {msg.message_type}
                            </span>
                            {msg.confidence_score > 0 && (
                              <span className={`text-[8px] font-mono ${isCommittee ? "text-white/50" : "text-black/40"}`}>
                                {msg.confidence_score}%
                              </span>
                            )}
                          </div>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isCommittee ? "text-white/90 font-bold" : "text-[#0F172A]/80 font-medium"}`}>
                          {msg.message}
                        </p>
                        <span className={`text-[8px] font-mono mt-1 block ${isCommittee ? "text-white/30" : "text-black/30"}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right panel: Voting Board + Decision */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Voting Board */}
          <div className="bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000000] p-5">
            <h4 className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40 border-b-2 border-black/5 pb-3 mb-4 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-[#2563EB]" />
              Live Voting Board
            </h4>

            {isLoading ? (
              <div className="flex flex-col gap-2">{[...Array(5)].map((_, i) => <Skel key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  { agent: "Research Agent", vote: votes?.research_vote, agentKey: "Research Agent" },
                  { agent: "Technical Agent", vote: votes?.technical_vote, agentKey: "Technical Agent" },
                  { agent: "News Agent", vote: votes?.news_vote, agentKey: "News Agent" },
                  { agent: "Risk Agent", vote: votes?.risk_vote, agentKey: "Risk Agent" },
                  { agent: "Portfolio Agent", vote: votes?.valuation_vote, agentKey: "Portfolio Agent" },
                ].map(({ agent, vote, agentKey }) => {
                  const agentConf = AGENT_CONFIG.find(a => a.name === agentKey);
                  const agentStatus = getAgentStatus(agentKey);
                  const hasVoted = !!vote || agentStatus === "completed";
                  const agentMsg = messages.find(m => m.agent_name === agentKey);
                  const displayVote = vote || agentMsg?.message_type;

                  return (
                    <div key={agent} className="flex items-center justify-between p-2.5 rounded-xl border-2 border-black/8 bg-[#F8FAFC]">
                      <div className="flex items-center gap-2">
                        {agentConf && (
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: agentConf.color + "15", color: agentConf.color }}>
                            <agentConf.icon className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-[9px] font-black uppercase text-[#0F172A]/70">{agentConf?.label}</span>
                      </div>
                      <AnimatePresence>
                        {hasVoted && displayVote ? (
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded-lg ${recBg(displayVote)}`}
                          >
                            {displayVote}
                          </motion.span>
                        ) : (
                          <span className="text-[9px] font-mono text-black/25 uppercase">
                            {agentStatus === "thinking" ? "analyzing..." : "pending"}
                          </span>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vote tally */}
            {(votes || messages.length > 0) && (
              <div className="mt-4 pt-4 border-t-2 border-black/5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "BUY", count: votes?.buy_count ?? messages.filter(m => m.message_type === "BUY").length, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
                    { label: "HOLD", count: votes?.hold_count ?? messages.filter(m => m.message_type === "HOLD").length, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "SELL", count: votes?.sell_count ?? messages.filter(m => m.message_type === "SELL").length, color: "text-rose-500", bg: "bg-rose-50" },
                  ].map(v => (
                    <div key={v.label} className={`${v.bg} rounded-xl p-2 border border-black/10`}>
                      <div className={`text-xl font-black ${v.color}`}>{v.count}</div>
                      <div className="text-[8px] font-mono uppercase text-black/40">{v.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Committee Decision */}
          <AnimatePresence>
            {isCompleted && session?.recommendation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-4 border-black rounded-[20px] shadow-[5px_5px_0px_#000000] p-5 flex flex-col gap-4"
              >
                <h4 className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40 border-b-2 border-black/5 pb-3 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-[#2563EB]" />
                  Committee Decision
                </h4>

                {/* Main verdict */}
                <div className="flex items-center justify-between bg-[#F8FAFC] border-3 border-black rounded-2xl p-4 shadow-[2px_2px_0px_#000000]">
                  <div>
                    <p className="text-[9px] font-mono font-black text-black/40 uppercase mb-1">Final Verdict</p>
                    <div className={`text-3xl font-black uppercase tracking-tight ${recColor(session.recommendation)}`}>
                      {session.recommendation}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono font-black text-black/40 uppercase mb-1">AI Confidence</p>
                    <div className="text-3xl font-black text-[#0F172A] font-mono">{session.confidence_score}%</div>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="w-full bg-black/5 border-2 border-black/10 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${session.confidence_score}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      session.recommendation === "BUY" ? "bg-[#2563EB]" :
                      session.recommendation === "SELL" ? "bg-rose-500" : "bg-amber-500"
                    }`}
                  />
                </div>

                {/* Decision Engine fields */}
                {analysis && (
                  <div className="flex flex-col gap-2 text-[10px] font-mono">
                    {analysis.target_price > 0 && (
                      <div className="flex justify-between p-2 border border-black/10 rounded-lg bg-[#F8FAFC]">
                        <span className="text-black/50 font-bold">Target Price</span>
                        <span className="font-black text-[#2563EB]">${analysis.target_price.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-2 border border-black/10 rounded-lg bg-[#F8FAFC]">
                      <span className="text-black/50 font-bold">Horizon</span>
                      <span className="font-black text-[#0F172A]">{analysis.investment_horizon}</span>
                    </div>
                  </div>
                )}

                {/* Bull/Bear cases */}
                {analysis && (
                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-[#2563EB]" />
                        <span className="text-[8px] font-black uppercase text-[#2563EB]">Bull Case</span>
                      </div>
                      <p className="text-[9px] text-[#0F172A]/70 leading-relaxed">{analysis.bull_case}</p>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="w-3 h-3 text-rose-500" />
                        <span className="text-[8px] font-black uppercase text-rose-500">Bear Case</span>
                      </div>
                      <p className="text-[9px] text-[#0F172A]/70 leading-relaxed">{analysis.bear_case}</p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Minus className="w-3 h-3 text-amber-500" />
                        <span className="text-[8px] font-black uppercase text-amber-500">Risk Factors</span>
                      </div>
                      <p className="text-[9px] text-[#0F172A]/70 leading-relaxed">{analysis.risk_factors}</p>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {session.summary && (
                  <div className="p-3 border-2 border-black bg-[#F8FAFC] rounded-xl">
                    <p className="text-[9px] font-mono text-[#0F172A]/70 leading-relaxed">{session.summary}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
