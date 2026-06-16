"use client";

import React from "react";
import { CheckCircle2, CircleDot, Play, Bot } from "lucide-react";

interface AgentProgressProps {
  agentStates: Record<string, "idle" | "thinking" | "analyzing" | "completed">;
}

export default function AgentProgress({ agentStates }: AgentProgressProps) {
  const agents = [
    { id: "research", name: "Research Agent", role: "Market Share Moat" },
    { id: "news", name: "News Agent", role: "Sentiment Scan" },
    { id: "fundamental", name: "Fundamental Agent", role: "Valuation Models" },
    { id: "technical", name: "Technical Agent", role: "Chart Breakouts" },
    { id: "risk", name: "Risk Agent", role: "Value-at-Risk (VaR)" },
    { id: "committee", name: "Committee Agent", role: "Signal Consensus" },
  ];

  const getStatusConfig = (status: "idle" | "thinking" | "analyzing" | "completed") => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          class: "bg-[#2563EB]/15 border-[#2563EB]/40 text-[#2563EB]",
          label: "Audit Complete",
          badgeColor: "bg-[#2563EB]",
        };
      case "analyzing":
        return {
          icon: CircleDot,
          class: "bg-[#2563EB]/15 border-[#2563EB]/40 text-[#2563EB] animate-pulse",
          label: "Analyzing Metrics",
          badgeColor: "bg-[#2563EB]",
        };
      case "thinking":
        return {
          icon: CircleDot,
          class: "bg-[#FACC15]/15 border-[#FACC15]/40 text-[#FACC15] animate-spin",
          label: "Compiling Logs",
          badgeColor: "bg-[#FACC15]",
        };
      default:
        return {
          icon: Play,
          class: "bg-black/5 border-black/20 text-black/40",
          label: "Queued",
          badgeColor: "bg-black/30",
        };
    }
  };

  return (
    <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000000] select-none">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-[#2563EB]" />
        <h4 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">
          Agent Progress Board
        </h4>
      </div>

      <div className="flex flex-col gap-4 font-mono">
        {agents.map((agent) => {
          const status = agentStates[agent.id] || "idle";
          const config = getStatusConfig(status);
          const IconComp = config.icon;

          return (
            <div
              key={agent.id}
              className={`flex items-center justify-between p-3 border-2 border-black rounded-xl shadow-[2px_2px_0px_#000000] transition-colors duration-300 ${config.class}`}
            >
              <div className="flex items-center gap-3">
                {/* Agent Indicator dot */}
                <span className={`w-2.5 h-2.5 rounded-full border border-black ${config.badgeColor}`} />
                <div>
                  <span className="font-bold text-xs block text-[#0F172A]">
                    {agent.name}
                  </span>
                  <span className="text-[9px] text-black/50 block font-black uppercase tracking-wider">
                    {agent.role}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 text-right">
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                  {config.label}
                </span>
                <IconComp className="w-4.5 h-4.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
