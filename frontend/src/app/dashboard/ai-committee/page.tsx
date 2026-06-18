"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Database, 
  Globe, 
  LineChart, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  History,
  TrendingDown,
  X,
  BookOpen,
  ChevronRight,
  ChevronDown
} from "lucide-react";

interface AgentDetails {
  name: string;
  icon: any;
  color: string;
  borderColor: string;
  desc: string;
}

const AGENT_CONFIGS: Record<string, AgentDetails> = {
  "Research Agent": {
    name: "Research Agent",
    icon: Database,
    color: "bg-blue-100 text-blue-800 border-blue-400",
    borderColor: "border-blue-500",
    desc: "Analyzes intrinsic corporate valuations, balance sheet health, P/E, EPS, and revenue scaling metrics."
  },
  "Technical Agent": {
    name: "Technical Agent",
    icon: LineChart,
    color: "bg-indigo-100 text-indigo-800 border-indigo-400",
    borderColor: "border-indigo-500",
    desc: "Monitors momentum, volume trends, daily price changes, and positioning relative to 52-week boundaries."
  },
  "News Agent": {
    name: "News Agent",
    icon: Globe,
    color: "bg-sky-100 text-sky-800 border-sky-400",
    borderColor: "border-sky-500",
    desc: "Scrapes media streams, earnings reports, and social/options sentiment trends in real time."
  },
  "Risk Agent": {
    name: "Risk Agent",
    icon: ShieldCheck,
    color: "bg-slate-100 text-slate-800 border-slate-400",
    borderColor: "border-slate-500",
    desc: "Measures debt structures, capital allocation risks, multiple expansion bubbles, and industry headwinds."
  },
  "Committee Agent": {
    name: "Committee Agent",
    icon: Cpu,
    color: "bg-emerald-100 text-emerald-800 border-emerald-400",
    borderColor: "border-emerald-500",
    desc: "Synthesizes agent signals via a weighted framework to yield the final consensus verdict and target price."
  }
};

const AGENT_NAMES = ["Research Agent", "Technical Agent", "News Agent", "Risk Agent", "Committee Agent"];

