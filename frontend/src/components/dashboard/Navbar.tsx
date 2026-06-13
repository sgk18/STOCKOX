"use client";

import React, { useState } from "react";
import { Search, Bell, Bot, Sparkles, User, LogOut } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

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
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim() !== "") {
              router.push(`/dashboard/analysis?ticker=${searchQuery.trim().toUpperCase()}`);
              setSearchQuery("");
            }
          }}
          className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl py-2 pl-11 pr-4 font-bold text-sm text-[#0F172A] focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000] placeholder:text-black/40 transition-all"
        />
        <Search className="w-5 h-5 text-black/60 absolute left-4 pointer-events-none" />
      </div>

      {/* Right - Profile & Alerts */}
      <div className="flex items-center gap-4">
        {/* Agent Activity Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#2563EB]/10 border-2 border-black rounded-lg text-sm font-black text-[#2563EB] shadow-[2px_2px_0px_#000000]">
          <Sparkles className="w-4 h-4 text-[#2563EB] animate-spin" style={{ animationDuration: "8s" }} />
          <span className="uppercase text-[10px]">Agents Active</span>
          <span className="w-2 h-2 rounded-full bg-[#22C55E] border border-black animate-ping" />
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
