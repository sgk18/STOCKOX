"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/lib/store";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  History,
  DollarSign,
  Briefcase
} from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  portfolio_id: string;
  ticker: string;
  quantity: number;
  price: number;
  type: string; // BUY or SELL
  created_at: string;
}

export default function HistoryPage() {
  const { getToken, isSignedIn } = useAuth();
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);

  // Filters & Pagination states
  const [tickerInput, setTickerInput] = useState("");
  const [tickerFilter, setTickerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio-history", isDemoMode, page, tickerFilter, typeFilter],
    queryFn: async () => {
      const token = await getToken();
      let url = `/api/portfolio/history?page=${page}&limit=${limit}`;
      if (isDemoMode) url += "&demo=true";
      if (tickerFilter.trim()) url += `&ticker=${tickerFilter.toUpperCase().trim()}`;
      if (typeFilter) url += `&type=${typeFilter}`;

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to retrieve transaction history.");
      return res.json();
    },
    enabled: isSignedIn,
  });

  const transactions: Transaction[] = data?.transactions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setTickerFilter(tickerInput);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(1);
    setTypeFilter(e.target.value);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8 pb-12 select-none"
    >
      {/* Top Header Panel */}
      <section className="bg-white border-4 border-black p-6 rounded-[24px] shadow-[5px_5px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/portfolio"
            className="border-2 border-black p-2 bg-white hover:bg-black hover:text-white hover:shadow-[2px_2px_0px_#2563EB] active:translate-y-[1px] transition-all shrink-0"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2">
              <History className="w-7 h-7 text-[#2563EB]" />
              <span>Transaction Ledger</span>
            </h1>
            <p className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider mt-1">
              {isDemoMode ? "DEMO MODE PROTOCOL — AUDITING SIMULATED TRADES" : "LIVE ACCOUNT LEDGER — COMPLIANCE STACKED"}
            </p>
          </div>
        </div>
      </section>

      {/* Filter and Search Panel */}
      <section className="bg-white border-3 border-black p-5 rounded-[20px] shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search ticker (e.g. NVDA)..."
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              className="w-full bg-white border-2 border-black px-4 py-2 pl-9 text-xs font-mono font-bold placeholder:text-black/30 outline-none shadow-[2px_2px_0px_#000000]"
            />
            <Search className="w-4 h-4 text-black/50 absolute left-3 top-2.5" />
          </div>
          <button
            type="submit"
            className="bg-[#2563EB] text-white border-2 border-black font-black uppercase text-xs px-4 py-2 shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[1px] transition-all cursor-pointer"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-black uppercase text-[#64748B] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Trade Type:
          </span>
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="bg-white border-2 border-black px-3 py-2 text-xs font-mono font-bold outline-none shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            <option value="">ALL ORDERS</option>
            <option value="BUY">BUY ENTRIES</option>
            <option value="SELL">SELL EXITS</option>
          </select>
        </div>
      </section>

      {/* Transactions Table */}
      <section className="bg-white border-4 border-black rounded-[24px] overflow-hidden shadow-[5px_5px_0px_#000000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b-3 border-black bg-[#F8FAFC] font-mono text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                <th className="py-4 px-5">Transaction ID</th>
                <th className="py-4 px-5">Timestamp</th>
                <th className="py-4 px-5">Asset</th>
                <th className="py-4 px-5">Order Type</th>
                <th className="py-4 px-5">Quantity (Shares)</th>
                <th className="py-4 px-5">Execution Price</th>
                <th className="py-4 px-5 text-right">Gross Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/5 font-sans text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-mono font-bold uppercase text-black/40 animate-pulse">
                    Retrieving audited transactions...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((t) => {
                  const isBuy = t.type === "BUY";
                  const grossAmount = t.quantity * t.price;
                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC]/75 transition-colors">
                      <td className="py-4 px-5 font-mono text-[10px] text-black/50">{t.id}</td>
                      <td className="py-4 px-5 font-mono font-bold text-black/75">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <span className="font-black text-[#2563EB] uppercase">{t.ticker}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 border border-black rounded text-[9px] font-mono font-black uppercase ${
                          isBuy ? "bg-emerald-50 text-emerald-800 border-emerald-500/20" : "bg-rose-50 text-rose-800 border-rose-500/20"
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold">{t.quantity.toFixed(4)}</td>
                      <td className="py-4 px-5 font-mono font-bold">${t.price.toFixed(2)}</td>
                      <td className="py-4 px-5 font-mono font-black text-right text-black">
                        ${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-mono text-xs uppercase text-black/55">
                    No transactions registered in this ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="border-t-3 border-black bg-[#F8FAFC] py-4 px-5 flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-[#64748B] uppercase">
              Auditing Page {page} of {totalPages} (Total Logs: {total})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="border-2 border-black p-1.5 bg-white hover:bg-black hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="border-2 border-black p-1.5 bg-white hover:bg-black hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}
