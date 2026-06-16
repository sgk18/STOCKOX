"use client";

import React from "react";
import { Eye, Plus, ArrowUpRight, Search, Activity, Sliders } from "lucide-react";
import { useDashboardStore } from "@/lib/store";

export default function WatchlistsPage() {
  const watchlist = useDashboardStore((state) => state.watchlist);

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Eye className="w-8 h-8 text-[#2563EB]" />
            <span>Watchlists Terminal</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Custom Security tracking arrays & Real-time alert indices
          </p>
        </div>
      </section>

      {/* List */}
      <div className="bg-white border-3 border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_#000000]">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
              <th className="py-3.5 px-6">TICKER</th>
              <th className="py-3.5 px-6">COMPANY NAME</th>
              <th className="py-3.5 px-6">PRICE</th>
              <th className="py-3.5 px-6">DAILY CHANGE</th>
              <th className="py-3.5 px-6">AI SCORE</th>
              <th className="py-3.5 px-6">RECOMMENDATION</th>
              <th className="py-3.5 px-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
            {watchlist.map((item) => {
              const isNegative = item.changePercent < 0;
              return (
                <tr key={item.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-6 font-mono font-black text-[#2563EB] uppercase">{item.ticker}</td>
                  <td className="py-4 px-6 font-black text-[#0F172A]">{item.name}</td>
                  <td className="py-4 px-6 font-mono font-bold">${item.price.toFixed(2)}</td>
                  <td className="py-4 px-6 font-mono">
                    <span className={`inline-flex items-center gap-0.5 font-black uppercase ${isNegative ? "text-[#EF4444]" : "text-[#2563EB]"}`}>
                      {isNegative ? "" : "+"}{item.changePercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono font-black text-[#2563EB]">{item.aiScore}%</td>
                  <td className="py-4 px-6">
                    <span className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/35 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg">
                      {item.recommendation}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <a
                      href={`/dashboard/research-terminal?ticker=${item.ticker}`}
                      className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-black hover:text-white transition-all shadow-[1.5px_1.5px_0px_#000000]"
                    >
                      Audit
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