export default function AICommitteePage() {
  const { getToken, isSignedIn } = useAuth();
  const [ticker, setTicker] = useState("NVDA");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState("");
  const [agentStatus, setAgentStatus] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"debate" | "report">("debate");
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  // Load history on mount
  useEffect(() => {
    if (isSignedIn) {
      fetchHistory();
    }
  }, [isSignedIn, ticker]);

  async function fetchHistory() {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/analysis/history?ticker=${ticker.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }

  async function fetchLogs(id: string) {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/analysis/${id}/logs?ticker=${ticker.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  }

  async function fetchReport(id: string) {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/analysis/${id}/report?ticker=${ticker.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setActiveTab("report");
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
    }
  }

  function pollStatus(id: string) {
    const interval = setInterval(async () => {
      try {
        const token = await getToken();
        const resStatus = await fetch(`/api/v1/analysis/${id}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resStatus.ok) throw new Error("Failed to retrieve status");
        
        const statusData = await resStatus.json();
        setStatus(statusData.status);
        setProgress(statusData.progress_percent);
        setCurrentAgent(statusData.current_agent);
        setAgentStatus(statusData.agent_status);

        // Fetch logs incrementally
        await fetchLogs(id);

        if (statusData.status === "completed") {
          clearInterval(interval);
          await fetchReport(id);
          setIsAnalyzing(false);
          fetchHistory();
        } else if (statusData.status === "failed") {
          clearInterval(interval);
          setIsAnalyzing(false);
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(interval);
        setStatus("failed");
        setIsAnalyzing(false);
      }
    }, 1500);
  }

  const handleStartAnalysis = async (customTicker?: string, forceRefresh = false) => {
    const targetTicker = (customTicker || ticker).toUpperCase();
    if (!targetTicker) return;

    setTicker(targetTicker);
    setIsAnalyzing(true);
    setReport(null);
    setLogs([]);
    setStatus("pending");
    setProgress(0);
    setCurrentAgent("Research Agent");
    setAgentStatus("waiting");
    setActiveTab("debate");

    try {
      const token = await getToken();
      const res = await fetch("/api/v1/analysis/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ticker: targetTicker, symbol: targetTicker, force_refresh: forceRefresh })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to start analysis");
      }

      const data = await res.json();
      setSessionId(data.session_id);

      if (data.status === "cached") {
        // Fast-path: display cached outputs immediately
        setStatus("completed");
        setProgress(100);
        setCurrentAgent("Committee Agent");
        setAgentStatus("completed");
        await fetchLogs(data.session_id);
        await fetchReport(data.session_id);
        setIsAnalyzing(false);
        fetchHistory();
      } else {
        pollStatus(data.session_id);
      }
    } catch (err: any) {
      console.error(err);
      setStatus("failed");
      setAgentStatus("error");
      setIsAnalyzing(false);
    }
  };

  const getAgentState = (agentName: string) => {
    if (status === "failed") return "failed";
    if (status === "pending" || !status) return "queued";

    if (agentName === "Committee Agent") {
      const hasCommLog = logs.some(l => l.agent_name === "Committee Agent");
      if (hasCommLog) return "completed";
      if (currentAgent === "Committee Agent") return "running";
      return "queued";
    }

    const hasR2 = logs.some(l => l.agent_name === agentName && l.round === 2);
    if (hasR2) return "completed";

    if (currentAgent === agentName) {
      return "running";
    }

    const hasR1 = logs.some(l => l.agent_name === agentName && l.round === 1);
    if (hasR1) return "running"; // waiting or processing round 2

    return "queued";
  };

  const getAgentLogs = (agentName: string) => {
    const agentLogs = logs.filter(l => l.agent_name === agentName);
    const r1Log = agentLogs.find(l => l.round === 1);
    const r2Log = agentLogs.find(l => l.round === 2);
    const r3Log = agentLogs.find(l => l.round === 3);
    return { r1Log, r2Log, r3Log };
  };

  const getSignalBadgeClass = (signal: string) => {
    switch (signal?.toUpperCase()) {
      case "BUY":
        return "bg-green-100 text-green-800 border-green-400";
      case "SELL":
        return "bg-red-100 text-red-800 border-red-400";
      default:
        return "bg-amber-100 text-amber-800 border-amber-400";
    }
  };

  const getStatusText = () => {
    if (status === "pending") return "Preparing environment nodes...";
    if (status === "running") {
      if (agentStatus === "thinking") return `Executing Round 1: ${currentAgent} independent review`;
      if (agentStatus === "revising") return `Executing Round 2: ${currentAgent} cross-agent review`;
      if (agentStatus === "aggregating") return `Executing Round 3: Committee consensus synthesis`;
      return `Agent Coordination in progress...`;
    }
    if (status === "completed") return "Consensus resolved successfully.";
    if (status === "failed") return "Committee workflow aborted due to an error.";
    return "Ready to initiate agent analysis.";
  };

  // Group debate logs by rounds
  const round1Logs = logs.filter(l => l.round === 1);
  const round2Logs = logs.filter(l => l.round === 2);
  const round3Logs = logs.filter(l => l.round === 3);

  // Check if an agent changed their signal between Round 1 and Round 2
  const checkRevision = (agentName: string) => {
    const agentLogs = logs.filter(l => l.agent_name === agentName);
    const r1 = agentLogs.find(l => l.round === 1)?.signal;
    const r2 = agentLogs.find(l => l.round === 2)?.signal;
    return r1 && r2 && r1 !== r2;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 text-black">
      {/* Brutalist Header Block */}
      <div className="bg-white border-3 md:border-4 border-black p-6 md:p-8 rounded-none shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">AI Committee War Room</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Multi-Agent Debate Terminal</p>
            </div>
          </div>
        </div>

        {/* Input & Action Panel */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input 
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            disabled={isAnalyzing}
            placeholder="TICKER"
            className="w-24 border-3 border-black p-3 font-bold text-center text-lg focus:outline-none uppercase bg-white shadow-[2px_2px_0px_#000000] focus:shadow-[4px_4px_0px_#000000] transition-all"
          />
          <button
            onClick={() => handleStartAnalysis()}
            disabled={isAnalyzing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#2563EB] text-white border-3 border-black font-black uppercase px-6 py-3 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isAnalyzing ? "Analyzing..." : "Analyze Stock"}</span>
          </button>
          
          <button
            onClick={() => handleStartAnalysis(undefined, true)}
            disabled={isAnalyzing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-500 text-white border-3 border-black font-black uppercase px-6 py-3 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            title="Bypass cache and force rerun committee debate"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Force Refresh</span>
          </button>
          
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="bg-white border-3 border-black p-3 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition-all"
            title="Analysis History"
          >
            <History className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Progress & Pipeline Status */}
      {status && (
        <div className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_#000000] space-y-3">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider font-mono">
            <span className="flex items-center gap-2 text-blue-600">
              {status === "completed" && <CheckCircle2 className="w-4 h-4" />}
              {status === "failed" && <XCircle className="w-4 h-4 text-red-600" />}
              {status !== "completed" && status !== "failed" && <span className="animate-pulse">●</span>}
              {getStatusText()}
            </span>
            <span>{progress}% Complete</span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-black overflow-hidden relative">
            <motion.div 
              className="h-full bg-blue-600 border-r-2 border-black"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Agents State Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {AGENT_NAMES.map((agentName) => {
          const config = AGENT_CONFIGS[agentName];
          const state = getAgentState(agentName);
          const { r1Log, r2Log, r3Log } = getAgentLogs(agentName);
          const activeLog = r3Log || r2Log || r1Log;

          return (
            <div 
              key={agentName}
              className={`bg-white border-3 border-black p-4 shadow-[4px_4px_0px_#000000] relative flex flex-col justify-between min-h-[200px] transition-all ${
                state === "running" ? "ring-3 ring-blue-500 shadow-[6px_6px_0px_#000000]" : ""
              } ${state === "queued" ? "opacity-60" : ""}`}
            >
              {/* Top Row with Icon & State */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 border-2 border-black shadow-[2px_2px_0px_#000000] bg-white`}>
                    <config.icon className="w-6 h-6" />
                  </div>
                  <div className="text-[10px] font-black uppercase font-mono tracking-wider">
                    {state === "queued" && <span className="text-gray-400">QUEUED</span>}
                    {state === "running" && <span className="text-blue-600 animate-pulse">RUNNING</span>}
                    {state === "completed" && <span className="text-green-600">COMPLETED</span>}
                    {state === "failed" && <span className="text-red-600">FAILED</span>}
                  </div>
                </div>

                {/* Agent Header */}
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-tight">{config.name}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{agentName === "Committee Agent" ? "Synthesis Node" : "Specialist Node"}</p>
                </div>

                {/* Description */}
                {state === "queued" && (
                  <p className="text-[11px] text-gray-500 leading-tight">{config.desc}</p>
                )}

                {/* Live Output */}
                {state !== "queued" && activeLog && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 border border-black ${getSignalBadgeClass(activeLog.signal || activeLog.message_type)}`}>
                        {activeLog.signal || activeLog.message_type}
                      </span>
                      {activeLog.confidence_score > 0 && (
                        <span className="text-[10px] font-bold font-mono">
                          {activeLog.confidence_score}% CONF
                        </span>
                      )}
                    </div>

                    {checkRevision(agentName) && (
                      <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000000] animate-bounce">
                        REVISED SIGNAL
                      </span>
                    )}

                    {activeLog.evidence && (
                      <div className="text-[10px] text-gray-600 space-y-0.5">
                        <span className="font-bold uppercase tracking-wider block text-[9px]">Evidence Node:</span>
                        <ul className="list-disc pl-3 leading-tight space-y-0.5">
                          {activeLog.evidence.split(",").slice(0, 2).map((item: string, idx: number) => (
                            <li key={idx} className="truncate">{item.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Tabs Container */}
      {status && status !== "pending" && (
        <div className="space-y-6">
          {/* Brutalist Tab Header */}
          <div className="flex border-b-3 border-black">
            <button
              onClick={() => setActiveTab("debate")}
              className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-t-3 border-x-3 border-black -mb-[3px] transition-all relative ${
                activeTab === "debate" 
                  ? "bg-white z-10 translate-y-0" 
                  : "bg-gray-100 hover:bg-gray-50 translate-y-[2px]"
              }`}
            >
              Debate Feed
            </button>
            <button
              onClick={() => {
                if (report) setActiveTab("report");
              }}
              disabled={!report}
              className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-t-3 border-x-3 border-black -mb-[3px] transition-all relative ${
                !report ? "opacity-45 cursor-not-allowed" : "cursor-pointer"
              } ${
                activeTab === "report" 
                  ? "bg-white z-10 translate-y-0" 
                  : "bg-gray-100 hover:bg-gray-50 translate-y-[2px]"
              }`}
            >
              Consensus Report
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_#000000]">
            <AnimatePresence mode="wait">
              {activeTab === "debate" && (
                <motion.div
                  key="debate"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Round 1: Independent Analysis */}
                  <div className="space-y-4">
                    <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                      <h2 className="text-sm font-black uppercase tracking-widest font-mono text-gray-500">
                        Round 1 — Independent Specialists Analysis
                      </h2>
                      {round1Logs.length > 0 && (
                        <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 border border-blue-400">
                          LOGGED ({round1Logs.length}/4)
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {round1Logs.length === 0 ? (
                        <p className="text-xs italic text-gray-400">Awaiting specialist initial ratings...</p>
                      ) : (
                        round1Logs.map((log) => {
                          const config = AGENT_CONFIGS[log.agent_name];
                          return (
                            <div key={log.id} className="border-2 border-black p-4 flex gap-4 bg-gray-50">
                              <div className="shrink-0">
                                <div className="p-2 border border-black bg-white">
                                  <config.icon className="w-5 h-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="font-bold text-xs uppercase tracking-tight">{log.agent_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-black ${getSignalBadgeClass(log.signal)}`}>
                                      {log.signal}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold">{log.confidence_score}% CONF</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed font-mono">{log.message}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Round 2: Cross-Agent Review */}
                  {progress >= 40 && (
                    <div className="space-y-4">
                      <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest font-mono text-gray-500">
                          Round 2 — Peer Cross-Agent Review & Signal Refinement
                        </h2>
                        {round2Logs.length > 0 && (
                          <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 border border-amber-400">
                            DEBATING ({round2Logs.length}/4)
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {round2Logs.length === 0 ? (
                          <p className="text-xs italic text-gray-400">Spawning cross-agent review calculations...</p>
                        ) : (
                          round2Logs.map((log) => {
                            const config = AGENT_CONFIGS[log.agent_name];
                            const isRevised = checkRevision(log.agent_name);
                            const r1Signal = logs.find(l => l.agent_name === log.agent_name && l.round === 1)?.signal;

                            return (
                              <div 
                                key={log.id} 
                                className={`border-2 border-black p-4 flex gap-4 ${
                                  isRevised ? "bg-amber-50/50 border-amber-500" : "bg-gray-50"
                                }`}
                              >
                                <div className="shrink-0">
                                  <div className="p-2 border border-black bg-white">
                                    <config.icon className="w-5 h-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="font-bold text-xs uppercase tracking-tight">{log.agent_name}</span>
                                    <div className="flex items-center gap-2">
                                      {isRevised && (
                                        <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000000] tracking-wider">
                                          REVISED: {r1Signal} ➔ {log.signal}
                                        </span>
                                      )}
                                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-black ${getSignalBadgeClass(log.signal)}`}>
                                        {log.signal}
                                      </span>
                                      <span className="text-[9px] font-mono font-bold">{log.confidence_score}% CONF</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-700 leading-relaxed font-mono">{log.message}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Round 3: Committee Resolution */}
                  {progress >= 90 && (
                    <div className="space-y-4">
                      <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest font-mono text-gray-500">
                          Round 3 — Final Committee Resolution
                        </h2>
                        {round3Logs.length > 0 && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-400">
                            RESOLVED
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {round3Logs.length === 0 ? (
                          <p className="text-xs italic text-gray-400">Computing consensus voting algorithms...</p>
                        ) : (
                          round3Logs.map((log) => {
                            const config = AGENT_CONFIGS[log.agent_name];
                            return (
                              <div key={log.id} className="border-3 border-black p-5 flex gap-4 bg-emerald-50/35 border-emerald-500 shadow-[3px_3px_0px_#047857]">
                                <div className="shrink-0">
                                  <div className="p-2.5 border-2 border-black bg-white">
                                    <config.icon className="w-6 h-6 text-emerald-600" />
                                  </div>
                                </div>
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="font-black text-sm uppercase tracking-tight text-emerald-900">{log.agent_name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-black uppercase px-2 py-0.5 border-2 border-black ${getSignalBadgeClass(log.signal)}`}>
                                        {log.signal}
                                      </span>
                                      <span className="text-xs font-mono font-bold">{log.confidence_score}% CONF</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-800 leading-relaxed font-mono font-bold">{log.message}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "report" && report && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Verdict & Upside Block */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border-3 border-black p-5 bg-white shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono">Verdict</span>
                      <div className="space-y-2 py-3">
                        <span className={`text-3xl font-black uppercase px-3 py-1 border-2 border-black shadow-[2px_2px_0px_#000000] inline-block ${getSignalBadgeClass(report.recommendation)}`}>
                          {report.recommendation}
                        </span>
                        <div className="text-xs font-bold text-gray-500 font-mono uppercase tracking-wide">
                          Confidence Score: {report.confidence_score}%
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 leading-tight uppercase font-mono font-bold">
                        Calculated via weighted debate
                      </div>
                    </div>

                    <div className="border-3 border-black p-5 bg-white shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono">12M Target Price</span>
                      <div className="space-y-1 py-3">
                        <div className="text-3xl font-black font-mono">
                          ${report.target_price?.toFixed(2)}
                        </div>
                        <div className="text-xs font-bold text-gray-500 font-mono uppercase tracking-wide">
                          Weighted pricing model
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 leading-tight uppercase font-mono font-bold">
                        PE Ratio & momentum adjusted
                      </div>
                    </div>

                    <div className="border-3 border-black p-5 bg-white shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono">Projected Return</span>
                      <div className="space-y-1 py-3">
                        <div className={`text-3xl font-black font-mono flex items-center gap-1.5 ${
                          report.upside_pct >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {report.upside_pct >= 0 ? "+" : ""}
                          {report.upside_pct}%
                          {report.upside_pct >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                        <div className="text-xs font-bold text-gray-500 font-mono uppercase tracking-wide">
                          Upside vs Current Price
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 leading-tight uppercase font-mono font-bold">
                        12-month projection scale
                      </div>
                    </div>
                  </div>

                  {/* Voting Breakdown meters */}
                  <div className="border-2 border-black p-4 bg-gray-50 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono block">
                      Committee Weighted Contribution Breakdown
                    </span>
                    <div className="space-y-3">
                      {report.vote_result?.breakdown?.map((v: any) => {
                        const signalVal = v.signal === "BUY" ? 1 : v.signal === "SELL" ? -1 : 0;
                        const score = signalVal * v.weight;
                        // Score ranges from -0.25 to +0.25
                        const percentage = ((score + 0.25) / 0.5) * 100;

                        return (
                          <div key={v.agent} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="uppercase">{v.agent} ({v.weight * 100}% Weight)</span>
                              <span className="uppercase text-gray-600">
                                Vote: {v.signal} (Conf: {v.confidence}%)
                              </span>
                            </div>
                            <div className="h-4 bg-gray-200 border-2 border-black relative overflow-hidden">
                              {/* Zero index marker */}
                              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-black z-10" />
                              <div 
                                className={`h-full border-r border-black absolute ${
                                  score > 0 ? "bg-green-500 left-1/2" : score < 0 ? "bg-red-500 right-1/2" : "bg-amber-400 left-1/2"
                                }`}
                                style={{
                                  width: score > 0 
                                    ? `${(score / 0.25) * 50}%` 
                                    : score < 0 
                                      ? `${(Math.abs(score) / 0.25) * 50}%` 
                                      : "0px"
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accordion Detail Sections */}
                  <div className="space-y-4">
                    {/* Executive Summary */}
                    <div className="border-2 border-black bg-white">
                      <button
                        onClick={() => setExpandedSection(expandedSection === "summary" ? null : "summary")}
                        className="w-full p-4 flex justify-between items-center font-black uppercase text-xs tracking-wider border-b-2 border-black bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          Executive Audit Summary
                        </span>
                        {expandedSection === "summary" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <AnimatePresence initial={false}>
                        {expandedSection === "summary" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="p-5 text-xs leading-relaxed font-mono text-gray-700">
                              {report.executive_summary}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Bull & Bear Cases */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bull Case */}
                      <div className="border-2 border-black bg-white">
                        <div className="p-4 font-black uppercase text-xs tracking-wider border-b-2 border-black bg-green-50 text-green-900 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Committee Bull Case
                        </div>
                        <div className="p-5 space-y-3">
                          {report.bull_case?.split(". ").filter(Boolean).map((pt: string, i: number) => (
                            <div key={i} className="flex gap-2.5 items-start text-xs font-mono text-gray-700">
                              <span className="text-green-600 font-bold">✓</span>
                              <span>{pt.trim()}{pt.endsWith(".") ? "" : "."}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bear Case */}
                      <div className="border-2 border-black bg-white">
                        <div className="p-4 font-black uppercase text-xs tracking-wider border-b-2 border-black bg-red-50 text-red-900 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Committee Bear Case
                        </div>
                        <div className="p-5 space-y-3">
                          {report.bear_case?.split(". ").filter(Boolean).map((pt: string, i: number) => (
                            <div key={i} className="flex gap-2.5 items-start text-xs font-mono text-gray-700">
                              <span className="text-red-600 font-bold">✗</span>
                              <span>{pt.trim()}{pt.endsWith(".") ? "" : "."}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Specialist Detailed Summaries Accordion */}
                    <div className="border-2 border-black bg-white">
                      <button
                        onClick={() => setExpandedSection(expandedSection === "findings" ? null : "findings")}
                        className="w-full p-4 flex justify-between items-center font-black uppercase text-xs tracking-wider border-b-2 border-black bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-blue-600" />
                          Detailed Agent Findings Logs
                        </span>
                        {expandedSection === "findings" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <AnimatePresence initial={false}>
                        {expandedSection === "findings" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden divide-y-2 divide-black"
                          >
                            <div className="p-4 space-y-1">
                              <h4 className="text-[10px] font-black uppercase text-blue-800">Research Agent Valuation Log</h4>
                              <p className="text-xs font-mono text-gray-600">{report.research_findings || "No log registered."}</p>
                            </div>
                            <div className="p-4 space-y-1">
                              <h4 className="text-[10px] font-black uppercase text-indigo-800">Technical Agent Charting Log</h4>
                              <p className="text-xs font-mono text-gray-600">{report.technical_findings || "No log registered."}</p>
                            </div>
                            <div className="p-4 space-y-1">
                              <h4 className="text-[10px] font-black uppercase text-sky-800">News Agent Sentiment Log</h4>
                              <p className="text-xs font-mono text-gray-600">{report.news_findings || "No log registered."}</p>
                            </div>
                            <div className="p-4 space-y-1">
                              <h4 className="text-[10px] font-black uppercase text-slate-800">Risk Agent Stress Log</h4>
                              <p className="text-xs font-mono text-gray-600">{report.risk_findings || "No log registered."}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Meta & Horizon Details */}
                    <div className="border-2 border-black p-4 bg-gray-50 flex flex-col md:flex-row justify-between gap-4 text-xs font-bold font-mono">
                      <div>
                        <span className="uppercase text-gray-400 block text-[10px]">Investment Horizon</span>
                        <span className="uppercase text-gray-800">{report.investment_horizon}</span>
                      </div>
                      <div>
                        <span className="uppercase text-gray-400 block text-[10px]">Audit Execution ID</span>
                        <span className="uppercase text-gray-800 truncate block max-w-xs">{report.id}</span>
                      </div>
                      <div>
                        <span className="uppercase text-gray-400 block text-[10px]">Timestamp</span>
                        <span className="uppercase text-gray-800">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* History Drawer Component */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l-4 border-black z-50 p-6 flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-6 overflow-y-auto flex-1">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b-3 border-black pb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    <h2 className="text-lg font-black uppercase">Advisory History</h2>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 border-2 border-black hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* History Ticker Filter info */}
                <div className="text-[10px] font-black uppercase text-gray-400 font-mono tracking-wider">
                  Past sessions resolved for {ticker.toUpperCase()}
                </div>

                {/* History List */}
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-gray-500 uppercase">No past audits detected.</p>
                      <p className="text-[10px] text-gray-400 font-mono leading-tight">Run an analysis to log reports in your profile cache.</p>
                    </div>
                  ) : (
                    history.map((session) => {
                      const age = Math.round((Date.now() - new Date(session.created_at).getTime()) / 60000); // age in minutes
                      const isCacheValid = age < 20 && session.status === "completed";

                      return (
                        <div 
                          key={session.id}
                          onClick={() => {
                            setSessionId(session.id);
                            setStatus(session.status);
                            setProgress(session.progress_percent);
                            setCurrentAgent(session.current_agent);
                            setAgentStatus(session.agent_status);
                            fetchLogs(session.id);
                            if (session.status === "completed") {
                              fetchReport(session.id);
                            } else {
                              pollStatus(session.id);
                            }
                            setIsDrawerOpen(false);
                          }}
                          className="border-2 border-black p-4 bg-white hover:bg-gray-50 cursor-pointer shadow-[3px_3px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#000000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-sm block">{session.ticker}</span>
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                                {new Date(session.created_at).toLocaleString()}
                              </span>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black ${getSignalBadgeClass(session.recommendation)}`}>
                              {session.recommendation}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-gray-500 uppercase">
                              Status: {session.status} ({session.progress_percent}%)
                            </span>
                            {isCacheValid ? (
                              <span className="text-green-600 font-black uppercase tracking-wider">
                                Cached (Active)
                              </span>
                            ) : (
                              <span className="text-gray-400 font-black uppercase tracking-wider">
                                Expired
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              {history.length > 0 && (
                <div className="border-t-3 border-black pt-4 mt-6">
                  <button
                    onClick={() => {
                      handleStartAnalysis();
                      setIsDrawerOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white border-3 border-black font-black uppercase px-4 py-3 hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Re-Analyze Ticker (Force Run)</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
