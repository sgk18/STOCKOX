"use client";

import React from "react";
import { Terminal, Bot, CheckCircle2, AlertTriangle, Play, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Agent } from "@/lib/agentStore";

interface AgentTimelineProps {
  agents: Agent[];
  isWsConnected: boolean;
}

export default function AgentTimeline({ agents, isWsConnected }: AgentTimelineProps) {
  const getAgentColorConfig = (status: Agent["status"]) => {
    switch (status) {
      case "thinking":
        return {
          bg: "bg-[#FACC15]/10",
          border: "border-[#FACC15] border-3 animate-pulse",
          iconColor: "text-[#FACC15]",
          dotColor: "bg-[#FACC15]",
        };
      case "analyzing":
        return {
          bg: "bg-[#2563EB]/10",
          border: "border-[#2563EB] border-3 animate-pulse",
          iconColor: "text-[#2563EB]",
          dotColor: "bg-[#2563EB]",
        };
      case "completed":
        return {
          bg: "bg-[#2563EB]/10",
          border: "border-black border-2",
          iconColor: "text-[#2563EB]",
          dotColor: "bg-[#2563EB]",
        };
      case "error":
        return {
          bg: "bg-[#EF4444]/10",
          border: "border-[#EF4444] border-3",
          iconColor: "text-[#EF4444]",
          dotColor: "bg-[#EF4444]",
        };
      default: // idle
        return {
          bg: "bg-slate-100/40",
          border: "border-black/20 border-2",
          iconColor: "text-black/30",
          dotColor: "bg-black/20",
        };
    }
  };

  return (
    <div className="bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000000] overflow-hidden flex flex-col">
      {/* Title bar */}
      <div className="bg-black text-[#FACC15] px-6 py-4 flex items-center justify-between border-b-4 border-black">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <span className="font-mono font-black text-sm uppercase tracking-wider">
            AI Committee Timeline Audit
          </span>
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isWsConnected ? "bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]/50" : "bg-amber-500/20 text-amber-500 border-amber-500/50"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? "bg-[#2563EB] animate-ping" : "bg-amber-500 animate-pulse"}`} />
          <span>{isWsConnected ? "WS Live Feed" : "Simulated"}</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-6 flex flex-col gap-5 bg-slate-50/50 max-h-[500px] overflow-y-auto relative">
        {agents.map((agent, index) => {
          const cfg = getAgentColorConfig(agent.status);
          const isLast = index === agents.length - 1;

          return (
            <div key={agent.id} className="flex gap-4 items-start relative">
              {/* Timeline Connector Line */}
              {!isLast && (
                <div className="absolute left-[18px] top-9 bottom-[-20px] w-1 bg-black z-0" />
              )}

              {/* Status bullet icon */}
              <div className="z-10 flex-shrink-0">
                <motion.div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white border-2 shadow-[2px_2px_0px_#000000] ${cfg.border}`}
                  whileHover={{ scale: 1.05 }}
                >
                  {agent.status === "completed" && <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />}
                  {agent.status === "error" && <AlertTriangle className="w-5 h-5 text-[#EF4444]" />}
                  {agent.status === "thinking" && <HelpCircle className="w-5 h-5 text-[#FACC15] animate-spin" />}
                  {agent.status === "analyzing" && <Bot className="w-5 h-5 text-[#2563EB] animate-pulse" />}
                  {agent.status === "idle" && <Play className="w-4 h-4 text-black/30" />}
                </motion.div>
              </div>

              {/* Step details Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex-grow p-4 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000000] flex flex-col gap-1 bg-white hover:shadow-[4.5px_4.5px_0px_#000000] transition-shadow duration-200 ${cfg.bg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#0F172A]">
                    {agent.name}
                  </span>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-black/15 ${
                    agent.status === "completed" ? "bg-[#2563EB]/20 text-[#2563EB]" :
                    agent.status === "error" ? "bg-[#EF4444]/20 text-[#EF4444]" :
                    agent.status === "thinking" ? "bg-[#FACC15]/20 text-yellow-700" :
                    agent.status === "analyzing" ? "bg-[#2563EB]/20 text-[#2563EB]" :
                    "bg-black/5 text-black/50"
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-black/50 block font-bold">
                  {agent.role}
                </span>
                <p className="text-[11px] font-mono leading-relaxed text-black/80 mt-1 font-semibold">
                  {agent.activity}
                </p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
