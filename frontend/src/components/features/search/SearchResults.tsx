"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Compass, ShieldCheck } from "lucide-react";
import { StockDetails } from "@/lib/analysisStore";
import Button from "../../ui/Button";

interface SearchResultsProps {
  results: StockDetails[];
  onAnalyze: (stock: StockDetails) => void;
}

export default function SearchResults({ results, onAnalyze }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 select-none">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-black" />
        <h3 className="text-sm font-black uppercase tracking-wider text-[#0F172A]">
          Search Results ({results.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((stock) => {
          const isPositive = stock.daily_change >= 0;
          return (
            <div
              key={stock.ticker}
              className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_#000000] hover:shadow-[7px_7px_0px_#000000] hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Logo & Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FACC15] border-3 border-black rounded-xl flex items-center justify-center font-black text-md shadow-[2px_2px_0px_#000000]">
                      {stock.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#0F172A] text-lg leading-tight">
                        {stock.company_name}
                      </h4>
                      <span className="font-mono font-bold text-xs bg-black text-[#FACC15] px-1.5 py-0.5 rounded border border-black inline-block mt-1">
                        {stock.ticker}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xl text-[#0F172A] block">
                      ${stock.current_price.toFixed(2)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-black uppercase px-2 py-0.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000000] mt-1 ${
                        isPositive
                          ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30"
                          : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {isPositive ? "+" : ""}
                      {stock.daily_change_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-black/60 font-bold mb-4 line-clamp-2">
                  {stock.overview}
                </p>

                {/* Grid Information */}
                <div className="grid grid-cols-2 gap-4 border-t-2 border-b-2 border-black/10 py-4 mb-6 font-mono text-xs">
                  <div>
                    <span className="text-black/40 font-bold block uppercase tracking-wider text-[9px] mb-1">
                      Sector
                    </span>
                    <span className="font-black text-black/80">{stock.sector}</span>
                  </div>
                  <div>
                    <span className="text-black/40 font-bold block uppercase tracking-wider text-[9px] mb-1">
                      Market Capitalization
                    </span>
                    <span className="font-black text-black/80">{stock.market_cap}</span>
                  </div>
                  <div>
                    <span className="text-black/40 font-bold block uppercase tracking-wider text-[9px] mb-1">
                      Industry
                    </span>
                    <span className="font-black text-black/80 truncate block">{stock.industry}</span>
                  </div>
                  <div>
                    <span className="text-black/40 font-bold block uppercase tracking-wider text-[9px] mb-1">
                      AI Sentiment Score
                    </span>
                    <span className="font-black text-[#2563EB] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{stock.ai_score}/100</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                onClick={() => onAnalyze(stock)}
                leftIcon={<Compass className="w-4.5 h-4.5 text-white animate-spin" style={{ animationDuration: "12s" }} />}
                className="w-full text-sm font-extrabold uppercase py-3 border-2"
              >
                Analyze Advisory profile
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
