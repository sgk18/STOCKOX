"use client";

import React from "react";
import { Newspaper, Calendar, Globe, Layers, ArrowUpRight } from "lucide-react";

const CALENDAR_EVENTS = [
  { title: "Fed Interest Rate Decision", date: "June 18, 2026", type: "FOMC", desc: "Hawkish dot-plot projection audit", tagColor: "bg-[#2563EB]/10 text-[#2563EB]" },
  { title: "NVIDIA Corp. Dividend Distribution", date: "June 20, 2026", type: "DIVIDEND", desc: "Payable date for quarterly dividend payout", tagColor: "bg-[#3B82F6]/10 text-[#3B82F6]" },
  { title: "US Consumer Price Index (CPI)", date: "June 25, 2026", type: "MACRO", desc: "Pre-market inflation release schedules", tagColor: "bg-[#60A5FA]/10 text-[#60A5FA]" },
  { title: "Microsoft Corp. Q2 Earnings Release", date: "July 22, 2026", type: "EARNINGS", desc: "Earnings audio broadcast and deck", tagColor: "bg-[#2563EB]/15 text-[#2563EB]" }
];

export default function NewsEventsPage() {
  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Newspaper className="w-8 h-8 text-[#2563EB]" />
            <span>News & Corporate Events</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Upcoming Economic Events, Earnings Calendars & Policy Decisions
          </p>
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Events Calendar list */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B] font-mono">Macroeconomic Schedule</h2>
          <div className="glass-brutal-card p-6 flex flex-col gap-4 bg-white">
            {CALENDAR_EVENTS.map((event, idx) => (
              <div key={idx} className="flex gap-4 p-4 border-2 border-black rounded-xl bg-[#F8FAFC] shadow-[2px_2px_0px_#000000]">
                <div className={`px-2.5 py-1.5 h-fit rounded border-2 border-black font-mono text-[9px] font-black uppercase tracking-wider ${event.tagColor}`}>
                  {event.type}
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-xs font-black uppercase text-[#0F172A] leading-tight mb-1">{event.title}</h4>
                  <p className="text-[10px] font-mono text-black/50 leading-relaxed mb-2">{event.desc}</p>
                  <span className="text-[9px] font-mono font-bold text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded border border-[#2563EB]/25">
                    {event.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Global News summaries */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B] font-mono">Agent-Summarized Global Feeds</h2>
          <div className="glass-brutal-card p-6 flex flex-col gap-4 bg-white">
            <div className="flex flex-col gap-4">
              <div className="border-b border-black/5 pb-4 last:border-b-0">
                <span className="text-[9px] font-mono font-black text-[#2563EB] uppercase block">AI SUMMARY • 10m ago</span>
                <h4 className="text-xs font-black uppercase text-[#0F172A] mt-1">NVIDIA revenue forecast hits record levels</h4>
                <p className="text-[10px] font-mono text-[#64748B] mt-1.5 leading-relaxed">
                  Gross margins exceed analyst estimates. Hyperscalers boost capital expenditures into next quarter. News agent sentiment is BUY.
                </p>
              </div>
              <div className="border-b border-black/5 pb-4 last:border-b-0">
                <span className="text-[9px] font-mono font-black text-[#2563EB] uppercase block">AI SUMMARY • 1h ago</span>
                <h4 className="text-xs font-black uppercase text-[#0F172A] mt-1">EU opens antitrust probe on cloud AI tooling</h4>
                <p className="text-[10px] font-mono text-[#64748B] mt-1.5 leading-relaxed">
                  Regulatory review regarding core architecture lock-ins. Risk metrics updated slightly for index parameters.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
