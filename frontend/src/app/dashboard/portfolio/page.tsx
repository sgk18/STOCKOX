"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useDashboardStore } from "@/lib/store";
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Bot, 
  Briefcase, 
  Activity, 
  ArrowUpRight,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const HOLDINGS_DATA = [
  { ticker: "NVDA", name: "NVIDIA Corp.", allocation: 35, shares: 120, price: 187.20, value: 22464, change: 4.20, recommendation: "BUY" },
  { ticker: "AAPL", name: "Apple Inc.", allocation: 25, shares: 150, price: 178.45, value: 26767, change: 1.15, recommendation: "BUY" },
  { ticker: "MSFT", name: "Microsoft Corp.", allocation: 20, shares: 80, price: 415.50, value: 33240, change: 0.85, recommendation: "BUY" },
  { ticker: "TSLA", name: "Tesla Inc.", allocation: 12, shares: 70, price: 210.80, value: 14756, change: -2.40, recommendation: "HOLD" },
  { ticker: "AMD", name: "Advanced Micro Devices", allocation: 8, shares: 60, price: 162.30, value: 9738, change: -1.95, recommendation: "HOLD" },
];

const SECTOR_DATA = [
  { name: "Tech / AI Infrastructure", value: 55, color: "#2563EB" },
  { name: "Consumer Electronics", value: 25, color: "#3B82F6" },
  { name: "Automotive / EV", value: 12, color: "#60A5FA" },
  { name: "Semiconductors", value: 8, color: "#0F172A" },
];

export default function PortfolioPage() {
  const portfolio = useDashboardStore((state) => state.portfolio);

  const customTooltipStyle = {
    backgroundColor: "#FFFFFF",
    border: "3px solid #000000",
    borderRadius: "12px",
    fontFamily: "monospace",
    fontSize: "10px",
    fontWeight: "bold",
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header card */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Briefcase className="w-8 h-8 text-[#2563EB]" />
            <span>Portfolio Command Center</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Comprehensive holdings audit, risk metrics & AI asset reallocation proposals
          </p>
        </div>

        {/* Aggregate statistics */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#000000] flex flex-col min-w-[120px]">
            <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">NET BALANCE</span>
            <span className="text-xl font-black text-[#2563EB] font-mono">${portfolio.value.toLocaleString()}</span>
          </div>
          <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#000000] flex flex-col min-w-[120px]">
            <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">TODAY'S RETURN</span>
            <span className="text-xl font-black text-[#2563EB] font-mono">+{portfolio.changePercent}%</span>
          </div>
        </div>
      </section>

      {/* Charts section: Performance & Sector Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Performance Chart (8/12) */}
        <section className="col-span-1 lg:col-span-8 bg-white border-4 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_#000000]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-6 font-mono flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Portfolio Performance timeline (Net Assets)</span>
          </h3>

          <div className="h-72 w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolio.history}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#000000" strokeWidth={2} tickLine={false} />
                <YAxis stroke="#000000" strokeWidth={2} tickLine={false} domain={['dataMin - 1000', 'dataMax + 1000']} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sector Allocation Breakdown (4/12) */}
        <section className="col-span-1 lg:col-span-4 bg-white border-4 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_#000000]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-6 font-mono flex items-center gap-2">
            <PieChartIcon className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Asset Allocations</span>
          </h3>

          <div className="h-56 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SECTOR_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {SECTOR_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2 mt-4 font-mono text-[9px] uppercase">
            {SECTOR_DATA.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between border-b border-black/5 pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 border border-black rounded" style={{ backgroundColor: sector.color }} />
                  <span className="font-bold text-black/75">{sector.name}</span>
                </div>
                <span className="font-black text-[#2563EB]">{sector.value}%</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* holdings table */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Current Asset holdings</h2>
        <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                  <th className="py-3.5 px-5">Asset</th>
                  <th className="py-3.5 px-5">Allocation</th>
                  <th className="py-3.5 px-5">Holding Shares</th>
                  <th className="py-3.5 px-5">Price</th>
                  <th className="py-3.5 px-5">Value (USD)</th>
                  <th className="py-3.5 px-5">Daily Change</th>
                  <th className="py-3.5 px-5">AI Signal</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                {HOLDINGS_DATA.map((stock) => {
                  const isNegative = stock.change < 0;
                  return (
                    <tr key={stock.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-5 font-mono">
                        <div className="flex flex-col">
                          <span className="font-black text-[#2563EB] uppercase">{stock.ticker}</span>
                          <span className="text-[9px] font-bold text-black/40">{stock.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#2563EB] w-7">{stock.allocation}%</span>
                          <div className="w-16 bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                            <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${stock.allocation * 2}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold">{stock.shares}</td>
                      <td className="py-3.5 px-5 font-mono font-bold">${stock.price.toFixed(2)}</td>
                      <td className="py-3.5 px-5 font-mono font-black">${stock.value.toLocaleString()}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-black ${isNegative ? "text-[#EF4444]" : "text-[#2563EB]"}`}>
                          {isNegative ? "" : "+"}{stock.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase ${
                          stock.recommendation === "BUY" ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25" : "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/25"
                        }`}>
                          {stock.recommendation}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <a
                          href={`/dashboard/research-terminal?ticker=${stock.ticker}`}
                          className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-black hover:text-white hover:shadow-[1.5px_1.5px_0px_#2563EB] active:translate-y-[1px] transition-all"
                        >
                          Analyze
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Grid: Risk analysis & AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Risk Analysis (1/2) */}
        <section className="glass-brutal-card p-6 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-2 font-mono flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Risk Exposure metrics</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Portfolio Beta</span>
              <span className="text-lg font-black text-[#0F172A] font-mono">1.18 <span className="text-[9px] text-[#64748B] uppercase font-bold">(vs S&P 500)</span></span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Sharpe Ratio</span>
              <span className="text-lg font-black text-[#2563EB] font-mono">2.41 <span className="text-[9px] text-[#64748B] uppercase font-bold">(Annualized)</span></span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Max Drawdown</span>
              <span className="text-lg font-black text-black/85 font-mono">-14.2%</span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">95% Daily VaR</span>
              <span className="text-lg font-black text-[#2563EB] font-mono">$4,820</span>
            </div>
          </div>
        </section>

        {/* AI Reallocation Suggestions (1/2) */}
        <section className="glass-brutal-card p-6 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-2 font-mono flex items-center gap-2">
            <Bot className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>AI Reallocation Proposals</span>
          </h3>

          <div className="flex flex-col gap-3 font-mono text-xs text-[#0F172A]">
            <div className="flex items-start gap-2.5 bg-[#2563EB]/5 border border-[#2563EB]/25 p-3 rounded-xl">
              <ArrowRight className="w-4.5 h-4.5 text-[#2563EB] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-black text-[#2563EB] uppercase block text-[10px]">Overweight AI Infrastructures</span>
                <p className="text-[10px] text-black/75 mt-1 leading-normal">
                  Increase NVDA allocation to 40% using dividends. Core data center revenues provide high downside security margin.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
              <ArrowRight className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-black text-amber-600 uppercase block text-[10px]">Reduce EV exposure weight</span>
                <p className="text-[10px] text-black/75 mt-1 leading-normal">
                  Trim TSLA holdings from 12% to 8% allocation due to delivery saturation sentiments. Reallocate balance to defensive MSFT shares.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
