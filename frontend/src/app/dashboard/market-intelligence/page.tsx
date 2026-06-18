"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Globe, Search, Landmark, Coins, TrendingUp, Sparkles, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ErrorCard from "@/components/ErrorCard";

interface AssetUniverseItem {
  symbol: string;
  company: string;
  exchange: string;
  country: string;
  assetType: string;
  logo_url: string;
  price: number;
  change: number;
  sector: string;
}

export default function MarketIntelligencePage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"india" | "us" | "crypto" | "indices">("india");
  const [localSearch, setLocalSearch] = useState("");

  const queryOptions = {
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: isSignedIn
  };

  // Queries for each asset category
  const { data: indiaAssets = [], isLoading: isLoadingIndia, isError: isErrorIndia, error: errorIndia, refetch: refetchIndia } = useQuery<AssetUniverseItem[]>({
    queryKey: ["assets-india"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/assets/india", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load Indian asset universe");
      return res.json();
    },
    ...queryOptions
  });

  const { data: usAssets = [], isLoading: isLoadingUS, isError: isErrorUS, error: errorUS, refetch: refetchUS } = useQuery<AssetUniverseItem[]>({
    queryKey: ["assets-us"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/assets/us", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load US asset universe");
      return res.json();
    },
    ...queryOptions
  });

  const { data: cryptoAssets = [], isLoading: isLoadingCrypto, isError: isErrorCrypto, error: errorCrypto, refetch: refetchCrypto } = useQuery<AssetUniverseItem[]>({
    queryKey: ["assets-crypto"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/assets/crypto", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load Crypto asset universe");
      return res.json();
    },
    ...queryOptions
  });

  const { data: indicesAssets = [], isLoading: isLoadingIndices, isError: isErrorIndices, error: errorIndices, refetch: refetchIndices } = useQuery<AssetUniverseItem[]>({
    queryKey: ["assets-indices"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/assets/indices", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load Global indices universe");
      return res.json();
    },
    ...queryOptions
  });

  // Map tabs to data & load state
  const tabDataMap = {
    india: { data: indiaAssets, loading: isLoadingIndia, error: isErrorIndia ? errorIndia : null, refetch: refetchIndia, label: "Indian Equities", icon: Landmark, color: "#2563EB" },
    us: { data: usAssets, loading: isLoadingUS, error: isErrorUS ? errorUS : null, refetch: refetchUS, label: "US Equities", icon: Globe, color: "#10B981" },
    crypto: { data: cryptoAssets, loading: isLoadingCrypto, error: isErrorCrypto ? errorCrypto : null, refetch: refetchCrypto, label: "Crypto Assets", icon: Coins, color: "#F59E0B" },
    indices: { data: indicesAssets, loading: isLoadingIndices, error: isErrorIndices ? errorIndices : null, refetch: refetchIndices, label: "Global Indices", icon: TrendingUp, color: "#EC4899" }
  };

  const currentCategory = tabDataMap[activeTab];

  // Apply local filtering
  const filteredAssets = currentCategory.data.filter((asset) => {
    const term = localSearch.toLowerCase();
    return (
      (asset.symbol || "").toLowerCase().includes(term) ||
      (asset.company || "").toLowerCase().includes(term) ||
      (asset.exchange || "").toLowerCase().includes(term) ||
      (asset.country || "").toLowerCase().includes(term)
    );
  });

  const handleCardClick = (symbol: string) => {
    router.push(`/research/${symbol}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-8 animate-fadeIn max-w-7xl mx-auto pb-12"
    >
      {/* Page Header */}
      <section className="bg-white border-4 border-black p-8 rounded-[24px] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Globe className="w-8 h-8 text-[#2563EB]" />
            <span>Market Intelligence Universe</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mt-1.5 font-mono">
            Searchable curated professional asset registries & direct AI committee research links
          </p>
        </div>
        <div className="mt-4 md:mt-0 px-4 py-2 bg-[#2563EB]/10 border-2 border-black rounded-xl text-xs font-black text-[#2563EB] flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] z-10">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>250+ CURATED ASSETS</span>
        </div>
      </section>

      {/* Tabs Selector & Search bar row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          {(Object.keys(tabDataMap) as Array<keyof typeof tabDataMap>).map((key) => {
            const item = tabDataMap[key];
            const Icon = item.icon;
            const isSelected = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setLocalSearch("");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border-3 transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[#2563EB] text-white border-black shadow-[3px_3px_0px_#000000] -translate-y-0.5"
                    : "bg-white text-[#64748B] border-transparent hover:border-black hover:text-[#0F172A] hover:bg-[#F8FAFC] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Local Search Input */}
        <div className="relative w-full md:max-w-xs shrink-0">
          <input
            type="text"
            placeholder={`Filter ${currentCategory.label}...`}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-white border-3 border-black rounded-xl py-2 pl-9 pr-4 font-bold text-xs text-[#0F172A] focus:outline-none focus:shadow-[2px_2px_0px_#000000] placeholder:text-black/40 transition-all"
          />
          <Search className="w-4 h-4 text-black/50 absolute left-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Main Grid display */}
      {currentCategory.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-44 bg-black/5 border-4 border-black rounded-[20px] animate-pulse" />
          ))}
        </div>
      ) : currentCategory.error ? (
        <ErrorCard 
          message={currentCategory.error.message || "Failed to load asset universe data."} 
          onRetry={() => currentCategory.refetch()} 
        />
      ) : filteredAssets.length === 0 ? (
        <div className="glass-brutal-card p-16 text-center flex flex-col items-center gap-3">
          <HelpCircle className="w-10 h-10 text-[#64748B] animate-bounce" />
          <h3 className="text-sm font-black uppercase text-[#0F172A]">No Matching Assets</h3>
          <p className="text-xs font-medium text-[#64748B] max-w-xs font-mono leading-relaxed">
            Could not find any assets matching "{localSearch}" in the active {currentCategory.label} universe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.symbol}
              onClick={() => handleCardClick(asset.symbol)}
              className="glass-brutal-card p-5 bg-white flex flex-col justify-between hover:shadow-[5px_5px_0px_#000000] hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] font-mono">
                      {asset.exchange} · {asset.country}
                    </span>
                    <h3 className="text-lg font-black text-[#0F172A] group-hover:text-[#2563EB] transition-colors mt-1">
                      {asset.symbol}
                    </h3>
                    <p className="text-xs font-bold text-black/60 truncate mt-0.5 max-w-[160px]" title={asset.company}>
                      {asset.company}
                    </p>
                  </div>

                  {asset.logo_url ? (
                    <img
                      src={asset.logo_url}
                      alt={asset.symbol}
                      className="w-10 h-10 rounded-lg border-2 border-black object-contain bg-white p-0.5 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${asset.symbol}`;
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg border-2 border-black bg-[#2563EB]/10 text-[#2563EB] font-black text-xs flex items-center justify-center shrink-0 uppercase">
                      {asset.symbol.slice(0, 2)}
                    </div>
                  )}
                </div>

                <span className="px-2 py-0.5 border border-black rounded text-[9px] font-mono font-black uppercase bg-gray-50 self-start">
                  {asset.sector || "Other"}
                </span>

                <div className="mt-2 flex items-baseline justify-between border-t border-black/5 pt-2">
                  <span className="text-sm font-black font-mono">${(asset.price ?? 150).toFixed(2)}</span>
                  <span className={`text-[10px] font-mono font-black ${asset.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {asset.change >= 0 ? "+" : ""}{(asset.change ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[9px] font-black uppercase tracking-wider font-mono">
                <span className="text-black/40">Advisory Node</span>
                <span className="text-[#2563EB] group-hover:underline flex items-center gap-0.5">
                  Launch Audit &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
