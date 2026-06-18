"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useWebSocketStore } from "@/lib/websocketStore";
import { 
  Bot, 
  MessageSquare, 
  Cpu, 
  Database, 
  Globe, 
  LineChart, 
  ShieldCheck, 
  TrendingUp,
  Award,
  Clock,
  Briefcase,
  ArrowLeft,
  CheckCircle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisLog {
  id?: string;
  ticker: string;
  agent_name: string;
  message: string;
  message_type: string;
  confidence_score: number;
  created_at: string;
}

interface AnalysisDetails {
  id: string;
  ticker: string;
  status: string;
  company_name: string;
  recommendation: string;
  confidence_score: number;
  risk_level: string;
  summary: string;
  created_at: string;
  updated_at: string;
  research_vote?: string;
  technical_vote?: string;
  news_vote?: string;
  risk_vote?: string;
  valuation_vote?: string;
  research_summary?: string;
  technical_summary?: string;
  news_summary?: string;
  risk_summary?: string;
  valuation_summary?: string;
}

export default function CommitteeRoomPage({ params }: { params: { analysisId: string } }) {
  const resolvedParams = (params as any) instanceof Promise ? (React as any).use(params) : params;
  const analysisId = resolvedParams?.analysisId;

  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  
  // Local states
  const [details, setDetails] = useState<AnalysisDetails | null>(null);
  const [messages, setMessages] = useState<AnalysisLog[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, string>>({
    "Research Agent": "idle",
    "Technical Agent": "idle",
    "News Agent": "idle",
    "Risk Agent": "idle",
    "Portfolio Agent": "idle",
    "Committee Agent": "idle",
  });
  const [loading, setLoading] = useState(true);

  const socketConnected = useWebSocketStore((state) => state.connected);
  const connectSocket = useWebSocketStore((state) => state.connect);
  const subscribeSocket = useWebSocketStore((state) => state.subscribe);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch initial details and message history
  useEffect(() => {
    async function fetchData() {
      if (!analysisId || !isSignedIn) return;
      try {
        const token = await getToken();
        
        // 1. Fetch Analysis Details
        const detailsRes = await fetch(`/api/v1/analysis/${analysisId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!detailsRes.ok) throw new Error("Analysis not found");
        const detailsData = await detailsRes.json();
        setDetails(detailsData);

        // 2. Fetch Logs/Messages
        const logsRes = await fetch(`/api/v1/analysis/${analysisId}/logs`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setMessages(logsData || []);

          // Sync initial agent states based on message history
          const states: Record<string, string> = {
            "Research Agent": "idle",
            "Technical Agent": "idle",
            "News Agent": "idle",
            "Risk Agent": "idle",
            "Portfolio Agent": "idle",
            "Committee Agent": "idle",
          };
          
          let lastCompletedIndex = -1;
          const agentOrder = [
            "Research Agent",
            "Technical Agent",
            "News Agent",
            "Risk Agent",
            "Portfolio Agent",
            "Committee Agent"
          ];

          (logsData || []).forEach((m: AnalysisLog) => {
            states[m.agent_name] = "completed";
            const idx = agentOrder.indexOf(m.agent_name);
            if (idx > lastCompletedIndex) {
              lastCompletedIndex = idx;
            }
          });

          // If session is still running, set the next agent after the last completed as thinking
          if (detailsData.status === "running" && lastCompletedIndex < agentOrder.length - 1) {
            states[agentOrder[lastCompletedIndex + 1]] = "thinking";
          }
          
          setAgentStates((prev) => ({ ...prev, ...states }));
        }
      } catch (err) {
        console.error("[COMMITTEE-FETCH-ERR]", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [analysisId, getToken, isSignedIn]);

  // Connect WebSocket and subscribe to events
  useEffect(() => {
    if (!isSignedIn) return;
    async function initSocket() {
      const token = await getToken();
      connectSocket(token);
    }
    initSocket();
  }, [getToken, connectSocket, isSignedIn]);

  useEffect(() => {
    if (!socketConnected || !analysisId) return;

    // Handle WebSocket events
    const unsubStarted = subscribeSocket("analysis_started", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setDetails((prev) => prev ? { ...prev, ticker: payload.ticker, status: "running" } : {
          id: analysisId,
          ticker: payload.ticker,
          status: "running",
          company_name: payload.ticker,
          recommendation: "HOLD",
          confidence_score: 0,
          risk_level: "MEDIUM",
          summary: "Analysis started...",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setAgentStates({
          "Research Agent": "thinking",
          "Technical Agent": "idle",
          "News Agent": "idle",
          "Risk Agent": "idle",
          "Portfolio Agent": "idle",
          "Committee Agent": "idle",
        });
      }
    });

    const unsubAgentStarted = subscribeSocket("agent_started", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setAgentStates((prev) => ({ ...prev, [payload.agent_name]: "thinking" }));
      }
    });

    const unsubAgentMessage = subscribeSocket("agent_message", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.agent_name === payload.agent_name && m.message === payload.message);
          if (exists) return prev;
          return [...prev, {
            id: event.id || Math.random().toString(),
            ticker: payload.ticker || "",
            agent_name: payload.agent_name,
            message: payload.message,
            message_type: payload.message_type,
            confidence_score: payload.confidence_score,
            created_at: event.timestamp || new Date().toISOString(),
          }];
        });
        setAgentStates((prev) => ({ ...prev, [payload.agent_name]: "active" }));
      }
    });

    const unsubAgentCompleted = subscribeSocket("agent_completed", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setAgentStates((prev) => {
          const newStates: Record<string, string> = { ...prev, [payload.agent_name]: "completed" };
          // Determine the next agent and set to thinking
          const agentOrder = [
            "Research Agent",
            "Technical Agent",
            "News Agent",
            "Risk Agent",
            "Portfolio Agent",
            "Committee Agent"
          ];
          const currentIdx = agentOrder.indexOf(payload.agent_name);
          if (currentIdx !== -1 && currentIdx < agentOrder.length - 1) {
            newStates[agentOrder[currentIdx + 1]] = "thinking";
          }
          return newStates;
        });
      }
    });

    const unsubDecision = subscribeSocket("recommendation_generated", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setDetails((prev: any) => prev ? {
          ...prev,
          recommendation: payload.recommendation,
          confidence_score: payload.confidence_score,
          target_price: payload.target_price,
        } : null);
      }
    });

    const unsubCompleted = subscribeSocket("analysis_completed", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setDetails((prev: any) => prev ? {
          ...prev,
          status: "completed",
          recommendation: payload.recommendation,
          confidence_score: payload.confidence_score,
          summary: payload.summary,
        } : {
          id: analysisId,
          ticker: payload.ticker,
          status: "completed",
          company_name: payload.ticker,
          recommendation: payload.recommendation,
          confidence_score: payload.confidence_score,
          risk_level: "MEDIUM",
          summary: payload.summary,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setAgentStates({
          "Research Agent": "completed",
          "Technical Agent": "completed",
          "News Agent": "completed",
          "Risk Agent": "completed",
          "Portfolio Agent": "completed",
          "Committee Agent": "completed",
        });
      }
    });

    return () => {
      unsubStarted();
      unsubAgentStarted();
      unsubAgentMessage();
      unsubAgentCompleted();
      unsubDecision();
      unsubCompleted();
    };
  }, [socketConnected, subscribeSocket, analysisId]);

  const agentConfig = [
    { name: "Research Agent", icon: Database, color: "#2563EB", label: "Research" },
    { name: "Technical Agent", icon: LineChart, color: "#3B82F6", label: "Technical" },
    { name: "News Agent", icon: Globe, color: "#60A5FA", label: "Sentiment" },
    { name: "Risk Agent", icon: ShieldCheck, color: "#F59E0B", label: "Risk Audit" },
    { name: "Portfolio Agent", icon: Briefcase, color: "#EC4899", label: "Portfolio Fit" },
    { name: "Committee Agent", icon: Cpu, color: "#10B981", label: "Consensus" },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#64748B] font-bold">
            Connecting to Committee Room...
          </span>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-white border-4 border-black p-12 text-center max-w-md rounded-[24px] shadow-[6px_6px_0px_#000000]">
          <h3 className="text-lg font-black uppercase text-red-500">Error Loading Room</h3>
          <p className="text-xs font-mono font-bold text-black/50 tracking-wide mt-2">
            The requested AI Committee Session Room could not be located in the terminal database registry.
          </p>
          <button 
            onClick={() => router.push("/dashboard/ai-committee")}
            className="mt-6 flex items-center justify-center gap-2 bg-[#2563EB] text-white border-3 border-black rounded-xl py-2.5 px-5 text-xs font-black uppercase shadow-[3px_3px_0px_#000000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all cursor-pointer w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to War Room</span>
          </button>
        </div>
      </div>
    );
  }

  const getVoteColor = (vote: string) => {
    switch (vote?.toUpperCase()) {
      case "BUY":
      case "STRONG BUY":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "HOLD":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "SELL":
      case "STRONG SELL":
        return "bg-rose-100 text-rose-700 border-rose-300";
      default:
        return "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8"
    >
      {/* Header Block */}
      <section className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/dashboard/ai-committee")}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#2563EB] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-full font-black text-[#2563EB]">
              Committee Room
            </span>
            <span className={`font-mono text-[8px] uppercase tracking-widest px-2.5 py-0.5 rounded border-2 border-black font-extrabold ${
              details.status === "completed" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600 animate-pulse"
            }`}>
              {details.status}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A]">
            {details.ticker} ({details.company_name}) Consensus Audit
          </h1>
          <p className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Session ID: {details.id}</span>
          </p>
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_#000000]">
        <h4 className="text-xs font-black uppercase tracking-wider text-black/50 border-b border-black/10 pb-2.5 mb-6 font-mono">
          Multi-Agent Pipeline Stream (6-Agent Sequence)
        </h4>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">
          {agentConfig.map((agent, idx) => {
            const Icon = agent.icon;
            const status = agentStates[agent.name] || "idle";
            
            const isThinking = status === "thinking";
            const isActive = status === "active" || status === "analyzing";
            const isCompleted = status === "completed";
            
            let bgClass = "bg-slate-100 border-slate-300 text-slate-400";
            let glowClass = "";
            if (isThinking) {
              bgClass = "bg-amber-100 border-amber-500 text-amber-500 border-3";
              glowClass = "shadow-[0_0_12px_rgba(245,158,11,0.4)]";
            } else if (isActive) {
              bgClass = "bg-blue-100 border-blue-500 text-blue-600 border-3";
              glowClass = "shadow-[0_0_12px_rgba(59,130,246,0.4)]";
            } else if (isCompleted) {
              bgClass = "bg-emerald-100 border-emerald-500 text-emerald-600 border-2";
            }

            return (
              <React.Fragment key={agent.name}>
                <div className="flex flex-col items-center gap-2 relative z-10 w-full md:w-auto">
                  <div className={`w-14 h-14 rounded-full border-3 border-black flex items-center justify-center relative shadow-[3px_3px_0px_#000000] ${bgClass} ${glowClass} transition-all duration-300`}>
                    <Icon className={`w-6 h-6 ${isThinking || isActive ? "animate-pulse" : ""}`} />
                    
                    {/* Status Dot */}
                    {(isThinking || isActive || isCompleted) && (
                      <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black ${
                        isCompleted ? "bg-emerald-500" :
                        isThinking ? "bg-amber-500" : "bg-blue-500"
                      }`} />
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase text-[#0F172A] tracking-tight">{agent.label}</span>
                  <span className="text-[8px] font-mono text-black/45 uppercase tracking-widest">{status}</span>
                </div>

                {/* Connecting line */}
                {idx < agentConfig.length - 1 && (
                  <div className="hidden md:block h-1 flex-grow bg-black border-y border-black relative z-0">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ 
                      width: isCompleted ? "100%" : isActive || isThinking ? "50%" : "0%"
                    }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Split Panel Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left panel: Conversation Feed (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-4 bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] min-h-[500px]">
          <h3 className="text-xs font-black uppercase tracking-wider text-black/50 border-b border-black/10 pb-3 flex items-center gap-2 font-mono">
            <MessageSquare className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Room Communication Stream</span>
          </h3>

          <div className="flex-grow flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1 mt-4">
            {messages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-3">
                <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
                <span className="font-mono text-xs uppercase tracking-widest text-[#64748B] font-bold">
                  Waiting for agents to initiate analysis...
                </span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const agent = agentConfig.find((a) => a.name === msg.agent_name);
                  const Icon = agent ? agent.icon : Bot;
                  
                  return (
                    <motion.div
                      key={msg.id || `${msg.agent_name}-${msg.created_at}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3.5 p-4 border-3 border-black rounded-2xl bg-[#F8FAFC] shadow-[2.5px_2.5px_0px_#000000] hover:translate-y-[-1px] transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] shrink-0" style={{ color: agent?.color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5 mb-2">
                          <span className="text-xs font-black text-[#0F172A] uppercase">{msg.agent_name}</span>
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border border-black/10 uppercase tracking-widest ${getVoteColor(msg.message_type)}`}>
                            {msg.message_type || "ANALYSIS"}
                          </span>
                        </div>
                        <p className="text-xs text-[#0F172A] font-medium leading-relaxed font-mono whitespace-pre-wrap">
                          {msg.message}
                        </p>
                        {msg.confidence_score > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] font-mono text-black/45 uppercase tracking-widest">Confidence Score:</span>
                            <span className="text-[9px] font-mono font-black text-[#2563EB]">{msg.confidence_score}%</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right panel: Consensus Results (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Consensus Decision Card */}
          <section className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] flex flex-col gap-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/50 border-b border-black/10 pb-3 flex items-center gap-2 font-mono">
              <Award className="w-4.5 h-4.5 text-[#2563EB]" />
              <span>Committee Consensus Outcome</span>
            </h3>

            {details.status === "completed" ? (
              <div className="flex flex-col gap-5 animate-fadeIn">
                
                {/* Gauge Signal */}
                <div className="flex justify-between items-center bg-[#F8FAFC] border-3 border-black p-4 rounded-2xl shadow-[2.5px_2.5px_0px_#000000]">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Final Decision</span>
                    <h4 className={`text-2xl font-black mt-1 uppercase tracking-tight ${
                      details.recommendation === "BUY" ? "text-emerald-600" :
                      details.recommendation === "SELL" ? "text-rose-600" : "text-amber-600"
                    }`}>
                      {details.recommendation}
                    </h4>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Confidence</span>
                    <h4 className="text-2xl font-black text-[#2563EB] mt-1 font-mono">{details.confidence_score}%</h4>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="w-full bg-black/5 border-2 border-black rounded-full h-3.5 overflow-hidden">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${details.confidence_score}%` }} />
                  </div>
                </div>

                {/* Reasoning block */}
                <div className="flex flex-col gap-2 bg-[#F8FAFC] border-3 border-black p-4 rounded-2xl shadow-[2.5px_2.5px_0px_#000000]">
                  <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Committee Synthesis Reasoning</span>
                  <p className="text-xs text-[#0F172A] font-medium leading-relaxed font-mono">
                    {details.summary}
                  </p>
                </div>

                {/* Vote breakdowns */}
                <div className="flex flex-col gap-2.5 mt-2 border-t border-black/10 pt-4">
                  <span className="text-[10px] font-black uppercase text-black/50 tracking-wider">Individual Agent Votes</span>
                  <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                    <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                      <span className="font-bold text-black/55">Research:</span>
                      <span className={`font-black ${details.research_vote === "BUY" ? "text-emerald-600" : details.research_vote === "SELL" ? "text-rose-600" : "text-amber-600"}`}>
                        {details.research_vote || "BUY"}
                      </span>
                    </div>
                    <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                      <span className="font-bold text-black/55">Technical:</span>
                      <span className={`font-black ${details.technical_vote === "BUY" ? "text-emerald-600" : details.technical_vote === "SELL" ? "text-rose-600" : "text-amber-600"}`}>
                        {details.technical_vote || "BUY"}
                      </span>
                    </div>
                    <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                      <span className="font-bold text-black/55">Sentiment:</span>
                      <span className={`font-black ${details.news_vote === "BUY" ? "text-emerald-600" : details.news_vote === "SELL" ? "text-rose-600" : "text-amber-600"}`}>
                        {details.news_vote || "BUY"}
                      </span>
                    </div>
                    <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                      <span className="font-bold text-black/55">Risk Audit:</span>
                      <span className={`font-black ${details.risk_vote === "BUY" ? "text-emerald-600" : details.risk_vote === "SELL" ? "text-rose-600" : "text-amber-600"}`}>
                        {details.risk_vote || "HOLD"}
                      </span>
                    </div>
                    <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC] col-span-2">
                      <span className="font-bold text-black/55">Portfolio Fit:</span>
                      <span className={`font-black ${details.valuation_vote === "BUY" ? "text-emerald-600" : details.valuation_vote === "SELL" ? "text-rose-600" : "text-amber-600"}`}>
                        {details.valuation_vote || "BUY"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
                <span className="text-xs font-mono font-bold text-black/45 uppercase tracking-widest leading-relaxed">
                  AI Committee debate session in progress. Concurrence matrix computing...
                </span>
                <div className="w-full bg-slate-100 border-2 border-black rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-[#2563EB] h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${
                        (Object.values(agentStates).filter(v => v === "completed").length / agentConfig.length) * 100
                      }%` 
                    }} 
                  />
                </div>
                <span className="text-[10px] font-mono font-black text-[#2563EB] uppercase">
                  Progress: {Math.round((Object.values(agentStates).filter(v => v === "completed").length / agentConfig.length) * 100)}%
                </span>
              </div>
            )}
          </section>

        </div>

      </div>

    </motion.div>
  );
}
