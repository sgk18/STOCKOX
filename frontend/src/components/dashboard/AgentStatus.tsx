"use client";

import React from "react";
import { Database, Globe, LineChart, ShieldCheck, Cpu } from "lucide-react";
import { useDashboardStore } from "@/lib/store";

export default function AgentStatus() {
  const agents = useDashboardStore((state) => state.agents);

  const agentIcons = {
    research: Database,
    news: Globe,
    technical: LineChart,
    risk: ShieldCheck,
    committee: Cpu,
  };

  const colorConfig = {
    research: "bg-[#2563EB] text-white border-black",
    news: "bg-[#FACC15] text-black border-black",
    technical: "bg-[#60A5FA] text-black border-black",
    risk: "bg-[#EF4444] text-white border-black",
    committee: "bg-purple-600 text-white border-black",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 select-none">
      {agents.map((agent) => {
        const IconComp = agentIcons[agent.id as keyof typeof agentIcons];
        const isIdle = agent.status === "Idle";
        
        return (
          <div
            key={agent.id}
            className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000000] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all duration-200"
          >
            {/* Header info */}
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg border-2 ${colorConfig[agent.id as keyof typeof colorConfig]}`}>
                <IconComp className="w-4 h-4" />
              </div>
              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000000] ${
                isIdle ? "bg-gray-100 text-gray-500" : "bg-[#2563EB]/15 text-[#2563EB]"
              }`}>
                {!isIdle && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping" />}
                {agent.status}
              </span>
            </div>

            {/* Agent info */}
            <h4 className="font-black text-sm uppercase tracking-wide text-[#0F172A]">{agent.name}</h4>
            <p className="text-[10px] text-black/50 font-bold uppercase mt-0.5">{agent.role}</p>

            {/* Active task details */}
            <div className="mt-3.5 pt-3.5 border-t border-black/10">
              <span className="text-[9px] font-black text-black/40 uppercase block mb-1">Current Task</span>
              <p className="text-[11px] font-bold text-black/80 font-mono truncate" title={agent.activity}>
                {agent.activity}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
