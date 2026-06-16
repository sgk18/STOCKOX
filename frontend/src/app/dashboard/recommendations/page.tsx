"use client";

import React from "react";
import { Award, ArrowUpRight, ShieldCheck, Activity } from "lucide-react";

const RECOMMENDATIONS = [
  { ticker: "NVDA", recommendation: "STRONG BUY", confidence: 94, target: "$210.00", risk: "Low", generator: "Committee Synth", time: "10 min ago" },
  { ticker: "MSFT", recommendation: "BUY", confidence: 88, target: "$450.00", risk: "Low", generator: "Technical Agent", time: "25 min ago" },
  { ticker: "AAPL", recommendation: "BUY", confidence: 82, target: "$195.00", risk: "Low", generator: "Research Agent", time: "1 hour ago" },
  { ticker: "AMD", recommendation: "HOLD", confidence: 71, target: "$175.00", risk: "Medium", generator: "Risk Agent", time: "3 hours ago" },
  { ticker: "TSLA", recommendation: "HOLD", confidence: 64, target: "$220.00", risk: "High", generator: "Committee Synth", time: "5 hours ago" }
];

export default function RecommendationsPage() {
  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Award className="w-8 h-8 text-[#2563EB]" />
            <span>AI Trade Recommendations</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Orchestrated Investment Signals & Targeted Consensus Buy tickets
          </p>
        </div>
      </section>

      {/* Main Table */}
      <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
              <th className="py-3.5 px-6">TICKER</th>
              <th className="py-3.5 px-6">RECOMMENDATION</th>
              <th className="py-3.5 px-6">CONFIDENCE</th>
              <th className="py-3.5 px-6">TARGET PRICE</th>
              <th className="py-3.5 px-6">RISK EXPOSURE</th>
              <th className="py-3.5 px-6">COMPILED BY</th>
              <th className="py-3.5 px-6 text-right">TIMESTAMP</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
            {RECOMMENDATIONS.map((item) => (
              <tr key={item.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-4 px-6 font-mono font-black text-[#0F172A] uppercase">{item.ticker}</td>
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase ${
                    item.recommendation.includes("BUY")
                      ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/35"
                      : "bg-amber-500/10 text-[#F59E0B] border-[#F59E0B]/30"
                  }`}>
                    {item.recommendation}
                  </span>
                </td>
                <td className="py-4 px-6 font-mono font-black text-[#2563EB]">{item.confidence}%</td>
                <td className="py-4 px-6 font-mono font-bold text-black/75">{item.target}</td>
                <td className="py-4 px-6 font-bold uppercase text-[10px]">{item.risk}</td>
                <td className="py-4 px-6 font-mono text-[#64748B] text-[10px]">{item.generator}</td>
                <td className="py-4 px-6 text-right font-mono text-black/45 text-[10px]">{item.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
