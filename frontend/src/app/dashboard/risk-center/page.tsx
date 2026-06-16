"use client";

import React from "react";
import { ShieldAlert, Zap, ShieldCheck, Activity } from "lucide-react";

export default function RiskCenterPage() {
  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-[#2563EB]" />
            <span>Risk Management Center</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Value at Risk Models, Correlation Coefficients & Portfolio Stress Tests
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Matrices */}
        <section className="glass-brutal-card p-6 flex flex-col gap-6 bg-white">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span>Risk exposure parameters</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Sharpe Ratio</span>
              <span className="text-lg font-black text-[#2563EB]">2.41</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Portfolio Beta</span>
              <span className="text-lg font-black text-[#0F172A]">1.18</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Volatility Meter</span>
              <span className="text-lg font-black text-[#2563EB]">14.2%</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000] font-mono">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Value at Risk (VaR)</span>
              <span className="text-lg font-black text-[#2563EB]">$4,820</span>
            </div>
          </div>
        </section>

        {/* Sector Exposure Breakdown */}
        <section className="glass-brutal-card p-6 flex flex-col gap-6 bg-white">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b border-black/5 pb-3 font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB]" />
            <span>Exposure breakdowns</span>
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                <span>TECHNOLOGY / AI INFRASTRUCTURE</span>
                <span>55%</span>
              </div>
              <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: "55%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                <span>CONSUMER ELECTRONICS</span>
                <span>25%</span>
              </div>
              <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                <div className="bg-[#3B82F6] h-full rounded-full" style={{ width: "25%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono font-black mb-1">
                <span>AUTOMOTIVE / EV</span>
                <span>12%</span>
              </div>
              <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                <div className="bg-[#60A5FA] h-full rounded-full" style={{ width: "12%" }} />
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
