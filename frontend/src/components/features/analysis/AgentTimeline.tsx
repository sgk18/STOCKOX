"use client";

import React, { useEffect, useRef } from "react";
import { Terminal, ShieldAlert, Cpu, Sparkles, MessageSquareDot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface AgentTimelineMessage {
  id: string;
  agentName: string;
  message: string;
  type: string;
  timestamp: string;
}

interface AgentTimelineProps {
  messages: AgentTimelineMessage[];
}

export default function AgentTimeline({ messages }: AgentTimelineProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal to bottom when new logs arrive
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAgentColorConfig = (name: string) => {
    switch (name) {
      case "Research Agent":
        return {
          bg: "bg-[#2563EB]/10",
          border: "border-[#2563EB]/30",
          text: "text-[#2563EB]",
          avatar: "bg-[#2563EB]",
        };
      case "News Agent":
        return {
          bg: "bg-[#FACC15]/10",
          border: "border-[#FACC15]/30",
          text: "text-[#FACC15] text-black",
          avatar: "bg-[#FACC15]",
        };
      case "Fundamental Agent":
        return {
          bg: "bg-[#22C55E]/10",
          border: "border-[#22C55E]/30",
          text: "text-[#22C55E]",
          avatar: "bg-[#22C55E]",
        };
      case "Technical Agent":
        return {
          bg: "bg-[#a855f7]/10",
          border: "border-[#a855f7]/30",
          text: "text-[#a855f7]",
          avatar: "bg-[#a855f7]",
        };
      case "Risk Agent":
        return {
          bg: "bg-[#EF4444]/10",
          border: "border-[#EF4444]/30",
          text: "text-[#EF4444]",
          avatar: "bg-[#EF4444]",
        };
      default:
        return {
          bg: "bg-black/5",
          border: "border-black/20",
          text: "text-black",
          avatar: "bg-black",
        };
    }
  };

  return (
    <div className="bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000000] overflow-hidden select-none">
      {/* Terminal Title Bar */}
      <div className="bg-black text-[#FACC15] px-6 py-4 flex items-center justify-between border-b-4 border-black">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <span className="font-mono font-black text-sm uppercase tracking-wider">
            Agent Consensus Stream v1.2
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase bg-[#22C55E]/20 text-[#22C55E] px-2 py-0.5 rounded border border-[#22C55E]/50">
          <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
          <span>WebSocket Live Feed</span>
        </div>
      </div>

      {/* Timeline Screen */}
      <div className="p-6 bg-[#0F172A] min-h-[350px] max-h-[450px] overflow-y-auto flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquareDot className="w-12 h-12 text-white/10 animate-bounce mb-3" />
            <p className="font-mono text-xs text-white/30 uppercase tracking-widest leading-relaxed">
              Awaiting advisory consensus request... <br />
              Select a stock and click 'Run analysis'
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const cfg = getAgentColorConfig(msg.agentName);
              const messageDate = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`border-2 p-4 rounded-xl flex gap-3 text-white shadow-[2px_2px_0px_rgba(255,255,255,0.05)] ${cfg.bg} ${cfg.border}`}
                >
                  {/* Agent Logo Avatar */}
                  <div className={`w-8 h-8 rounded-lg text-white font-mono font-black text-xs flex items-center justify-center flex-shrink-0 border border-white/10 ${cfg.avatar}`}>
                    {msg.agentName.charAt(0)}
                  </div>

                  {/* Message details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-extrabold text-sm uppercase text-white/95">
                        {msg.agentName}
                      </span>
                      <span className="font-mono text-[9px] text-white/45">
                        {messageDate}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-white/70 leading-relaxed break-words">
                      {msg.message}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
