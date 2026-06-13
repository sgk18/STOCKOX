"use client";

import React from "react";
import { Compass } from "lucide-react";
import { SearchStockResult } from "@/lib/searchStore";
import Button from "../../ui/Button";

interface SearchResultsProps {
  results: SearchStockResult[];
  onAnalyze: (stock: SearchStockResult) => void;
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
          return (
            <div
              key={stock.ticker}
              className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_#000000] hover:shadow-[7px_7px_0px_#000000] hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FACC15] border-3 border-black rounded-xl flex items-center justify-center font-black text-md shadow-[2px_2px_0px_#000000]">
                      {stock.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#0F172A] text-sm md:text-base leading-tight">
                        {stock.name}
                      </h4>
                      <span className="font-mono font-bold text-[10px] bg-black text-[#FACC15] px-1.5 py-0.5 rounded border border-black inline-block mt-1">
                        {stock.ticker}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-2 gap-4 border-t-2 border-black/10 py-4 mb-6 font-mono text-xs">
                  <div>
                    <span className="text-black/40 font-bold block uppercase tracking-wider text-[9px] mb-1">
                      Exchange
                    </span>
                    <span className="font-black text-black/80">{stock.exchange || "US Markets"}</span>
                  </div>
                  <div>
                    <span className="text-black/40 font-bold block uppercase tracking-wider text-[9px] mb-1">
                      Industry
                    </span>
                    <span className="font-black text-black/80 truncate block">{stock.industry || "Equities"}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                onClick={() => onAnalyze(stock)}
                leftIcon={<Compass className="w-4.5 h-4.5 text-white animate-spin" style={{ animationDuration: "12s" }} />}
                className="w-full text-xs font-extrabold uppercase py-3 border-2"
              >
                Analyze Market Profile
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
