"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Eye, ShieldAlert, Star } from "lucide-react";
import { WatchlistItem } from "@/lib/store";

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (ticker: string) => void;
}

export default function WatchlistTable({ items, onRemove }: WatchlistTableProps) {
  return (
    <div className="bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000000] flex flex-col h-[450px] overflow-hidden select-none">
      {/* Table Header Section */}
      <div className="p-4 border-b-3 border-black bg-[#F8FAFC] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#FACC15] fill-[#FACC15] stroke-black stroke-2" />
          <span className="text-sm font-black uppercase tracking-wider text-[#0F172A]">AI Active Watchlist</span>
        </div>
        <span className="text-[10px] bg-black text-[#FACC15] border border-black font-black uppercase px-2 py-0.5 rounded">
          {items.length} Tracked
        </span>
      </div>

      {/* Table Body - Scrollable */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black/10 bg-[#F8FAFC] text-[10px] font-black uppercase text-black/50 tracking-wider">
              <th className="py-3 px-4">Ticker</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">24h Change</th>
              <th className="py-3 px-4 text-center">AI Score</th>
              <th className="py-3 px-4">Risk</th>
              <th className="py-3 px-4 text-center">Rec</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isPositive = item.changePercent >= 0;
              return (
                <tr
                  key={item.ticker}
                  className="border-b border-black/10 hover:bg-[#F8FAFC] group font-semibold text-sm transition-colors"
                >
                  {/* Ticker Name */}
                  <td className="py-3.5 px-4 font-black">
                    <div className="flex flex-col">
                      <span className="text-[#0F172A] tracking-wide text-base">{item.ticker}</span>
                      <span className="text-[10px] text-black/40 font-bold uppercase">{item.name}</span>
                    </div>
                  </td>
                  
                  {/* Price */}
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A]">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* 24h Change */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-0.5 font-bold ${
                      isPositive ? "text-[#22C55E]" : "text-[#EF4444]"
                    }`}>
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>{isPositive ? "+" : ""}{item.changePercent}%</span>
                    </span>
                  </td>

                  {/* AI Score */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded font-black text-xs border border-black bg-[#FACC15] shadow-[1px_1px_0px_#000000]">
                      {item.aiScore}
                    </span>
                  </td>

                  {/* Risk Tag */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000000] ${
                      item.risk === "High"
                        ? "bg-[#EF4444] text-white"
                        : item.risk === "Medium"
                        ? "bg-[#FACC15] text-black"
                        : "bg-[#22C55E] text-black"
                    }`}>
                      {item.risk === "High" && <ShieldAlert className="w-3 h-3" />}
                      {item.risk}
                    </span>
                  </td>

                  {/* Recommendation Button */}
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000000] ${
                      item.recommendation === "BUY"
                        ? "bg-[#22C55E] text-black"
                        : item.recommendation === "SELL"
                        ? "bg-[#EF4444] text-white"
                        : "bg-[#FACC15] text-black"
                    }`}>
                      {item.recommendation}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onRemove(item.ticker)}
                      className="p-1 border-2 border-black rounded-lg hover:bg-[#EF4444] hover:text-white transition-colors cursor-pointer"
                      title="Untrack Stock"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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
