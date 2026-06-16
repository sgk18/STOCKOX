"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, Bot, Sparkles, LogOut } from "lucide-react";
import { useUser, useClerk, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search query failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, getToken]);

  const user = {
    name: clerkUser?.fullName || clerkUser?.username || clerkUser?.firstName || "Adviser",
    email: clerkUser?.primaryEmailAddress?.emailAddress || "",
    avatar: (clerkUser?.firstName?.charAt(0) || clerkUser?.username?.charAt(0) || "U").toUpperCase(),
    role: "Lead Investment Advisor",
  };

  return (
    <nav className="h-20 border-b-4 border-black bg-white flex items-center justify-between px-6 sticky top-0 z-50 select-none">
      {/* Left - Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FACC15] border-3 border-black rounded-lg flex items-center justify-center shadow-[3px_3px_0px_#000000] rotate-[-2deg]">
          <Bot className="w-5 h-5 text-black animate-pulse" />
        </div>
        <span className="text-2xl font-black tracking-tight text-[#0F172A] font-sans">
          STOCK<span className="text-[#2563EB]">OX</span>
        </span>
      </div>

      {/* Center - Search Bar */}
      <div className="hidden md:flex items-center max-w-md w-full relative">
        <input
          type="text"
          placeholder="Search stocks, companies, sectors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim() !== "") {
              router.push(`/research/${searchQuery.trim().toUpperCase()}`);
              setSearchQuery("");
            }
          }}
          className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl py-2 pl-11 pr-4 font-bold text-sm text-[#0F172A] focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000] placeholder:text-black/40 transition-all"
        />
        <Search className="w-5 h-5 text-black/60 absolute left-4 pointer-events-none" />

        {/* Floating suggestion list */}
        {isFocused && searchQuery.trim() !== "" && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000] overflow-hidden max-h-72 overflow-y-auto z-50 animate-fadeIn">
            <div className="p-2 border-b-2 border-black bg-[#F8FAFC] text-[8px] font-black text-[#64748B] uppercase tracking-wider">
              Search Results
            </div>
            <div className="p-1 flex flex-col gap-0.5">
              {isSearching ? (
                <div className="p-4 text-center text-[10px] font-black text-black/40">Searching market universe...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-black text-black/40">No assets found in universe</div>
              ) : (
                searchResults.map((asset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      router.push(`/research/${asset.symbol}`);
                      setSearchQuery("");
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-[#2563EB] hover:text-white rounded-lg transition-colors font-sans cursor-pointer border border-transparent hover:border-black"
                  >
                    {asset.logo_url ? (
                      <img
                        src={asset.logo_url}
                        alt={asset.symbol}
                        className="w-6 h-6 rounded border border-black shrink-0 object-contain bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${asset.symbol}`;
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded border border-black bg-[#2563EB] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {asset.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-grow min-w-0 flex flex-col">
                      <div className="flex items-baseline justify-between">
                        <span className="font-black text-xs text-[#0F172A]">{asset.symbol}</span>
                        <span className="text-[8px] font-bold opacity-60 uppercase text-[#64748B] group-hover:text-white">{asset.exchange}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[10px] font-medium truncate opacity-80 text-[#334155] group-hover:text-white">{asset.company}</span>
                        <span className="text-[8px] font-bold opacity-60 uppercase text-[#64748B] group-hover:text-white">{asset.country}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right - Profile & Alerts */}
      <div className="flex items-center gap-4">
        {/* Agent Activity Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#2563EB]/10 border-2 border-black rounded-lg text-sm font-black text-[#2563EB] shadow-[2px_2px_0px_#000000]">
          <Sparkles className="w-4 h-4 text-[#2563EB] animate-spin" style={{ animationDuration: "8s" }} />
          <span className="uppercase text-[10px]">Agents Active</span>
          <span className="w-2 h-2 rounded-full bg-[#2563EB] border border-black animate-ping" />
        </div>

        {/* Notifications Bell */}
        <button className="p-2 border-3 border-black bg-white hover:bg-[#FACC15] rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all cursor-pointer relative">
          <Bell className="w-5 h-5 text-black" />
          <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full border-2 border-black flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Profile avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 p-1 border-3 border-black bg-white rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] border-2 border-black text-white font-black flex items-center justify-center uppercase">
              {user.avatar}
            </div>
            <span className="hidden sm:block font-black text-sm pr-2 text-[#0F172A]">
              {user.name}
            </span>
          </button>

          {/* Profile Dropdown menu */}
          {showProfileDropdown && (
            <div className="absolute right-0 mt-3.5 w-56 bg-white border-3 border-black rounded-xl shadow-[4px_4px_0px_#000000] overflow-hidden z-50">
              <div className="p-4 border-b-2 border-black bg-[#F8FAFC]">
                <p className="font-black text-sm text-[#0F172A]">{user.name}</p>
                <p className="text-xs text-black/50 truncate font-bold">{user.email}</p>
                <span className="inline-block mt-2 bg-[#FACC15] text-[9px] font-black uppercase border border-black px-1.5 py-0.5 rounded">
                  {user.role}
                </span>
              </div>
              <div className="p-1">
                <button
                  onClick={async () => {
                    setShowProfileDropdown(false);
                    await signOut();
                    window.location.href = "/";
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout from Terminal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
