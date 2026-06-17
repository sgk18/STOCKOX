/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Bot, HelpCircle, Network, ShieldCheck, Database, Globe, LineChart, Cpu } from "lucide-react";
import { motion } from "framer-motion";

// Stores
import { useWebSocketStore } from "@/lib/websocketStore";
import { useAnalysisStore } from "@/lib/analysisStore";
import { useEventStore } from "@/lib/eventStore";
import { useAgentStore } from "@/lib/agentStore";
import { useSelectedStockStore } from "@/lib/selectedStockStore";
import Button from "@/components/ui/Button";

// Sub-components
import AgentTimeline from "./AgentTimeline";
import AnalysisProgress from "./AnalysisProgress";
import EventStream from "./EventStream";

export default function LiveAnalysisPanel() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [analyzingRoom, setAnalyzingRoom] = useState(false);
  
  // Stores states
  const socketConnected = useWebSocketStore((state) => state.connected);
  const connectSocket = useWebSocketStore((state) => state.connect);
  const subscribeSocket = useWebSocketStore((state) => state.subscribe);
  
  const currentSession = useAnalysisStore((state) => state.currentSession);
  const setSessionProgress = useAnalysisStore((state) => state.setSessionProgress);
  const setSessionRecommendation = useAnalysisStore((state) => state.setSessionRecommendation);
  const runAnalysis = useAnalysisStore((state) => state.runAnalysis);
  const isAnalyzing = useAnalysisStore((state) => state.isAnalyzing);
  
  const selectedStock = useSelectedStockStore((state) => state.selectedStock);
  
  const addEvent = useEventStore((state) => state.addEvent);
  const clearEvents = useEventStore((state) => state.clearEvents);
  
  const agents = useAgentStore((state) => state.agents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const resetAgents = useAgentStore((state) => state.resetAgents);

  const handleRunAnalysis = async () => {
    if (!selectedStock) return;
    setAnalyzingRoom(true);
    try {
      const token = await getToken();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      const res = await fetch(`${baseUrl}/api/v1/committee/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ticker: selectedStock.ticker }),
      });

      if (!res.ok) throw new Error("Failed to start committee room");
      const room = await res.json();
      router.push(`/committee/${room.id}`);
    } catch (err) {
      console.error("[COMMITTEE-START-ERR]", err);
    } finally {
      setAnalyzingRoom(false);
    }
  };

  // 1. Establish WebSocket Connection
  useEffect(() => {
    async function initSocket() {
      const token = await getToken();
      connectSocket(token);
    }
    initSocket();
  }, [getToken, connectSocket]);

  // 2. Subscribe to WebSocket Events when connection is established
  useEffect(() => {
    if (!socketConnected) return;

    // Listen to wildcard events to load logs
    const unsubWildcard = subscribeSocket("*", (event) => {
      addEvent(event);
    });

    // Handle session progress updates
    const unsubStarted = subscribeSocket("analysis_started", (event) => {
      clearEvents();
      resetAgents();
      addEvent(event);
      setSessionProgress(0);
    });

    const unsubCompleted = subscribeSocket("analysis_completed", (event) => {
      const payload = event.payload;
      setSessionProgress(100);
      setSessionRecommendation(
        payload.recommendation,
        payload.confidence_score,
        payload.risk_level,
        payload.summary
      );
    });

    const unsubAgentStarted = subscribeSocket("agent_started", (event) => {
      const payload = event.payload;
      updateAgentStatus(payload.agent_name, "thinking", `Activated node: Awaiting data feeds.`);
    });

    const unsubAgentThinking = subscribeSocket("agent_thinking", (event) => {
      const payload = event.payload;
      updateAgentStatus(payload.agent_name, "thinking", payload.message || "Auditing correlate bounds...");
    });

    const unsubAgentMessage = subscribeSocket("agent_message", (event) => {
      const payload = event.payload;
      const agentState = payload.message_type === "risk" ? "analyzing" : "analyzing";
      updateAgentStatus(payload.agent_name, agentState, payload.message);
    });

    const unsubAgentCompleted = subscribeSocket("agent_completed", (event) => {
      const payload = event.payload;
      updateAgentStatus(payload.agent_name, "completed", payload.result);
      
      // Auto-increment progress based on number of completed agents
      // Since there are 6 agents in total
      const completedCount = agents.filter(a => a.status === "completed").length + 1;
      const prog = Math.min(Math.round((completedCount * 100) / 6), 99);
      setSessionProgress(prog);
    });

    const unsubAgentFailed = subscribeSocket("agent_error", (event) => {
      const payload = event.payload;
      updateAgentStatus(payload.agent_name, "error", payload.error);
    });

    const unsubRecGenerated = subscribeSocket("recommendation_generated", (event) => {
      const payload = event.payload;
      setSessionRecommendation(
        payload.recommendation,
        payload.confidence_score,
        payload.risk_level,
        "Synthesis finished. Compilation recorded."
      );
    });

    return () => {
      unsubWildcard();
      unsubStarted();
      unsubCompleted();
      unsubAgentStarted();
      unsubAgentThinking();
      unsubAgentMessage();
      unsubAgentCompleted();
      unsubAgentFailed();
      unsubRecGenerated();
    };
  }, [socketConnected, subscribeSocket, addEvent, clearEvents, resetAgents, updateAgentStatus, setSessionProgress, setSessionRecommendation, agents]);

  // Agent icons map for the top row
  const agentIcons: Record<string, React.ComponentType<any>> = {
    "research": Database,
    "news": Globe,
    "fundamental": HelpCircle,
    "technical": LineChart,
    "risk": ShieldCheck,
    "committee": Cpu,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header State Card */}
      {currentSession && (
        <section className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-[#2563EB] font-black">
                Active Audit Session
              </span>
              <span className="bg-black text-[#FACC15] font-mono text-[9px] px-1.5 py-0.5 rounded border border-black font-extrabold uppercase">
                {currentSession.ticker}
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-black leading-tight mt-1">
              {currentSession.companyName}
            </h3>
            <p className="text-xs font-mono font-bold text-black/50 tracking-wide mt-1.5 leading-relaxed">
              {currentSession.summary}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-[#2563EB]/15 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#000000] flex flex-col items-center justify-center min-w-[90px]">
              <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">Signal</span>
              <span className="text-sm font-black text-[#2563EB]">{currentSession.recommendation}</span>
            </div>
            <div className="bg-[#2563EB]/15 border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_#000000] flex flex-col items-center justify-center min-w-[90px]">
              <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">Confidence</span>
              <span className="text-sm font-black text-[#2563EB]">{currentSession.confidenceScore}%</span>
            </div>
          </div>
        </section>
      )}

      {/* 2. Pulsing Agent Nodes Row */}
      {currentSession && (
        <section className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_#000000] flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-black/10 pb-2 mb-2">
            <Network className="w-4.5 h-4.5 text-[#2563EB]" />
            <span className="text-xs font-black uppercase text-black/50 tracking-wider">Federated Committee Nodes</span>
          </div>

          {/* Node Grid Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 relative">
            {agents.map((agent) => {
              const Icon = agentIcons[agent.id] || Bot;
              
              // Colors based on status
              const isThinking = agent.status === "thinking";
              const isAnalyzing = agent.status === "analyzing";
              const isCompleted = agent.status === "completed";
              const isError = agent.status === "error";

              let nodeClass = "bg-slate-50 border-black/20 text-black/30";
              let pulseClass = "";

              if (isThinking) {
                nodeClass = "bg-[#FACC15]/20 border-[#FACC15] text-[#FACC15] border-3 shadow-[3px_3px_0px_#FACC15]/20";
                pulseClass = "bg-[#FACC15] animate-ping opacity-75";
              } else if (isAnalyzing) {
                nodeClass = "bg-[#2563EB]/20 border-[#2563EB] text-[#2563EB] border-3 shadow-[3px_3px_0px_#2563EB]/20";
                pulseClass = "bg-[#2563EB] animate-ping opacity-75";
              } else if (isCompleted) {
                nodeClass = "bg-[#2563EB]/20 border-[#2563EB] text-[#2563EB] border-2 shadow-[2px_2px_0px_#2563EB]/15";
              } else if (isError) {
                nodeClass = "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] border-3 shadow-[3px_3px_0px_#EF4444]/20";
              }

              return (
                <div key={agent.id} className="flex flex-col items-center gap-2 relative">
                  {/* Circle Node Container */}
                  <motion.div
                    className={`w-14 h-14 rounded-full border-2 bg-white flex items-center justify-center relative shadow-[3px_3px_0px_#000000] border-black hover:scale-105 transition-transform duration-200 cursor-pointer ${nodeClass}`}
                    whileHover={{ y: -2 }}
                  >
                    <Icon className="w-6 h-6" />
                    
                    {/* Ring indicator */}
                    {pulseClass && (
                      <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-black ${pulseClass}`} />
                    )}
                    {/* Solid static dot */}
                    {(isThinking || isAnalyzing || isCompleted || isError) && (
                      <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-black ${
                        isCompleted ? "bg-[#2563EB]" :
                        isError ? "bg-[#EF4444]" :
                        isThinking ? "bg-[#FACC15]" : "bg-[#2563EB]"
                      }`} />
                    )}
                  </motion.div>
                  
                  {/* Label */}
                  <span className="text-[9px] font-black uppercase tracking-wider text-black/60 text-center font-mono">
                    {agent.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Splitted Audit Layout */}
      {currentSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
          {/* Left: Timeline */}
          <AgentTimeline agents={agents} isWsConnected={socketConnected} />

          {/* Right: Progress Circular Gauge & Event Stream Logs */}
          <div className="flex flex-col gap-6">
            <AnalysisProgress progress={currentSession.progressPercent} />
            <EventStream />
          </div>
        </div>
      ) : selectedStock ? (
        <section className="bg-white border-4 border-black p-12 rounded-2xl shadow-[6px_6px_0px_#000000] flex flex-col items-center justify-center text-center">
          <Bot className="w-16 h-16 text-[#2563EB] mb-4 animate-bounce" />
          <h3 className="text-xl font-black uppercase text-black mb-2">Initiate Advisory Audit</h3>
          <p className="text-xs font-mono font-bold text-black/45 uppercase tracking-widest max-w-sm leading-relaxed mb-6">
            Initiate a multi-agent audit on {selectedStock.name} ({selectedStock.ticker}) to activate the real-time debater cockpit.
          </p>
          <Button
            variant="primary"
            onClick={handleRunAnalysis}
            isLoading={isAnalyzing || analyzingRoom}
            className="text-xs font-black uppercase border-2 shadow-[2px_2px_0px_#000000] px-8 py-3.5 cursor-pointer"
          >
            Run Advisory Analysis
          </Button>
        </section>
      ) : (
        <section className="bg-white border-4 border-black p-12 rounded-2xl shadow-[6px_6px_0px_#000000] flex flex-col items-center justify-center text-center">
          <Bot className="w-16 h-16 text-black/30 mb-4" />
          <h3 className="text-xl font-black uppercase text-black mb-2">Live Committee Stream Offline</h3>
          <p className="text-xs font-mono font-bold text-black/45 uppercase tracking-widest max-w-sm leading-relaxed">
            Select a stock ticker from the board search bar to activate the real-time debater workspace.
          </p>
        </section>
      )}
    </div>
  );
}
