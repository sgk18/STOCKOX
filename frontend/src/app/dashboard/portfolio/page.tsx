"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/lib/store";
import { motion } from "framer-motion";
import { 
  PieChart as PieChartIcon, 
  ShieldAlert, 
  Bot, 
  Briefcase, 
  Activity, 
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
  Cell
} from "recharts";

interface Holding {
  ticker: string;
  company_name: string;
  quantity: number;
  average_price: number;
  current_price: number;
  value: number;
  change_percent: number;
  recommendation: string;
}

const TickerSectorMap: Record<string, string> = {
  NVDA: "Tech / AI Infrastructure",
  MSFT: "Tech / AI Infrastructure",
  AAPL: "Consumer Electronics",
  TSLA: "Automotive / EV",
  AMD: "Semiconductors",
};

const SECTOR_COLORS: Record<string, string> = {
  "Tech / AI Infrastructure": "#2563EB",
  "Consumer Electronics": "#3B82F6",
  "Automotive / EV": "#60A5FA",
  "Semiconductors": "#0F172A",
  "Other": "#64748B"
};

export default function PortfolioPage() {
  const { getToken, isSignedIn } = useAuth();
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);

  // 1. Fetch dynamic portfolio holdings and valuation details
  const { data: portfolioData, isLoading: isPortLoading, error: portError } = useQuery({
    queryKey: ["portfolio-summary", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/dashboard/portfolio${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load portfolio stats.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  // 2. Fetch portfolio risk exposure metrics
  const { data: riskData, isLoading: isRiskLoading, error: riskError } = useQuery({
    queryKey: ["portfolio-risk", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/dashboard/risk${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load risk exposure stats.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  // Console logging React Query variables (Step 5)
  React.useEffect(() => {
    console.log("[REACT-QUERY-PORTFOLIO-SUMMARY] Status:", {
      isLoading: isPortLoading,
      isError: !!portError,
      error: portError ? (portError as Error).message : null,
      data: portfolioData
    });
  }, [isPortLoading, portError, portfolioData]);

  React.useEffect(() => {
    console.log("[REACT-QUERY-PORTFOLIO-RISK] Status:", {
      isLoading: isRiskLoading,
      isError: !!riskError,
      error: riskError ? (riskError as Error).message : null,
      data: riskData
    });
  }, [isRiskLoading, riskError, riskData]);

  const customTooltipStyle = {
    backgroundColor: "#FFFFFF",
    border: "3px solid #000000",
    borderRadius: "12px",
    fontFamily: "monospace",
    fontSize: "10px",
    fontWeight: "bold",
  };

  const holdings: Holding[] = portfolioData?.holdings || [];
  const chartHistory = portfolioData?.history || [];
  const totalValue = portfolioData?.value || 100000;
  const cashBalance = portfolioData?.cash_balance || 100000;
  const dailyChangeAmount = portfolioData?.change_amount || 0;
  const dailyChangePercent = portfolioData?.change_percent || 0;

  // 3. Compute dynamic sector allocations from fetched stock details
  const sectorAllocations = holdings.reduce((acc, stock) => {
    const sector = TickerSectorMap[stock.ticker] || "Other";
    acc[sector] = (acc[sector] || 0) + stock.value;
    return acc;
  }, {} as Record<string, number>);

  // Include remaining cash balance in "Other" or "Cash" sector if desired, or group stock value only
  if (cashBalance > 0 && totalValue > 0) {
    sectorAllocations["Cash / Liquid Assets"] = cashBalance;
  }

  const sectorData = Object.entries(sectorAllocations).map(([name, val]) => ({
    name,
    value: totalValue > 0 ? Math.round((val / totalValue) * 100) : 0,
    color: SECTOR_COLORS[name] || "#64748B"
  })).filter(s => s.value > 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8"
    >
      
      {/* Header card */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Briefcase className="w-8 h-8 text-[#2563EB]" />
            <span>Portfolio Command Center</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            {isDemoMode ? "DEMO MODE: Simulating Nvidia, Apple, Microsoft, Tesla, and AMD holdings" : "Authentic empty client portfolio (Cash Account Balance)"}
          </p>
        </div>

        {/* Aggregate statistics */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#000000] flex flex-col min-w-[120px]">
            <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">NET BALANCE</span>
            <span className="text-xl font-black text-[#2563EB] font-mono">
              {isPortLoading ? (
                "Loading..."
              ) : portError ? (
                <span className="text-xs text-[#EF4444] font-black">Error</span>
              ) : (
                `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </span>
          </div>
          <div className="bg-[#2563EB]/10 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#000000] flex flex-col min-w-[120px]">
            <span className="text-[8px] font-black uppercase text-black/40 tracking-wider">TODAY&apos;S RETURN</span>
            <span className="text-xl font-black text-[#2563EB] font-mono">
              {isPortLoading ? (
                "..."
              ) : portError ? (
                <span className="text-xs text-[#EF4444] font-black">Error</span>
              ) : (
                `${dailyChangeAmount >= 0 ? "+" : ""}${dailyChangePercent.toFixed(2)}%`
              )}
            </span>
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

          <div className="h-72 w-full font-mono text-[10px] flex items-center justify-center">
            {isPortLoading ? (
              <span className="uppercase text-black/50 tracking-wider font-black animate-pulse">Loading performance chart...</span>
            ) : portError ? (
              <span className="uppercase text-[#EF4444] tracking-wider font-black">Failed to load performance timeline</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistory}>
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
            )}
          </div>
        </section>

        {/* Sector Allocation Breakdown (4/12) */}
        <section className="col-span-1 lg:col-span-4 bg-white border-4 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_#000000]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-6 font-mono flex items-center gap-2">
            <PieChartIcon className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>Asset Allocations</span>
          </h3>

          <div className="h-56 w-full flex justify-center items-center">
            {isRiskLoading ? (
              <span className="font-mono text-[10px] text-[#64748B] uppercase animate-pulse">Loading asset allocations...</span>
            ) : riskError ? (
              <span className="font-mono text-[10px] text-[#EF4444] uppercase">Failed to load allocations</span>
            ) : sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="font-mono text-[10px] text-[#64748B] uppercase">No Holdings Allocated</span>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4 font-mono text-[9px] uppercase">
            {sectorData.map((sector) => (
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
                  <th className="py-3.5 px-5">Average Price</th>
                  <th className="py-3.5 px-5">Current Price</th>
                  <th className="py-3.5 px-5">Value (USD)</th>
                  <th className="py-3.5 px-5">Daily Change</th>
                  <th className="py-3.5 px-5">AI Signal</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                {holdings.length > 0 ? (
                  holdings.map((stock) => {
                    const isNegative = stock.change_percent < 0;
                    const allocation = totalValue > 0 ? Math.round((stock.value / totalValue) * 100) : 0;
                    return (
                      <tr key={stock.ticker} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5 font-mono">
                          <div className="flex flex-col">
                            <span className="font-black text-[#2563EB] uppercase">{stock.ticker}</span>
                            <span className="text-[9px] font-bold text-black/40">{stock.company_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#2563EB] w-7">{allocation}%</span>
                            <div className="w-16 bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                              <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${allocation * 2}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold">{stock.quantity.toFixed(0)}</td>
                        <td className="py-3.5 px-5 font-mono font-bold">${stock.average_price.toFixed(2)}</td>
                        <td className="py-3.5 px-5 font-mono font-bold">${stock.current_price.toFixed(2)}</td>
                        <td className="py-3.5 px-5 font-mono font-black">${stock.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-black ${isNegative ? "text-[#EF4444]" : "text-[#2563EB]"}`}>
                            {isNegative ? "" : "+"}{stock.change_percent.toFixed(2)}%
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
                            href={`/research/${stock.ticker}`}
                            className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-[9px] font-black uppercase hover:bg-black hover:text-white hover:shadow-[1.5px_1.5px_0px_#2563EB] active:translate-y-[1px] transition-all"
                          >
                            Analyze
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center font-mono text-xs uppercase text-black/55">
                      No assets found in advisor holdings. Toggle &quot;Demo Mode&quot; to simulate portfolio.
                    </td>
                  </tr>
                )}
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
              <span className="text-lg font-black text-[#0F172A] font-mono">
                {(riskData?.volatility_score || 1.18).toFixed(2)} <span className="text-[9px] text-[#64748B] uppercase font-bold">(vs S&P 500)</span>
              </span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Sharpe Ratio</span>
              <span className="text-lg font-black text-[#2563EB] font-mono">2.41 <span className="text-[9px] text-[#64748B] uppercase font-bold">(Annualized)</span></span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Concentration Risk</span>
              <span className="text-lg font-black text-black/85 font-mono">
                {(riskData?.concentration_risk || 0).toFixed(1)}%
              </span>
            </div>
            <div className="border-2 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">95% Daily VaR</span>
              <span className="text-lg font-black text-[#2563EB] font-mono">
                ${((totalValue * 0.038) || 4820).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </section>

        {/* AI Reallocation Suggestions (1/2) */}
        <section className="glass-brutal-card p-6 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-2 font-mono flex items-center gap-2">
            <Bot className="w-4.5 h-4.5 text-[#2563EB]" />
            <span>AI Risk Commentary</span>
          </h3>

          <div className="flex flex-col gap-3 font-mono text-xs text-[#0F172A]">
            <div className="flex items-start gap-2.5 bg-[#2563EB]/5 border border-[#2563EB]/25 p-4 rounded-xl">
              <ArrowRight className="w-4.5 h-4.5 text-[#2563EB] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-black text-[#2563EB] uppercase block text-[10px]">OPERATIONAL AUDIT REPORT</span>
                <p className="text-[10px] text-black/75 mt-1.5 leading-normal">
                  {riskData?.risk_commentary || "No active holdings. Please allocate capital or enable Demo Mode to populate AI advisory commentary."}
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>

    </motion.div>
  );
}
