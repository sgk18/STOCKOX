"use client";

import React from "react";
import { Activity, Bot, RefreshCw, Layers, Terminal } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import AgentFeed from "@/components/dashboard/AgentFeed";

export default function AgentActivityPage() {
  const agents = useDashboardStore((state) => state.agents);

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Activity className="w-8 h-8 text-[#2563EB]" />
            <span>Agent Activity logs</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Process Execution Matrix & Live Diagnostics Node Stream
          </p>
        </div>
      </section>

      {/* Split details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Core Node Diagnostics list */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B]">Active Agent Node Directories</h2>
          <div className="flex flex-col gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="glass-brutal-card p-5 flex flex-col gap-2 bg-white">
                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#2563EB]" />
                    <h3 className="text-sm font-black uppercase text-[#0F172A]">{agent.name}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-black/40 uppercase">{agent.role}</span>
                </div>
                <p className="text-xs font-mono font-bold text-[#64748B] leading-relaxed mt-1">{agent.activity}</p>
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-black/5 font-mono text-[9px]">
                  <span className="font-bold text-[#64748B]">STATE:</span>
                  <span className="font-black text-[#2563EB] uppercase">{agent.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Feed Container */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B]">Agent Comm Bus (Slack Link)</h2>
          <div className="flex-grow">
            <AgentFeed />
          </div>
        </section>

      </div>

    </div>
  );
}
