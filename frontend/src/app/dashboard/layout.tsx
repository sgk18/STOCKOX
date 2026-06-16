"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useDashboardStore } from "@/lib/store";
import { useWebSocketStore } from "@/lib/websocketStore";
import {
  LayoutDashboard,
  Globe,
  Eye,
  PieChart,
  Bot,
  Activity,
  Terminal,
  Newspaper,
  Award,
  ShieldAlert,
  FileText,
  Settings,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  Sliders,
  Menu,
  Shield
} from "lucide-react";
import AgentFeed from "@/components/dashboard/AgentFeed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { signOut } = useClerk();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAgentFeed, setShowAgentFeed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const socketConnected = useWebSocketStore((state) => state.connected);
  const agents = useDashboardStore((state) => state.agents);
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);
  const setDemoMode = useDashboardStore((state) => state.setDemoMode);
  const activeAgentCount = agents.filter(a => a.status !== "Idle").length || 5;

  const user = {
    name: clerkUser?.fullName || clerkUser?.username || clerkUser?.firstName || "Adviser",
    email: clerkUser?.primaryEmailAddress?.emailAddress || "",
    avatar: (clerkUser?.firstName?.charAt(0) || clerkUser?.username?.charAt(0) || "U").toUpperCase(),
    role: "Lead Investment Advisor",
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Market Intelligence", path: "/dashboard/market-intelligence", icon: Globe },
    { name: "Watchlists", path: "/dashboard/watchlists", icon: Eye },
    { name: "Portfolio", path: "/dashboard/portfolio", icon: PieChart },
    { name: "AI Committee", path: "/dashboard/ai-committee", icon: Bot },
    { name: "Agent Activity", path: "/dashboard/agent-activity", icon: Activity },
    { name: "Research Terminal", path: "/dashboard/research-terminal", icon: Terminal },
    { name: "News & Events", path: "/dashboard/news-events", icon: Newspaper },
    { name: "Recommendations", path: "/dashboard/recommendations", icon: Award },
    { name: "Risk Center", path: "/dashboard/risk-center", icon: ShieldAlert },
    { name: "Reports", path: "/dashboard/reports", icon: FileText },
    { name: "Settings", path: "/dashboard/settings", icon: Settings },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      router.push(`/dashboard/research-terminal?ticker=${searchQuery.trim().toUpperCase()}`);
      setSearchQuery("");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] flex text-[#0F172A] font-sans relative">
      {/* Background Dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern-brutal pointer-events-none z-0" />

      {/* LEFT SIDEBAR - Permanent Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] border-r-4 border-black bg-white select-none relative z-30 shrink-0 h-full">
        {/* Brand/Logo Section */}
        <div className="p-6 border-b-4 border-black flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2563EB] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000] rotate-[-2deg]">
            <Bot className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#0F172A] uppercase font-sans">
            Stock<span className="text-[#2563EB]">ox</span>
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-grow overflow-y-auto px-4 py-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-3 transition-all duration-150 font-black text-xs uppercase ${
                  isActive
                    ? "bg-[#2563EB] text-white border-black shadow-[2px_2px_0px_#000000] translate-y-[-2px]"
                    : "bg-white text-[#64748B] border-transparent hover:border-black hover:text-[#0F172A] hover:bg-[#F8FAFC] hover:shadow-[2px_2px_0px_#000000] hover:translate-y-[-2px]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t-4 border-black bg-[#F8FAFC] flex flex-col gap-3 font-mono text-[10px]">
          {/* Market Status */}
          <div className="flex items-center justify-between border-2 border-black bg-white rounded-lg px-2.5 py-1.5 shadow-[2px_2px_0px_#000000]">
            <span className="font-bold text-[#64748B]">MARKET STATUS</span>
            <div className="flex items-center gap-1 font-black text-[#2563EB]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-black animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>
          {/* Connected APIs */}
          <div className="flex items-center justify-between border-2 border-black bg-white rounded-lg px-2.5 py-1.5 shadow-[2px_2px_0px_#000000]">
            <span className="font-bold text-[#64748B]">SEC-APIS CONN</span>
            <span className="font-black text-[#2563EB]">4 ACTIVE</span>
          </div>
          {/* User Plan */}
          <div className="flex items-center justify-between border-2 border-black bg-white rounded-lg px-2.5 py-1.5 shadow-[2px_2px_0px_#000000]">
            <span className="font-bold text-[#64748B]">USER LEVEL</span>
            <span className="font-black bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB] px-1 rounded">
              ENTERPRISE
            </span>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="lg:hidden w-full bg-white border-b-4 border-black fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between z-40 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 border-2 border-black rounded-lg bg-[#F8FAFC] active:translate-y-[1px]"
          >
            <Menu className="w-5 h-5 text-black" />
          </button>
          <span className="text-lg font-black tracking-tight text-[#0F172A] uppercase">
            Stock<span className="text-[#2563EB]">ox</span>
          </span>
        </div>

        <button
          onClick={() => setShowAgentFeed(!showAgentFeed)}
          className="p-2 border-2 border-black bg-white rounded-lg text-xs font-black text-[#2563EB] flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Feed</span>
        </button>
      </div>

      {/* MOBILE NAVIGATION OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-[280px] bg-white h-full border-r-4 border-black flex flex-col animate-slideRight"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-4 border-black flex items-center justify-between">
              <span className="text-xl font-black text-[#0F172A] uppercase">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 border-2 border-black rounded-lg font-bold"
              >
                X
              </button>
            </div>
            <nav className="flex-grow overflow-y-auto p-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-3 transition-all duration-150 font-black text-xs uppercase ${
                      isActive
                        ? "bg-[#2563EB] text-white border-black shadow-[2px_2px_0px_#000000]"
                        : "bg-white text-[#64748B] border-transparent hover:border-black hover:text-[#0F172A]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-grow flex flex-col min-w-0 pt-16 lg:pt-0 relative z-10 animate-fadeIn h-full overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-20 border-b-4 border-black bg-white/75 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30 select-none">
          {/* Left - Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center max-w-sm w-full relative">
            <input
              type="text"
              placeholder="Search stocks, companies, news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl py-2 pl-10 pr-4 font-bold text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000] placeholder:text-black/40 transition-all"
            />
            <Search className="w-4 h-4 text-black/50 absolute left-3.5 pointer-events-none" />
          </form>

          {/* Center - Committee Diagnostics */}
          <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-[#2563EB]/10 border-2 border-black rounded-xl text-xs font-black text-[#2563EB] shadow-[2.5px_2.5px_0px_#000000]">
            <Sparkles className="w-4 h-4 text-[#2563EB] animate-spin" style={{ animationDuration: "10s" }} />
            <span className="uppercase tracking-wider text-[10px]">Committee Status:</span>
            <div className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] border border-black animate-ping" />
              <span>{activeAgentCount} Agents Active</span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            
            {/* Toggle Agent Feed Button */}
            <button
              onClick={() => setShowAgentFeed(!showAgentFeed)}
              title="Toggle AI Activity Feed"
              className={`hidden lg:flex p-2 border-3 border-black bg-white rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all cursor-pointer ${
                showAgentFeed ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]" : "text-black hover:bg-[#F8FAFC]"
              }`}
            >
              {showAgentFeed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {/* Notification Bell */}
            <button className="p-2 border-3 border-black bg-white hover:bg-[#2563EB]/10 rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all cursor-pointer relative">
              <Bell className="w-5 h-5 text-black" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#EF4444] text-white text-[8px] font-black w-4.5 h-4.5 rounded-full border-2 border-black flex items-center justify-center">
                3
              </span>
            </button>

            {/* Demo Mode Toggle */}
            <div className="flex items-center gap-1 border-3 border-black rounded-xl p-1 bg-[#F8FAFC] shadow-[2px_2px_0px_#000000]">
              <button
                onClick={() => setDemoMode(false)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 transition-all cursor-pointer ${
                  !isDemoMode 
                    ? "bg-[#EF4444] text-white border-black shadow-[1px_1px_0px_#000000]" 
                    : "bg-white text-[#64748B] border-transparent hover:text-black"
                }`}
              >
                Live
              </button>
              <button
                onClick={() => setDemoMode(true)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 transition-all cursor-pointer ${
                  isDemoMode 
                    ? "bg-[#2563EB] text-white border-black shadow-[1px_1px_0px_#000000]" 
                    : "bg-white text-[#64748B] border-transparent hover:text-black"
                }`}
              >
                Demo
              </button>
            </div>

            {/* Clerk User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2.5 p-1 border-3 border-black bg-white rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#2563EB] border-2 border-black text-white font-black flex items-center justify-center uppercase">
                  {user.avatar}
                </div>
                <span className="hidden md:block font-black text-xs uppercase pr-2 text-[#0F172A]">
                  {user.name}
                </span>
              </button>

              {/* Profile dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-3.5 w-60 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000] overflow-hidden z-50">
                  <div className="p-4 border-b-2 border-black bg-[#F8FAFC]">
                    <p className="font-black text-xs text-[#0F172A] uppercase">{user.name}</p>
                    <p className="text-[10px] text-black/50 truncate font-mono mt-0.5">{user.email}</p>
                    <span className="inline-block mt-2 bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg">
                      {user.role}
                    </span>
                  </div>
                  <div className="p-1 bg-white">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        router.push("/dashboard/settings");
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-black text-black/75 hover:bg-[#F8FAFC] rounded-lg transition-colors uppercase"
                    >
                      <Sliders className="w-4 h-4 text-[#64748B]" />
                      <span>Settings Terminal</span>
                    </button>
                    <button
                      onClick={async () => {
                        setShowProfileDropdown(false);
                        await signOut();
                        window.location.href = "/";
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-black text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors uppercase"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout from Terminal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* CONTENT ROW */}
        <div className="flex-grow flex flex-col lg:flex-row relative overflow-hidden h-full">
          
          {/* FLUID RESPONSIVE CONTENT AREA */}
          <main className="flex-grow p-6 lg:p-8 min-w-0 overflow-y-auto h-full">
            {children}
          </main>

          {/* COLLAPSIBLE RIGHT PANEL - AI ACTIVITY FEED */}
          {showAgentFeed && (
            <aside className="w-full lg:w-[360px] border-t-4 lg:border-t-0 lg:border-l-4 border-black bg-white select-none shrink-0 relative z-20 flex flex-col h-[500px] lg:h-full">
              <div className="flex-grow flex flex-col overflow-hidden h-full">
                {/* Custom Wrapper to display AgentFeed */}
                <div className="flex-grow overflow-hidden flex flex-col h-full bg-[#F8FAFC]">
                  {/* Reuse/render internal AgentFeed */}
                  <div className="p-4 border-b-3 border-black bg-white flex justify-between items-center shrink-0 font-sans">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#2563EB]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#0F172A]">AI Comm Link</span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${socketConnected ? "text-[#2563EB]" : "text-amber-500"}`}>
                      <span className={`w-2 h-2 rounded-full border border-black ${socketConnected ? "bg-[#2563EB] animate-ping" : "bg-amber-500 animate-pulse"}`} />
                      {socketConnected ? "Live Connection" : "Simulated"}
                    </span>
                  </div>

                  <div className="flex-grow overflow-y-auto p-4 flex flex-col h-full bg-[#F8FAFC] custom-agent-feed-container">
                    <AgentFeed />
                  </div>
                </div>
              </div>
            </aside>
          )}

        </div>
      </div>
    </div>
  );
}
