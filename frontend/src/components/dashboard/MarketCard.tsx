"use client";

import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MarketOverview } from "@/lib/store";

interface MarketCardProps {
  data: MarketOverview;
}

export default function MarketCard({ data }: MarketCardProps) {
  const isPositive = data.changePercent >= 0;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000000] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all duration-200 select-none flex flex-col justify-between h-[155px]">
      {/* Index Name and Price Summary */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-xs font-black text-black/50 uppercase tracking-widest">{data.name}</h4>
          <span className="text-xl font-black tracking-tight text-[#0F172A] block mt-1">
            {data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-black border-2 border-black px-1.5 py-0.5 rounded shadow-[1.5px_1.5px_0px_#000000] uppercase ${
          isPositive ? "bg-[#2563EB] text-white" : "bg-[#EF4444] text-white"
        }`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? "+" : ""}{data.changePercent}%</span>
        </span>
      </div>

      {/* Recharts Area Sparkline */}
      <div className="h-12 w-full mt-2 overflow-hidden rounded-lg">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`grad-${data.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "#2563EB" : "#EF4444"} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={isPositive ? "#2563EB" : "#EF4444"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#2563EB" : "#EF4444"}
                strokeWidth={2.5}
                fill={`url(#grad-${data.name})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
