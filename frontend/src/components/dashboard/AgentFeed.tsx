"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MessageSquare, Bot, Database, Globe, LineChart, ShieldCheck, Cpu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useWebSocketStore } from "@/lib/websocketStore";
import { useDashboardStore } from "@/lib/store";

interface Message {
  id: string;
  agentId: "research" | "news" | "technical" | "risk" | "committee";
  agentName: string;
  message: string;
  timestamp: string;
}

export default function AgentFeed() {
  const { getToken } = useAuth();
  const socketConnected = useWebSocketStore((state) => state.connected);
  const connectSocket = useWebSocketStore((state) => state.connect);
  const subscribeSocket = useWebSocketStore((state) => state.subscribe);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      agentId: "research",
      agentName: "Research Agent",
      message: "Initial valuation model loaded for NVIDIA. Gross margin stands at 76.2%. Institutional demand remains robust.",
      timestamp: "10:14 AM",
    },
    {
      id: "m2",
      agentId: "news",
      agentName: "News Agent",
      message: "Parsing macro tech sentiment. Detection of bullish regulatory reports on AI data-centers.",
      timestamp: "10:15 AM",
    },
    {
      id: "m3",
      agentId: "technical",
      agentName: "Technical Agent",
      message: "NVDA daily candle closed above 20 EMA. Support consolidated at $180. Trend strength indicator is BUY.",
      timestamp: "10:16 AM",
    },
  ]);

  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logic
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect socket on mount
  useEffect(() => {
    async function initSocket() {
      const token = await getToken();
      connectSocket(token);
    }
    initSocket();
  }, [getToken, connectSocket]);

  // Subscribe to WebSocket Events
  useEffect(() => {
    if (!socketConnected) return;

    const handleEvent = (event: any) => {
      try {
        const payload = event.payload;
        const time = new Date(payload.timestamp || Date.now()).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });

        let msgText = payload.message || "";
        if (event.type === "agent_started") {
          msgText = `Started audit task: ${payload.task}`;
        } else if (event.type === "agent_completed") {
          msgText = `Completed task successfully. Result: ${payload.result}`;
        }

        const agentIdRaw = (payload.agent_name || "").toLowerCase().split(" ")[0];
        const agentId = (["research", "news", "technical", "risk", "committee"].includes(agentIdRaw)
          ? agentIdRaw
          : "research") as Message["agentId"];

        setMessages((prev) => {
          // Deduplicate sequential identical logs
          if (prev.length > 0 && prev[prev.length - 1].message === msgText) return prev;
          return [
            ...prev,
            {
              id: `ws-${Date.now()}-${Math.random()}`,
              agentId,
              agentName: payload.agent_name,
              message: msgText,
              timestamp: time,
            },
          ];
        });

        // Update dashboard status store
        let storeStatus: "Idle" | "Thinking" | "Researching" | "Complete" | "Fetching News" | "Monitoring" = "Idle";
        if (event.type === "agent_started" || event.type === "agent_message") {
          if (agentId === "research") storeStatus = "Researching";
          else if (agentId === "news") storeStatus = "Fetching News";
          else if (agentId === "technical") storeStatus = "Thinking";
          else if (agentId === "risk") storeStatus = "Monitoring";
          else storeStatus = "Thinking";
        } else if (event.type === "agent_completed") {
          storeStatus = "Complete";
        }
        
        useDashboardStore.getState().updateAgentStatus(agentId, storeStatus, msgText);
      } catch (err) {
        console.error("[WS-FEED-PARSER-ERR]", err);
      }
    };

    // Subscriptions
    const unsubMessage = subscribeSocket("agent_message", handleEvent);
    const unsubStarted = subscribeSocket("agent_started", handleEvent);
    const unsubCompleted = subscribeSocket("agent_completed", handleEvent);

    // Subscribe to market price ticks as well
    const unsubMarket = subscribeSocket("market_data_updated", (event) => {
      const payload = event.payload;
      const symbolMap: Record<string, string> = {
        "SP500": "S&P 500",
        "NASDAQ": "NASDAQ",
        "NIFTY50": "NIFTY 50",
        "GOLD": "Gold",
        "BITCOIN": "Bitcoin",
      };
      const mappedName = symbolMap[payload.symbol];
      if (mappedName) {
        useDashboardStore.getState().updateMarketPrice(mappedName, payload.price, payload.change_percent);
      }
    });

    return () => {
      unsubMessage();
      unsubStarted();
      unsubCompleted();
      unsubMarket();
    };
  }, [socketConnected, subscribeSocket]);

  // Fallback Simulator: triggers Slack ticker ONLY when socket is disconnected
  useEffect(() => {
    const simulationPool = [
      {
        agentId: "risk",
        agentName: "Risk Agent",
        message: "Maximum drawdown criteria checked. Portfolio allocation ratio for NVDA increased safely to 6.5%.",
      },
      {
        agentId: "committee",
        agentName: "Committee Agent",
        message: "Aggregating fundamental, sentiment, and structural weights. 3-1 Consensus reached. Generating BUY ticket.",
      },
      {
        agentId: "research",
        agentName: "Research Agent",
        message: "Evaluating TSLA valuation. Sub-average free cash flow margins noted in Q1 SEC filing details.",
      },
      {
        agentId: "news",
        agentName: "News Agent",
        message: "News sentiment indicates negative retail coverage regarding automotive deliveries for TSLA.",
      },
      {
        agentId: "technical",
        agentName: "Technical Agent",
        message: "TSLA support levels broken at $215. Bearish patterns indicate possible consolidation floor at $200.",
      },
      {
        agentId: "risk",
        agentName: "Risk Agent",
        message: "Exposure warnings active on automotive holdings. Recommend maintaining HOLD classification.",
      },
      {
        agentId: "committee",
        agentName: "Committee Agent",
        message: "TSLA Consensus summary: HOLD rating issued. Risk constraints set to high priority.",
      },
    ] as const;

    let idx = 0;
    const interval = setInterval(() => {
      if (socketConnected) return;

      const item = simulationPool[idx % simulationPool.length];
      const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          agentId: item.agentId,
          agentName: item.agentName,
          message: item.message,
          timestamp: time,
        },
      ]);
      
      idx++;
    }, 6000);

    return () => clearInterval(interval);
  }, [socketConnected]);

  const agentIcons = {
    research: Database,
    news: Globe,
    sentiment: Globe,
    technical: LineChart,
    risk: ShieldCheck,
    committee: Cpu,
  };

  const agentColorClasses = {
    research: "bg-[#2563EB] text-white border-[#1D4ED8]",
    news: "bg-[#FACC15] text-black border-black",
    sentiment: "bg-[#FACC15] text-black border-black",
    technical: "bg-[#60A5FA] text-black border-[#2563EB]",
    risk: "bg-[#EF4444] text-white border-black",
    committee: "bg-purple-600 text-white border-black",
  };

  return (
    <div className="bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000000] flex flex-col h-[450px] overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b-3 border-black bg-[#F8FAFC] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#2563EB]" />
          <span className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Agent Comm Bus (Slack Link)</span>
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${socketConnected ? "text-[#22C55E]" : "text-amber-500"}`}>
          <span className={`w-2 h-2 rounded-full border border-black ${socketConnected ? "bg-[#22C55E] animate-ping" : "bg-amber-500 animate-pulse"}`} />
          {socketConnected ? "Live Connection" : "Simulated"}
        </span>
      </div>

      {/* Feed Panel */}
      <div className="flex-grow p-4 overflow-y-auto bg-[#F8FAFC] flex flex-col gap-3.5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const IconComp = agentIcons[msg.agentId] || Bot;
            const colorClass = agentColorClasses[msg.agentId] || "bg-[#F8FAFC] text-black border-black";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-start gap-3 bg-white p-3 border-2 border-black rounded-xl shadow-[2px_2px_0px_#000000]"
              >
                {/* Agent Icon Badge */}
                <div className={`p-2 rounded-lg border-2 flex-shrink-0 ${colorClass}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                
                {/* Text Context */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-[#0F172A]">{msg.agentName}</span>
                    <span className="text-[9px] font-bold text-black/40">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs font-bold text-black/80 mt-1 leading-normal font-mono">
                    {msg.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}
