"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk, useAuth } from "@clerk/nextjs";
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
  X,
  Zap
} from "lucide-react";
import AgentFeed from "@/components/dashboard/AgentFeed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(true);
  const isDemoMode = useDashboardStore((state) => state.isDemoMode);
  const setDemoMode = useDashboardStore((state) => state.setDemoMode);

  useEffect(() => {
    let active = true;
    async function checkOnboarding() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok && active) {
          const profile = await res.json();
          if (profile.onboarded === false) {
            router.push("/onboarding");
          } else {
            setIsOnboardingChecked(true);
            setDemoMode(profile.account_mode === "demo");
          }
        } else if (res.status === 404 && active) {
          router.push("/onboarding");
        } else if (active) {
          setIsOnboardingChecked(true);
        }
      } catch (err) {
        console.error("Failed to fetch profile onboarding status", err);
        if (active) setIsOnboardingChecked(true);
      }
    }

    if (isLoaded && isSignedIn) {
      checkOnboarding();
    } else if (isLoaded && !isSignedIn) {
      setIsOnboardingChecked(true);
    }
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, getToken, router, setDemoMode]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAgentFeed, setShowAgentFeed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const commandResults = [
    { type: "shortcut", label: "Go to Dashboard Home", path: "/dashboard" },
    { type: "shortcut", label: "Go to Portfolio Command Center", path: "/dashboard/portfolio" },
    { type: "shortcut", label: "Go to AI Committee Panel", path: "/dashboard/ai-committee" },
    { type: "shortcut", label: "Go to Risk Analytics Dashboard", path: "/dashboard/risk-center" },
    { type: "shortcut", label: "Go to Market Intelligence", path: "/dashboard/market-intelligence" },
    { type: "shortcut", label: "Go to Watchlists Terminal", path: "/dashboard/watchlists" },
    { type: "shortcut", label: "Go to Recommendations Feed", path: "/dashboard/recommendations" },
    { type: "equity", label: "Audit NVDA - NVIDIA Corp", path: "/research/NVDA" },
    { type: "equity", label: "Audit AAPL - Apple Inc", path: "/research/AAPL" },
    { type: "equity", label: "Audit MSFT - Microsoft Corp", path: "/research/MSFT" },
    { type: "equity", label: "Audit TSLA - Tesla Inc", path: "/research/TSLA" },
    { type: "equity", label: "Audit AMD - Advanced Micro Devices", path: "/research/AMD" }
  ];

  const socketConnected = useWebSocketStore((state) => state.connected);
  const agents = useDashboardStore((state) => state.agents);
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
    { name: "War Room", path: "/dashboard/war-room", icon: Zap },
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
      router.push(`/research/${searchQuery.trim().toUpperCase()}`);
      setSearchQuery("");
    }
  };



  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] flex text-[#0F172A] font-sans relative">
      {/* Background Dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern-brutal pointer-events-none z-0" />

      {/* LEFT SIDEBAR - Permanent Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col border-r-4 border-black bg-white select-none relative z-30 shrink-0 h-full transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[88px]" : "w-[280px]"
        }`}
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-4 top-20 w-8 h-8 rounded-full border-3 border-black bg-white hover:bg-[#F8FAFC] shadow-[2px_2px_0px_#000000] flex items-center justify-center z-40 hover:scale-105 transition-transform active:translate-y-[1px] cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-black" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-black" />
          )}
        </button>

        {/* Brand/Logo Section */}
        <div className={`p-6 border-b-4 border-black flex items-center gap-3 transition-all duration-300 ${sidebarCollapsed ? "justify-center px-4" : ""}`}>
          <div className="w-10 h-10 bg-[#2563EB] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000] rotate-[-2deg] shrink-0">
            <Bot className="w-5 h-5 text-white animate-pulse" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-xl font-black tracking-tight text-[#0F172A] uppercase font-sans whitespace-nowrap animate-fadeIn">
              Stock<span className="text-[#2563EB]">ox</span>
            </span>
          )}
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
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-3 transition-all duration-150 font-black text-xs uppercase ${
                  sidebarCollapsed ? "justify-center px-2" : ""
                } ${
                  isActive
                    ? "bg-[#2563EB] text-white border-black shadow-[2px_2px_0px_#000000] translate-y-[-2px]"
                    : "bg-white text-[#64748B] border-transparent hover:border-black hover:text-[#0F172A] hover:bg-[#F8FAFC] hover:shadow-[2px_2px_0px_#000000] hover:translate-y-[-2px]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="whitespace-nowrap animate-fadeIn">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className={`p-4 border-t-4 border-black bg-[#F8FAFC] flex flex-col gap-3 font-mono text-[10px] transition-all duration-300 ${sidebarCollapsed ? "items-center px-2" : ""}`}>
          {/* Profile link */}
          <Link
            href="/dashboard/profile"
            title={sidebarCollapsed ? "My Profile" : undefined}
            className={`flex items-center justify-between border-2 border-black bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg px-2.5 py-2 shadow-[2px_2px_0px_#000000] font-black text-center uppercase tracking-wider transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 text-[10px] cursor-pointer ${
              sidebarCollapsed ? "justify-center w-10 h-10 p-0 rounded-xl" : "w-full"
            }`}
          >
            {!sidebarCollapsed && <span>My Profile</span>}
            <Sliders className="w-3.5 h-3.5 text-white shrink-0" />
          </Link>

          {!sidebarCollapsed ? (
            <>
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
            </>
          ) : (
            /* Collapsed mini indicator */
            <div 
              title="Market Live & 4 APIs Connected"
              className="w-10 h-10 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000000] flex items-center justify-center cursor-help relative"
            >
              <span className="w-3 h-3 rounded-full bg-[#2563EB] border border-black animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden w-full bg-white border-b-4 border-black fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between z-40 select-none">
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
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
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
      <div className="flex-grow flex flex-col min-w-0 pt-16 md:pt-0 relative z-10 animate-fadeIn h-full overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-[72px] border-b-4 border-black bg-white/75 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30 select-none">
          {/* Left - Search Bar */}
          <div className="relative max-w-sm w-full z-45">
            <form onSubmit={handleSearchSubmit} className="flex items-center w-full relative">
              <input
                type="text"
                placeholder="Type ticker or command (e.g. NVDA, /risk)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl py-2 pl-10 pr-4 font-bold text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000] placeholder:text-black/40 transition-all"
              />
              <Search className="w-4 h-4 text-black/50 absolute left-3.5 pointer-events-none" />
            </form>

            {/* Floating Command Palette */}
            {isFocused && (
              <div className="absolute left-0 right-0 mt-2 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000] overflow-hidden max-h-72 overflow-y-auto z-50">
                <div className="p-2 border-b-2 border-black bg-[#F8FAFC] text-[8px] font-black text-[#64748B] uppercase tracking-wider">
                  {searchQuery.trim() === "" ? "Command Shortcuts" : "Search Results"}
                </div>
                <div className="p-1 flex flex-col gap-0.5">
                  {searchQuery.trim() === "" ? (
                    commandResults
                      .filter((item) => item.type === "shortcut")
                      .map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            router.push(item.path);
                            setSearchQuery("");
                          }}
                          className="w-full text-left flex items-center justify-between px-3 py-2 text-[10px] font-black text-black/75 hover:bg-[#2563EB] hover:text-white rounded-lg transition-colors uppercase font-sans cursor-pointer"
                        >
                          <span className="truncate">{item.label}</span>
                          <span className="font-mono text-[8px] opacity-60">CMD</span>
                        </button>
                      ))
                  ) : isSearching ? (
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


          {/* Right Section */}
          <div className="flex items-center gap-4">
            
            {/* Toggle Agent Feed Button */}
            <button
              onClick={() => setShowAgentFeed(!showAgentFeed)}
              title="Toggle AI Activity Feed"
              className={`hidden md:flex p-2 border-3 border-black bg-white rounded-xl hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_#000000] transition-all cursor-pointer ${
                showAgentFeed ? "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]" : "text-black hover:bg-[#F8FAFC]"
              }`}
            >
              {showAgentFeed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>


            {/* Demo Mode Toggle */}
            <div className="flex items-center gap-1 border-3 border-black rounded-xl p-1 bg-[#F8FAFC] shadow-[2px_2px_0px_#000000]">
              <button
                onClick={() => setDemoMode(false)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 transition-all cursor-pointer ${
                  !isDemoMode 
                    ? 'bg-[#EF4444] text-white border-black shadow-[1px_1px_0px_#000000]' 
                    : 'bg-white text-[#64748B] border-transparent hover:text-black'
                }`}
              >
                Live
              </button>
              <button
                onClick={() => setDemoMode(true)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 transition-all cursor-pointer ${
                  isDemoMode 
                    ? 'bg-[#2563EB] text-white border-black shadow-[1px_1px_0px_#000000]' 
                    : 'bg-white text-[#64748B] border-transparent hover:text-black'
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
        <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full">
          
          {/* FLUID RESPONSIVE CONTENT AREA */}
          <main className="flex-grow p-6 md:p-8 min-w-0 overflow-y-auto h-full">
            {children}
          </main>

          {/* Mobile backdrop for bottom drawer */}
          {showAgentFeed && (
            <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowAgentFeed(false)} />
          )}

          {/* COLLAPSIBLE RIGHT PANEL - AI ACTIVITY FEED */}
          {showAgentFeed && (
            <aside className="w-full h-[60vh] fixed bottom-0 left-0 right-0 border-t-4 border-black z-50 flex flex-col md:relative md:h-full md:w-[280px] md:border-t-0 md:border-l-4 md:z-20 md:bottom-auto md:left-auto md:right-auto lg:w-[320px] select-none shrink-0 bg-white">
              <div className="flex-grow flex flex-col overflow-hidden h-full">
                {/* Custom Wrapper to display AgentFeed */}
                <div className="flex-grow overflow-hidden flex flex-col h-full bg-[#F8FAFC]">
                  {/* Reuse/render internal AgentFeed */}
                  <div className="p-4 border-b-3 border-black bg-white flex justify-between items-center shrink-0 font-sans">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#2563EB]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#0F172A]">AI Comm Link</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${socketConnected ? "text-[#2563EB]" : "text-amber-500"}`}>
                        <span className={`w-2 h-2 rounded-full border border-black ${socketConnected ? "bg-[#2563EB] animate-ping" : "bg-amber-500 animate-pulse"}`} />
                        {socketConnected ? "Live Connection" : "Simulated"}
                      </span>
                      {/* Close button for mobile bottom drawer */}
                      <button 
                        onClick={() => setShowAgentFeed(false)}
                        className="md:hidden border-2 border-black p-1 bg-white hover:bg-black hover:text-white rounded transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
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
