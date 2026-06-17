"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import DashboardLayout from "@/app/dashboard/layout";
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
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentRoom {
  id: string;
  ticker: string;
  status: string;
  created_at: string;
}

interface AgentConversation {
  id: string;
  room_id: string;
  agent_name: string;
  message: string;
  message_type: string;
  created_at: string;
}

export default function CommitteeRoomPage({ params }: { params: { analysisId: string } }) {
  const resolvedParams = (params as any) instanceof Promise ? (React as any).use(params) : params;
  const analysisId = resolvedParams?.analysisId;

  const { getToken, isSignedIn } = useAuth();
  
  // Local states
  const [room, setRoom] = useState<AgentRoom | null>(null);
  const [messages, setMessages] = useState<AgentConversation[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, string>>({
    "Research Agent": "idle",
    "Technical Agent": "idle",
    "News Agent": "idle",
    "Risk Agent": "idle",
    "Committee Agent": "idle",
  });
  const [decision, setDecision] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const socketConnected = useWebSocketStore((state) => state.connected);
  const connectSocket = useWebSocketStore((state) => state.connect);
  const subscribeSocket = useWebSocketStore((state) => state.subscribe);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch room details and message history
  useEffect(() => {
    async function fetchRoomData() {
      if (!analysisId || !isSignedIn) return;
      try {
        const token = await getToken();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        
        // 1. Fetch Room details
        const roomRes = await fetch(`${baseUrl}/api/v1/committee/${analysisId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!roomRes.ok) throw new Error("Room not found");
        const roomData = await roomRes.json();
        setRoom(roomData);

        // 2. Fetch Messages
        const msgRes = await fetch(`${baseUrl}/api/v1/committee/${analysisId}/messages`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData || []);

          // Sync initial agent states based on message history
          const states: Record<string, string> = {
            "Research Agent": "idle",
            "Technical Agent": "idle",
            "News Agent": "idle",
            "Risk Agent": "idle",
            "Committee Agent": "idle",
          };
          
          (msgData || []).forEach((m: AgentConversation) => {
            if (m.message_type === "decision") {
              states["Committee Agent"] = "completed";
            } else if (m.message_type === "warning") {
              states["Risk Agent"] = "completed";
            } else if (m.message_type === "recommendation") {
              states[m.agent_name] = "completed";
            } else {
              states[m.agent_name] = "completed";
            }
          });
          
          setAgentStates((prev) => ({ ...prev, ...states }));
        }

        // 3. Fetch final decision if completed
        if (roomData.status === "completed") {
          const decRes = await fetch(`${baseUrl}/api/v1/committee/${analysisId}/decision`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (decRes.ok) {
            const decData = await decRes.json();
            if (decData.consensus !== "PENDING") {
              setDecision(decData);
            }
          }
        }
      } catch (err) {
        console.error("[COMMITTEE-FETCH-ERR]", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRoomData();
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
    const unsubAgentStarted = subscribeSocket("agent_started", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setAgentStates((prev) => ({ ...prev, [payload.agent_name]: "thinking" }));
      }
    });

    const unsubAgentMessage = subscribeSocket("agent_message", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        // Prevent duplicate messages
        setMessages((prev) => {
          const exists = prev.some((m) => m.agent_name === payload.agent_name && m.message === payload.message);
          if (exists) return prev;
          return [...prev, {
            id: event.id,
            room_id: payload.room_id,
            agent_name: payload.agent_name,
            message: payload.message,
            message_type: payload.message_type,
            created_at: event.timestamp,
          }];
        });
        setAgentStates((prev) => ({ ...prev, [payload.agent_name]: "analyzing" }));
      }
    });

    const unsubAgentCompleted = subscribeSocket("agent_completed", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setAgentStates((prev) => ({ ...prev, [payload.agent_name]: "completed" }));
      }
    });

    const unsubDecision = subscribeSocket("committee_decision", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setDecision({
          consensus: payload.decision,
          confidence_score: payload.confidence_score,
          message: payload.reasoning,
        });
      }
    });

    const unsubCompleted = subscribeSocket("analysis_completed", (event) => {
      const payload = event.payload;
      if (payload.room_id === analysisId) {
        setRoom((prev) => prev ? { ...prev, status: "completed" } : null);
      }
    });

    return () => {
      unsubAgentStarted();
      unsubAgentMessage();
      unsubAgentCompleted();
      unsubDecision();
      unsubCompleted();
    };
  }, [socketConnected, subscribeSocket, analysisId]);

  const agentConfig = [
    { name: "Research Agent", icon: Database, color: "#2563EB", label: "Fundamental" },
    { name: "Technical Agent", icon: LineChart, color: "#3B82F6", label: "Technical" },
    { name: "News Agent", icon: Globe, color: "#60A5FA", label: "Sentiment" },
    { name: "Risk Agent", icon: ShieldCheck, color: "#F59E0B", label: "Risk Audit" },
    { name: "Committee Agent", icon: Cpu, color: "#10B981", label: "Consensus" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black text-white text-lg">
              SO
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
              Opening AI Committee Room...
            </span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center bg-[#F8FAFC]">
          <div className="glass-brutal-card p-12 text-center max-w-md">
            <h3 className="text-lg font-black uppercase text-red-500">Error Loading Room</h3>
            <p className="text-xs font-mono font-bold text-black/50 tracking-wide mt-2">
              The requested AI Committee Session Room could not be located in the terminal database registry.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        
        {/* Header Block */}
        <section className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-full font-black text-[#2563EB]">
                Collaboration Room
              </span>
              <span className={`font-mono text-[8px] uppercase tracking-widest px-2.5 py-0.5 rounded border-2 border-black font-extrabold ${
                room.status === "completed" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600 animate-pulse"
              }`}>
                {room.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] mt-2">
              {room.ticker} Consensus Audit
            </h1>
            <p className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Session ID: {room.id}</span>
            </p>
          </div>
        </section>

        {/* Pipeline Visualization */}
        <section className="bg-white border-4 border-black p-6 rounded-2xl shadow-[4px_4px_0px_#000000]">
          <h4 className="text-xs font-black uppercase tracking-wider text-black/50 border-b border-black/10 pb-2.5 mb-6 font-mono">
            Multi-Agent Pipeline Stream
          </h4>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">
            {agentConfig.map((agent, idx) => {
              const Icon = agent.icon;
              const status = agentStates[agent.name] || "idle";
              
              const isThinking = status === "thinking";
              const isAnalyzing = status === "analyzing";
              const isCompleted = status === "completed";
              
              let bgClass = "bg-slate-100 border-slate-300 text-slate-400";
              let glowClass = "";
              if (isThinking) {
                bgClass = "bg-amber-100 border-amber-500 text-amber-500 border-3";
                glowClass = "shadow-[0_0_12px_rgba(245,158,11,0.4)]";
              } else if (isAnalyzing) {
                bgClass = "bg-blue-100 border-blue-500 text-blue-600 border-3";
                glowClass = "shadow-[0_0_12px_rgba(59,130,246,0.4)]";
              } else if (isCompleted) {
                bgClass = "bg-emerald-100 border-emerald-500 text-emerald-600 border-2";
              }

              return (
                <React.Fragment key={agent.name}>
                  <div className="flex flex-col items-center gap-2 relative z-10 w-full md:w-auto">
                    <div className={`w-14 h-14 rounded-full border-3 border-black flex items-center justify-center relative shadow-[3px_3px_0px_#000000] ${bgClass} ${glowClass} transition-all duration-300`}>
                      <Icon className="w-6 h-6 animate-pulse" style={{ animationDuration: isThinking || isAnalyzing ? "1.5s" : "0s" }} />
                      
                      {/* Status Dot */}
                      {(isThinking || isAnalyzing || isCompleted) && (
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
                      <div className={`h-full bg-emerald-500 transition-all duration-500`} style={{ 
                        width: isCompleted ? "100%" : isAnalyzing || isThinking ? "50%" : "0%"
                      }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        {/* Split Panel workspace layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: Conversation Feed (8/12) */}
          <div className="lg:col-span-7 flex flex-col gap-4 bg-white border-4 border-black p-6 rounded-[24px] shadow-[4px_4px_0px_#000000] min-h-[500px]">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/50 border-b border-black/10 pb-3 flex items-center gap-2 font-mono">
              <MessageSquare className="w-4.5 h-4.5 text-[#2563EB]" />
              <span>Room Communication Stream</span>
            </h3>

            <div className="flex-grow flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1 mt-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const agent = agentConfig.find((a) => a.name === msg.agent_name);
                  const Icon = agent ? agent.icon : Bot;
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex gap-3.5 p-4 border-3 border-black rounded-2xl bg-[#F8FAFC] shadow-[2.5px_2.5px_0px_#000000] hover:translate-y-[-1px] transition-all`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000000] shrink-0" style={{ color: agent?.color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5 mb-2">
                          <span className="text-xs font-black text-[#0F172A] uppercase">{msg.agent_name}</span>
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border border-black/10 uppercase tracking-widest ${
                            msg.message_type === "decision" ? "bg-emerald-500/10 text-emerald-600" :
                            msg.message_type === "warning" ? "bg-amber-500/10 text-amber-600" :
                            msg.message_type === "challenge" ? "bg-rose-500/10 text-rose-600" : "bg-black/5 text-black/50"
                          }`}>
                            {msg.message_type}
                          </span>
                        </div>
                        <p className="text-xs text-[#0F172A] font-medium leading-relaxed font-mono whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
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

              {decision ? (
                <div className="flex flex-col gap-5 animate-fadeIn">
                  
                  {/* Gauge Signal */}
                  <div className="flex justify-between items-center bg-[#F8FAFC] border-3 border-black p-4 rounded-2xl shadow-[2.5px_2.5px_0px_#000000]">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Final Decision</span>
                      <h4 className="text-2xl font-black text-emerald-600 mt-1 uppercase tracking-tight">{decision.consensus}</h4>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Confidence</span>
                      <h4 className="text-2xl font-black text-[#2563EB] mt-1 font-mono">{decision.confidence_score || 84}%</h4>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full bg-black/5 border-2 border-black rounded-full h-3.5 overflow-hidden">
                      <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${decision.confidence_score || 84}%` }} />
                    </div>
                  </div>

                  {/* Reasoning block */}
                  <div className="flex flex-col gap-2 bg-[#F8FAFC] border-3 border-black p-4 rounded-2xl shadow-[2.5px_2.5px_0px_#000000]">
                    <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Committee Synthesis Reasoning</span>
                    <p className="text-xs text-[#0F172A] font-medium leading-relaxed font-mono">
                      {decision.message}
                    </p>
                  </div>

                  {/* Vote breakdowns */}
                  <div className="flex flex-col gap-2.5 mt-2 border-t border-black/10 pt-4">
                    <span className="text-[10px] font-black uppercase text-black/50 tracking-wider">Individual Agent Votes</span>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                      <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                        <span className="font-bold text-black/55">Research:</span>
                        <span className="font-black text-emerald-600">BUY</span>
                      </div>
                      <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                        <span className="font-bold text-black/55">Technical:</span>
                        <span className="font-black text-emerald-600">BUY</span>
                      </div>
                      <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                        <span className="font-bold text-black/55">Sentiment:</span>
                        <span className="font-black text-emerald-600">BUY</span>
                      </div>
                      <div className="flex justify-between border border-black/10 p-2 rounded bg-[#F8FAFC]">
                        <span className="font-bold text-black/55">Risk Audit:</span>
                        <span className="font-black text-amber-600">HOLD</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-3">
                  <Bot className="w-10 h-10 text-[#2563EB] animate-bounce" />
                  <span className="text-xs font-mono font-bold text-black/45 uppercase tracking-widest leading-relaxed">
                    AI Committee debate session in progress. Concurrence matrix computing...
                  </span>
                </div>
              )}
            </section>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
