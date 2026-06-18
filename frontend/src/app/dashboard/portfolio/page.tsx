"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PieChart as PieChartIcon, 
  ShieldAlert, 
  Bot, 
  Briefcase, 
  Activity, 
  ArrowRight,
  TrendingUp,
  ArrowUpDown,
  Search,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  History,
  X,
  Sparkles,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  HelpCircle
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
import Link from "next/link";

interface Holding {
  ticker: string;
  company_name: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  return_percent: number;
  allocation_percent: number;
  sector: string;
}

interface AuditAlert {
  type: string;
  category: string;
  message: string;
}

const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#2563EB",
  "Consumer Electronics": "#3B82F6",
  "Automotive": "#60A5FA",
  "Semiconductors": "#0F172A",
  "Entertainment": "#F59E0B",
  "Internet Retail": "#10B981",
  "Other": "#64748B",
  "Cash / Liquid Assets": "#E2E8F0"
};

export default function PortfolioPage() {
  const { getToken, isSignedIn } = useAuth();
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Holding>("ticker");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Buy/Sell Order states
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [orderTicker, setOrderTicker] = useState("");
  const [orderQuantity, setOrderQuantity] = useState<number | "">("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Rebalancing states
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [rebalanceData, setRebalanceData] = useState<any>(null);
  const [isRebalanceLoading, setIsRebalanceLoading] = useState(false);

  // 1. Fetch dynamic portfolio overview (balance, daily return, audit commentary)
  const { data: summary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ["portfolio-summary", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/portfolio${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load portfolio overview.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 10000,
  });

  // 2. Fetch portfolio holdings
  const { data: holdings = [], isLoading: isHoldingsLoading, error: holdingsError, refetch: refetchHoldings } = useQuery<Holding[]>({
    queryKey: ["portfolio-holdings-list", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/holdings${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load holdings.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 10000,
  });

  // 3. Fetch portfolio performance timeline & statistics
  const { data: perfData, isLoading: isPerfLoading, error: perfError } = useQuery({
    queryKey: ["portfolio-performance-timeline", isDemoMode],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/performance${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load performance metrics.");
      return res.json();
    },
    enabled: isSignedIn,
    refetchInterval: 30000,
  });

  // Execute buy or sell order
  const handleExecuteTrade = async (type: "BUY" | "SELL") => {
    if (!orderTicker.trim() || !orderQuantity || Number(orderQuantity) <= 0) {
      setOrderError("Please enter a valid ticker and quantity.");
      return;
    }
    setIsSubmittingOrder(true);
    setOrderError("");
    setOrderSuccess("");

    try {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/${type.toLowerCase()}${isDemoMode ? "?demo=true" : ""}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ticker: orderTicker.toUpperCase().trim(),
          quantity: Number(orderQuantity)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to execute ${type} order.`);
      }

      setOrderSuccess(`Order Filled: ${type} ${orderQuantity} shares of ${orderTicker.toUpperCase()}`);
      refetchSummary();
      refetchHoldings();

      setTimeout(() => {
        setShowBuyModal(false);
        setShowSellModal(false);
        setOrderTicker("");
        setOrderQuantity("");
        setOrderSuccess("");
      }, 1500);
    } catch (err: any) {
      setOrderError(err.message || "An error occurred during order execution.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Run AI Rebalancer
  const handleRunRebalance = async () => {
    setIsRebalanceLoading(true);
    setShowRebalanceModal(true);
    setRebalanceData(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/portfolio/rebalance${isDemoMode ? "?demo=true" : ""}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to generate rebalancing analysis.");
      const data = await res.json();
      setRebalanceData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRebalanceLoading(false);
    }
  };

  // Sorting logic
  const handleSort = (field: keyof Holding) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedHoldings = holdings
    .filter(
      (h) =>
        h.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });

  const totalValue = summary?.total_value || 100000;
  const cashBalance = summary?.cash_balance || 100000;
  const investedCapital = summary?.invested_capital || 0;
  const profitLoss = summary?.profit_loss || 0;
  const returnPercent = summary?.return_percent || 0;
  const auditAlerts: AuditAlert[] = summary?.audit || [];
  const metrics = summary?.metrics || perfData?.performance || {};

  // Compute sector allocations for chart
  const sectorAllocations = holdings.reduce((acc, stock) => {
    const sector = stock.sector || "Other";
    acc[sector] = (acc[sector] || 0) + stock.market_value;
    return acc;
  }, {} as Record<string, number>);

  if (cashBalance > 0 && totalValue > 0) {
    sectorAllocations["Cash / Liquid Assets"] = cashBalance;
  }

  const sectorData = Object.entries(sectorAllocations)
    .map(([name, val]) => ({
      name,
      value: totalValue > 0 ? Math.round((val / totalValue) * 100) : 0,
      color: SECTOR_COLORS[name] || "#64748B"
    }))
    .filter((s) => s.value > 0);

  const customTooltipStyle = {
    backgroundColor: "#FFFFFF",
    border: "3px solid #000000",
    borderRadius: "0px",
    fontFamily: "monospace",
    fontSize: "11px",
    fontWeight: "bold",
    boxShadow: "2px 2px 0px #000000"
  };

  const chartHistory = perfData?.history || [];

  // Skeleton Loaders
  if (isSummaryLoading || isHoldingsLoading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse p-4">
        <div className="h-32 bg-gray-200 border-4 border-black rounded-[24px]"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-24 bg-gray-200 border-4 border-black rounded-[20px]"></div>
          <div className="h-24 bg-gray-200 border-4 border-black rounded-[20px]"></div>
          <div className="h-24 bg-gray-200 border-4 border-black rounded-[20px]"></div>
          <div className="h-24 bg-gray-200 border-4 border-black rounded-[20px]"></div>
        </div>
        <div className="h-80 bg-gray-200 border-4 border-black rounded-[24px]"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8 pb-12 select-none"
    >
      {/* Top Header Panel */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-3">
            <Briefcase className="w-9 h-9 text-[#2563EB] shrink-0" />
            <span>Investment Command Center</span>
          </h1>
          <p className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block border border-black animate-pulse" />
            {isDemoMode ? "DEMO PORTFOLIO ACTIVE — SIMULATED EXECUTION" : "LIVE PORTFOLIO ACTIVE — SUPABASE SYNCED"}
          </p>
        </div>

        {/* Global CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => { setOrderTicker(""); setOrderQuantity(""); setOrderError(""); setOrderSuccess(""); setShowBuyModal(true); }}
            className="bg-[#2563EB] text-white border-3 border-black font-black uppercase text-xs px-5 py-3 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] shadow-[3px_3px_0px_#000000] transition-all cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Buy Stock
          </button>
          <button 
            onClick={() => { setOrderTicker(""); setOrderQuantity(""); setOrderError(""); setOrderSuccess(""); setShowSellModal(true); }}
            className="bg-white text-black border-3 border-black font-black uppercase text-xs px-5 py-3 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] shadow-[3px_3px_0px_#000000] transition-all cursor-pointer flex items-center gap-2"
          >
            <MinusCircle className="w-4 h-4" />
            Sell Stock
          </button>
          <button 
            onClick={handleRunRebalance}
            className="bg-yellow-400 text-black border-3 border-black font-black uppercase text-xs px-5 py-3 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] shadow-[3px_3px_0px_#000000] transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            AI Rebalancer
          </button>
          <Link 
            href="/dashboard/portfolio/history"
            className="bg-[#0F172A] text-white border-3 border-black font-black uppercase text-xs px-5 py-3 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#2563EB] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2563EB] shadow-[3px_3px_0px_#000000] transition-all flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Ledger Logs
          </Link>
        </div>
      </section>

      {/* Overview Stat Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white border-3 border-black p-5 rounded-[20px] shadow-[4px_4px_0px_#000000] flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Total Assets (Net)</span>
          <span className="text-2xl font-black text-black font-mono mt-2">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white border-3 border-black p-5 rounded-[20px] shadow-[4px_4px_0px_#000000] flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Invested Capital</span>
          <span className="text-2xl font-black text-black font-mono mt-2">
            ${investedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white border-3 border-black p-5 rounded-[20px] shadow-[4px_4px_0px_#000000] flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Liquid Cash Balance</span>
          <span className="text-2xl font-black text-[#2563EB] font-mono mt-2">
            ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white border-3 border-black p-5 rounded-[20px] shadow-[4px_4px_0px_#000000] flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Net Profit & Loss</span>
          <span className={`text-2xl font-black font-mono mt-2 ${profitLoss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {profitLoss >= 0 ? "+" : ""}${profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white border-3 border-black p-5 rounded-[20px] shadow-[4px_4px_0px_#000000] flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-[#64748B] tracking-wider font-mono">Total Return %</span>
          <span className={`text-2xl font-black font-mono mt-2 ${returnPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {returnPercent >= 0 ? "+" : ""}{returnPercent.toFixed(2)}%
          </span>
        </div>
      </section>

      {/* Analytics and Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Performance Chart Timeline */}
        <div className="col-span-1 lg:col-span-8 bg-white border-4 border-black rounded-[24px] p-6 shadow-[5px_5px_0px_#000000]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3.5 mb-6 font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5.5 h-5.5 text-[#2563EB]" />
              Portfolio Value Walk (Last 30 Days)
            </span>
          </h3>

          <div className="h-80 w-full font-mono text-[10px]">
            {isPerfLoading ? (
              <div className="h-full w-full flex items-center justify-center font-bold uppercase text-black/40">Loading history...</div>
            ) : chartHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistory}>
                  <defs>
                    <linearGradient id="chartBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#000000" strokeWidth={2.5} tickLine={false} />
                  <YAxis stroke="#000000" strokeWidth={2.5} tickLine={false} domain={["dataMin - 5000", "dataMax + 5000"]} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={4.5} fillOpacity={1} fill="url(#chartBlue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center font-bold uppercase text-black/40">No Performance Data Captured Yet.</div>
            )}
          </div>
        </div>

        {/* Sector Allocation pie chart */}
        <div className="col-span-1 lg:col-span-4 bg-white border-4 border-black rounded-[24px] p-6 shadow-[5px_5px_0px_#000000]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3.5 mb-6 font-mono flex items-center gap-2">
            <PieChartIcon className="w-5.5 h-5.5 text-[#2563EB]" />
            <span>Asset Allocations</span>
          </h3>

          <div className="h-56 w-full flex justify-center items-center">
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={2.5} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs font-mono font-bold uppercase text-black/40">No holdings allocated</div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4 font-mono text-[9px] uppercase">
            {sectorData.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between border-b border-black/5 pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-black rounded-sm" style={{ backgroundColor: sector.color }} />
                  <span className="font-bold text-black/75">{sector.name}</span>
                </div>
                <span className="font-black text-[#2563EB]">{sector.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Holdings Section */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0F172A] font-mono">Advisor Portfolio Holdings</h2>
          
          {/* Search holding input */}
          <div className="relative min-w-[280px]">
            <input
              type="text"
              placeholder="Search holdings by symbol or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-black px-4 py-2 pl-9 text-xs font-mono font-bold placeholder:text-black/30 outline-none shadow-[2px_2px_0px_#000000]"
            />
            <Search className="w-4 h-4 text-black/50 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-[24px] overflow-hidden shadow-[5px_5px_0px_#000000]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("ticker")}>
                    <span className="flex items-center gap-1">Asset <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("allocation_percent")}>
                    <span className="flex items-center gap-1">Allocation <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("quantity")}>
                    <span className="flex items-center gap-1">Shares Owned <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("average_price")}>
                    <span className="flex items-center gap-1">Cost Basis <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("current_price")}>
                    <span className="flex items-center gap-1">Current Price <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("market_value")}>
                    <span className="flex items-center gap-1">Market Value <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 cursor-pointer hover:bg-black/5" onClick={() => handleSort("unrealized_pl")}>
                    <span className="flex items-center gap-1">Profit / Loss <ArrowUpDown className="w-3.5 h-3.5" /></span>
                  </th>
                  <th className="py-4 px-5 font-bold">Sector</th>
                  <th className="py-4 px-5 text-right font-bold">Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
                {filteredAndSortedHoldings.length > 0 ? (
                  filteredAndSortedHoldings.map((stock) => {
                    const isNegative = stock.unrealized_pl < 0;
                    return (
                      <tr key={stock.ticker} className="hover:bg-[#F8FAFC]/75 transition-colors">
                        <td className="py-4 px-5 font-mono">
                          <div className="flex flex-col">
                            <span className="font-black text-[#2563EB] uppercase">{stock.ticker}</span>
                            <span className="text-[9px] font-bold text-black/40">{stock.company_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#2563EB] w-9">{stock.allocation_percent.toFixed(1)}%</span>
                            <div className="w-16 bg-black/5 h-2 rounded-full overflow-hidden border border-black/10">
                              <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${stock.allocation_percent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 font-mono font-bold">{stock.quantity.toFixed(4)}</td>
                        <td className="py-4 px-5 font-mono font-bold">${stock.average_price.toFixed(2)}</td>
                        <td className="py-4 px-5 font-mono font-bold">${stock.current_price.toFixed(2)}</td>
                        <td className="py-4 px-5 font-mono font-black">${stock.market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-4 px-5 font-mono">
                          <div className="flex flex-col">
                            <span className={`font-black ${isNegative ? "text-[#EF4444]" : "text-emerald-600"}`}>
                              {isNegative ? "" : "+"}${stock.unrealized_pl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`text-[9px] font-bold ${isNegative ? "text-[#EF4444]" : "text-emerald-600"}`}>
                              {isNegative ? "" : "+"}{stock.return_percent.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-2 py-0.5 border border-black rounded text-[9px] font-mono font-black uppercase bg-gray-50">{stock.sector}</span>
                        </td>
                        <td className="py-4 px-5 text-right flex items-center justify-end gap-1.5 mt-2">
                          <button
                            onClick={() => { setOrderTicker(stock.ticker); setOrderQuantity(""); setOrderError(""); setOrderSuccess(""); setShowBuyModal(true); }}
                            className="bg-white border-2 border-black rounded px-2 py-1 text-[9px] font-black uppercase hover:bg-[#2563EB] hover:text-white transition-all cursor-pointer"
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => { setOrderTicker(stock.ticker); setOrderQuantity(""); setOrderError(""); setOrderSuccess(""); setShowSellModal(true); }}
                            className="bg-white border-2 border-black rounded px-2 py-1 text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                          >
                            Sell
                          </button>
                          <Link
                            href={`/research/${stock.ticker}`}
                            className="bg-black text-white border-2 border-black rounded px-2 py-1 text-[9px] font-black uppercase hover:opacity-90 transition-all"
                          >
                            Research
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center font-mono text-xs uppercase text-black/55">
                      No assets found. Allocate cash balances to stocks using order buttons.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Audit commentary & portfolio statistics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Exposure Statistics */}
        <div className="bg-white border-4 border-black rounded-[24px] p-6 shadow-[5px_5px_0px_#000000] flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-2 font-mono flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#2563EB]" />
            <span>Risk Exposure Diagnostics</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-3 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[3px_3px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Portfolio Beta</span>
              <span className="text-lg font-black text-[#0F172A] font-mono">
                {(metrics?.beta || 1.15).toFixed(2)}
              </span>
            </div>
            <div className="border-3 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[3px_3px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Sharpe Ratio (Rf=4%)</span>
              <span className="text-lg font-black text-[#2563EB] font-mono">
                {(metrics?.sharpe_ratio || 2.41).toFixed(2)}
              </span>
            </div>
            <div className="border-3 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[3px_3px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Annualized Volatility</span>
              <span className="text-lg font-black text-[#0F172A] font-mono">
                {(metrics?.volatility || 15.4).toFixed(1)}%
              </span>
            </div>
            <div className="border-3 border-black bg-[#F8FAFC] p-4 rounded-xl shadow-[3px_3px_0px_#000000]">
              <span className="text-[8px] font-black uppercase text-[#64748B] block mb-1">Max Peak-to-Trough Drawdown</span>
              <span className="text-lg font-black text-rose-500 font-mono">
                {(metrics?.max_drawdown || 0.0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* AI Auditor commentary notifications */}
        <div className="bg-white border-4 border-black rounded-[24px] p-6 shadow-[5px_5px_0px_#000000] flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A] border-b-2 border-black pb-3 mb-2 font-mono flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#2563EB]" />
            <span>AI Risk auditor commentary</span>
          </h3>

          <div className="flex flex-col gap-3">
            {auditAlerts.length > 0 ? (
              auditAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 border-2 border-black p-3.5 rounded-xl shadow-[2.5px_2.5px_0px_#000000] ${
                    alert.type === "warning" ? "bg-rose-50 border-rose-500/50" : 
                    alert.type === "success" ? "bg-emerald-50 border-emerald-500/50" : 
                    "bg-[#2563EB]/5 border-[#2563EB]/20"
                  }`}
                >
                  {alert.type === "warning" && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                  {alert.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                  {alert.type === "info" && <HelpCircle className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />}

                  <div className="min-w-0">
                    <span className={`font-mono font-black text-[9px] uppercase tracking-wider block ${
                      alert.type === "warning" ? "text-rose-600" :
                      alert.type === "success" ? "text-emerald-700" :
                      "text-[#2563EB]"
                    }`}>
                      {alert.category} audit
                    </span>
                    <p className="text-[10px] font-bold text-black/75 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 font-mono text-xs uppercase text-black/40 font-bold border-2 border-dashed border-black/20 rounded-xl">
                No active audit comments available
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BUY MODAL */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black w-full max-w-md p-6 shadow-[8px_8px_0px_#000000] relative rounded-[20px]"
            >
              <button 
                onClick={() => setShowBuyModal(false)}
                className="absolute top-4 right-4 border-2 border-black p-1 bg-white hover:bg-black hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-lg font-black uppercase tracking-tight text-[#0F172A] border-b-2 border-black pb-3 mb-5 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#2563EB]" />
                Execute Buy Order
              </h2>

              <div className="flex flex-col gap-4 font-mono text-xs">
                <div>
                  <label className="block font-black uppercase text-[#64748B] mb-1.5">Asset Ticker</label>
                  <input
                    type="text"
                    value={orderTicker}
                    onChange={(e) => setOrderTicker(e.target.value.toUpperCase())}
                    placeholder="E.g., NVDA, AAPL, RELIANCE"
                    className="w-full bg-white border-2 border-black px-3 py-2.5 font-bold uppercase outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-[#64748B] mb-1.5">Quantity (Shares)</label>
                  <input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder="Enter shares amount"
                    min="0.0001"
                    step="any"
                    className="w-full bg-white border-2 border-black px-3 py-2.5 font-bold outline-none focus:border-[#2563EB]"
                  />
                </div>

                {orderError && (
                  <div className="border-2 border-rose-500 bg-rose-50 p-3 text-[10px] font-bold text-rose-600">
                    {orderError}
                  </div>
                )}

                {orderSuccess && (
                  <div className="border-2 border-emerald-500 bg-emerald-50 p-3 text-[10px] font-bold text-emerald-700">
                    {orderSuccess}
                  </div>
                )}

                <button
                  onClick={() => handleExecuteTrade("BUY")}
                  disabled={isSubmittingOrder}
                  className="w-full bg-[#2563EB] text-white border-3 border-black font-black uppercase py-3 mt-2 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#000000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingOrder ? "Processing..." : "Fill Buy Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SELL MODAL */}
      <AnimatePresence>
        {showSellModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black w-full max-w-md p-6 shadow-[8px_8px_0px_#000000] relative rounded-[20px]"
            >
              <button 
                onClick={() => setShowSellModal(false)}
                className="absolute top-4 right-4 border-2 border-black p-1 bg-white hover:bg-black hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-lg font-black uppercase tracking-tight text-[#0F172A] border-b-2 border-black pb-3 mb-5 flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-rose-500" />
                Execute Sell Order
              </h2>

              <div className="flex flex-col gap-4 font-mono text-xs">
                {/* Select from existing holdings helper */}
                {holdings.length > 0 && (
                  <div>
                    <label className="block font-black uppercase text-[#64748B] mb-1.5">Quick Select Holding</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setOrderTicker(e.target.value);
                          const h = holdings.find(x => x.ticker === e.target.value);
                          if (h) setOrderQuantity(h.quantity);
                        }
                      }}
                      className="w-full bg-white border-2 border-black px-3 py-2.5 font-bold outline-none"
                    >
                      <option value="">-- Select Owned Asset --</option>
                      {holdings.map(h => (
                        <option key={h.ticker} value={h.ticker}>
                          {h.ticker} (Owned: {h.quantity.toFixed(2)} shares)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-black uppercase text-[#64748B] mb-1.5">Asset Ticker</label>
                  <input
                    type="text"
                    value={orderTicker}
                    onChange={(e) => setOrderTicker(e.target.value.toUpperCase())}
                    placeholder="E.g., NVDA, AAPL, RELIANCE"
                    className="w-full bg-white border-2 border-black px-3 py-2.5 font-bold uppercase outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-[#64748B] mb-1.5">Quantity (Shares)</label>
                  <input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder="Enter shares amount"
                    min="0.0001"
                    step="any"
                    className="w-full bg-white border-2 border-black px-3 py-2.5 font-bold outline-none focus:border-[#2563EB]"
                  />
                </div>

                {orderError && (
                  <div className="border-2 border-rose-500 bg-rose-50 p-3 text-[10px] font-bold text-rose-600">
                    {orderError}
                  </div>
                )}

                {orderSuccess && (
                  <div className="border-2 border-emerald-500 bg-emerald-50 p-3 text-[10px] font-bold text-emerald-700">
                    {orderSuccess}
                  </div>
                )}

                <button
                  onClick={() => handleExecuteTrade("SELL")}
                  disabled={isSubmittingOrder}
                  className="w-full bg-[#0F172A] text-white border-3 border-black font-black uppercase py-3 mt-2 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#000000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingOrder ? "Processing..." : "Fill Sell Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REBALANCE MODAL */}
      <AnimatePresence>
        {showRebalanceModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black w-full max-w-2xl p-6 shadow-[8px_8px_0px_#000000] relative rounded-[20px]"
            >
              <button 
                onClick={() => setShowRebalanceModal(false)}
                className="absolute top-4 right-4 border-2 border-black p-1 bg-white hover:bg-black hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-lg font-black uppercase tracking-tight text-[#0F172A] border-b-2 border-black pb-3 mb-5 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                AI Rebalancing Optimization Recommendations
              </h2>

              {isRebalanceLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-black border-t-[#2563EB] rounded-full animate-spin" />
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-black/50">Recalculating efficient allocation targets...</span>
                </div>
              ) : rebalanceData ? (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-3 border-black bg-blue-50/50 p-4 rounded-xl">
                      <span className="font-mono font-black text-[9px] text-blue-700 uppercase block mb-1">Volatility StdDev Impact</span>
                      <span className="text-xs font-bold font-mono text-black/80">{rebalanceData.risk_impact}</span>
                    </div>
                    <div className="border-3 border-black bg-emerald-50/50 p-4 rounded-xl">
                      <span className="font-mono font-black text-[9px] text-emerald-700 uppercase block mb-1">Expected Return impact</span>
                      <span className="text-xs font-bold font-mono text-black/80">{rebalanceData.expected_return_impact}</span>
                    </div>
                  </div>

                  <div className="border-3 border-black rounded-xl overflow-hidden mt-2">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b-2 border-black bg-gray-50 uppercase text-[9px] font-black text-[#64748B]">
                          <th className="p-3">Asset</th>
                          <th className="p-3 text-center">Current %</th>
                          <th className="p-3 text-center">Target %</th>
                          <th className="p-3">Action Required</th>
                          <th className="p-3 text-right">Target Shares</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-black/5 font-bold">
                        {rebalanceData.suggestions?.map((s: any) => (
                          <tr key={s.ticker} className="hover:bg-gray-50/50">
                            <td className="p-3 font-black text-[#2563EB]">{s.ticker}</td>
                            <td className="p-3 text-center">{s.current_allocation.toFixed(1)}%</td>
                            <td className="p-3 text-center">{s.target_allocation.toFixed(1)}%</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                s.trade_action === "BUY" ? "bg-emerald-100 text-emerald-800" :
                                s.trade_action === "SELL" ? "bg-rose-100 text-rose-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {s.trade_action}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {s.trade_action !== "HOLD" ? `${s.trade_action === "BUY" ? "+" : "-"}${s.trade_quantity.toFixed(2)} shares` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-black/50 leading-relaxed font-mono mt-1">
                    * AI target recommendations are generated by executing an equal-weighted volatility reduction model across the specific assets in your current portfolio. To apply these targets, trigger simulated orders using the primary BUY / SELL dialog boxes.
                  </p>

                  <button
                    onClick={() => setShowRebalanceModal(false)}
                    className="w-full bg-[#0F172A] text-white border-3 border-black font-black uppercase py-3 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] transition-all cursor-pointer"
                  >
                    Acknowledge Recommendations
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-mono font-bold uppercase text-black/40">No suggestions available.</div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
