"use client";

import React, { useState, useEffect } from "react";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  User,
  Sliders,
  TrendingUp,
  Award,
  Activity,
  Briefcase,
  PieChart,
  Eye,
  RefreshCw,
  Check,
  AlertTriangle,
  Lock,
  Layers,
  LogOut
} from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import ErrorCard from "@/components/ErrorCard";

export default function ProfilePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  const isDemoStoreMode = useDashboardStore((state) => state.isDemoMode);
  const setStoreDemoMode = useDashboardStore((state) => state.setDemoMode);

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Editable Form State
  const [name, setName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Professional Advisor");
  const [riskPreference, setRiskPreference] = useState("Moderate");
  const [investmentGoal, setInvestmentGoal] = useState("Aggressive Growth");
  const [formSaving, setFormSaving] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Switch Mode Modal State
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [targetMode, setTargetMode] = useState<"demo" | "live" | null>(null);
  const [switching, setSwitching] = useState(false);

  // Fetch profile via TanStack Query
  const { data: profile, isLoading: loading, error, refetch: fetchProfile } = useQuery({
    queryKey: ["profile-details"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/profile?stats=true", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Failed to retrieve user profile");
      }
      return res.json();
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setExperienceLevel(profile.experience_level || "Professional Advisor");
      setRiskPreference(profile.risk_preference || "Moderate");
      setInvestmentGoal(profile.investment_goal || "Aggressive Growth");
    }
  }, [profile]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-mono text-xs uppercase tracking-wider text-black/50">
          Authenticating profile request...
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-40 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000]" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000]" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-80 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000]" />
          <div className="h-80 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000]" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-7xl mx-auto my-12">
        <ErrorCard 
          message={error ? (error as Error).message : "Failed to parse profile payload"} 
          onRetry={() => fetchProfile()} 
        />
      </div>
    );
  }

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setFormSaving(true);
    setFormSuccess(null);
    setSubmitError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          experience_level: experienceLevel,
          risk_preference: riskPreference,
          investment_goal: investmentGoal
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update preferences");
      }

      setFormSuccess("Preferences updated successfully");
      setTimeout(() => setFormSuccess(null), 3000);
      fetchProfile();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Failed to save advisor settings");
    } finally {
      setFormSaving(false);
    }
  };

  const initiateModeSwitch = (mode: "demo" | "live") => {
    setTargetMode(mode);
    setShowSwitchModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!targetMode) return;
    setSwitching(true);
    setSubmitError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/profile/switch-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ mode: targetMode })
      });

      if (!res.ok) {
        throw new Error("System failed to persist mode switch");
      }

      const data = await res.json();
      
      // Update global store state
      setStoreDemoMode(data.mode === "demo");
      
      // Close modal and refresh profile
      setShowSwitchModal(false);
      
      // Force reload to refresh all layouts and reset dashboard cache state
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Failed to switch terminal environment");
      setShowSwitchModal(false);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 select-none">
      {/* HEADER CARD */}
      <div className="glass-brutal-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#2563EB] border-3 border-black text-white font-black text-2xl flex items-center justify-center shadow-[3px_3px_0px_#000000] uppercase">
            {profile.name?.charAt(0) || "U"}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase text-[#0F172A] tracking-tight">{profile.name}</h1>
            <p className="text-xs text-black/50 font-mono mt-0.5">{profile.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg">
                {profile.role}
              </span>
              <span className="bg-black/5 text-[#0F172A] border border-black/20 text-[8px] font-mono px-2 py-0.5 rounded-lg">
                JOINED {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* MODE CONTROLLER CARD */}
        <div className="w-full md:w-auto border-3 border-black bg-[#F8FAFC] p-4 rounded-2xl shadow-[3px_3px_0px_#000000] flex flex-col gap-2 shrink-0">
          <div className="font-mono text-[9px] font-black uppercase text-black/50">Terminal Environment</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => profile.account_mode !== "live" && initiateModeSwitch("live")}
              className={`px-4 py-2 font-black text-xs uppercase rounded-xl border-3 transition-all cursor-pointer ${
                profile.account_mode === "live"
                  ? "bg-[#EF4444] text-white border-black shadow-[2px_2px_0px_#000000] translate-y-[-1px]"
                  : "bg-white text-black/50 border-black/30 hover:border-black hover:text-black shadow-none"
              }`}
            >
              Live Mode
            </button>
            <button
              onClick={() => profile.account_mode !== "demo" && initiateModeSwitch("demo")}
              className={`px-4 py-2 font-black text-xs uppercase rounded-xl border-3 transition-all cursor-pointer ${
                profile.account_mode === "demo"
                  ? "bg-[#2563EB] text-white border-black shadow-[2px_2px_0px_#000000] translate-y-[-1px]"
                  : "bg-white text-black/50 border-black/30 hover:border-black hover:text-black shadow-none"
              }`}
            >
              Demo Mode
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC STATISTICS GRID */}
      <div>
        <h3 className="font-mono text-xs font-black uppercase text-[#0F172A] mb-4 tracking-wider">
          Advisor System Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Stat 1: Portfolio Value */}
          <div className="brutal-card p-4 flex flex-col justify-between h-28 bg-white">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="font-mono text-[9px] font-black text-black/50 uppercase">Portfolio value</span>
              <PieChart className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <span className="text-base font-black text-[#2563EB] mt-2">
              ${profile.stats?.portfolio_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Stat 2: Stocks Tracked */}
          <div className="brutal-card p-4 flex flex-col justify-between h-28 bg-white">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="font-mono text-[9px] font-black text-black/50 uppercase">Holdings Tracked</span>
              <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <span className="text-xl font-black text-[#0F172A] mt-2">
              {profile.stats?.stocks_tracked}
            </span>
          </div>

          {/* Stat 3: Watchlists */}
          <div className="brutal-card p-4 flex flex-col justify-between h-28 bg-white">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="font-mono text-[9px] font-black text-black/50 uppercase">Watchlists</span>
              <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <span className="text-xl font-black text-[#0F172A] mt-2">
              {profile.stats?.watchlist_count}
            </span>
          </div>

          {/* Stat 4: AI Analyses */}
          <div className="brutal-card p-4 flex flex-col justify-between h-28 bg-white">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="font-mono text-[9px] font-black text-black/50 uppercase">AI Audits</span>
              <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <span className="text-xl font-black text-[#0F172A] mt-2">
              {profile.stats?.total_analyses}
            </span>
          </div>

          {/* Stat 5: AI Decisions */}
          <div className="brutal-card p-4 flex flex-col justify-between h-28 bg-white">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="font-mono text-[9px] font-black text-black/50 uppercase">AI Recommendations</span>
              <Award className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <span className="text-xl font-black text-[#0F172A] mt-2">
              {profile.stats?.ai_recs_generated}
            </span>
          </div>
        </div>
      </div>

      {/* CONFIGURATION & SECURITY DOUBLE GRID */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* PREFERENCE CONFIGURATION FORM */}
        <div className="glass-brutal-card p-6 flex flex-col gap-6">
          <div className="border-b-2 border-black pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-[#0F172A]">
                Customize Advisor Settings
              </h3>
              <p className="text-[9px] font-mono text-[#64748B] uppercase">Configure your research persona</p>
            </div>
            <Sliders className="w-4 h-4 text-[#2563EB]" />
          </div>

          {formSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-700 p-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePreferences} className="flex flex-col gap-4">
            {/* Input: Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-black uppercase text-black/50">Full Advisor Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8FAFC] border-2 border-black rounded-lg p-2.5 font-bold text-xs focus:outline-none focus:bg-white"
              />
            </div>

            {/* Selector: Experience Level */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-black uppercase text-black/50">Experience level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-[#F8FAFC] border-2 border-black rounded-lg p-2.5 font-bold text-xs focus:outline-none focus:bg-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Professional Advisor">Professional Advisor</option>
              </select>
            </div>

            {/* Selector: Risk Preference */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-black uppercase text-black/50">Risk Tolerance</label>
              <select
                value={riskPreference}
                onChange={(e) => setRiskPreference(e.target.value)}
                className="w-full bg-[#F8FAFC] border-2 border-black rounded-lg p-2.5 font-bold text-xs focus:outline-none focus:bg-white"
              >
                <option value="Conservative">Conservative</option>
                <option value="Moderate">Moderate</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </div>

            {/* Selector: Investment Goal */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-black uppercase text-black/50">Investment Goal</label>
              <select
                value={investmentGoal}
                onChange={(e) => setInvestmentGoal(e.target.value)}
                className="w-full bg-[#F8FAFC] border-2 border-black rounded-lg p-2.5 font-bold text-xs focus:outline-none focus:bg-white"
              >
                <option value="Wealth Preservation">Wealth Preservation</option>
                <option value="Aggressive Growth">Aggressive Growth</option>
                <option value="Dividend Income">Dividend Income</option>
                <option value="Speculative AI Signals">Speculative AI Signals</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={formSaving}
              className="mt-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-[2px_2px_0px_#000000] cursor-pointer active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
            >
              {formSaving ? "SAVING SETTINGS..." : "SAVE PROFILE SETTINGS"}
            </button>
          </form>
        </div>

        {/* SECURITY & PLATFORM AUDIT */}
        <div className="glass-brutal-card p-6 flex flex-col justify-between bg-white/50">
          <div>
            <div className="border-b-2 border-black pb-4 flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-[#0F172A]">
                  Terminal Credentials
                </h3>
                <p className="text-[9px] font-mono text-[#64748B] uppercase">Secure credential status</p>
              </div>
              <Lock className="w-4 h-4 text-[#2563EB]" />
            </div>

            <div className="flex flex-col gap-4 font-mono text-[10px] text-[#0F172A]/75">
              <div className="p-3 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000000] flex justify-between items-center">
                <span className="font-bold">AUTHENTICATOR</span>
                <span className="font-black text-[#2563EB]">CLERK SIGN-IN</span>
              </div>
              <div className="p-3 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000000] flex justify-between items-center">
                <span className="font-bold">ONBOARDING LEVEL</span>
                <span className="font-black text-[#2563EB]">VERIFIED COMPLETE</span>
              </div>
              <div className="p-3 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000000] flex justify-between items-center">
                <span className="font-bold">DATABASE SCHEMA</span>
                <span className="font-black text-[#2563EB]">V3.5 ENGINE READY</span>
              </div>
              <div className="p-3 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000000] flex justify-between items-center">
                <span className="font-bold">DEMO PORTFOLIO</span>
                <span className="font-black text-[#2563EB]">100K CASH INITIAL</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t-2 border-black/10 pt-6">
            <div className="text-[10px] font-medium text-[#64748B] mb-4 leading-relaxed">
              Verify your connection to the LLM agent network, or sign out from your terminal session safely.
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  router.push("/dashboard/diagnostics");
                }}
                className="py-2.5 px-4 bg-white hover:bg-blue-50 text-[#2563EB] border-2 border-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000000] flex items-center gap-2 cursor-pointer active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
              >
                <Sliders className="w-4 h-4" />
                <span>Run Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/";
                }}
                className="py-2.5 px-4 bg-white hover:bg-red-50 text-[#EF4444] border-2 border-black font-black text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000000] flex items-center gap-2 cursor-pointer active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>SIGNOUT FROM TERMINAL</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODE SWITCHER MODAL */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_#000000] flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b-2 border-black pb-4 text-[#EF4444]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-black uppercase tracking-tight text-[#0F172A]">
                Confirm Environment Switch
              </h3>
            </div>

            <p className="text-xs font-bold text-black/75 uppercase tracking-wide leading-relaxed">
              {targetMode === "live"
                ? "Switching to Live Mode will shift your terminal view to real-market quotes, blank watchlists, and manual portfolio entries. Continue?"
                : "Switching to Demo Mode will restore your virtual $100,000 portfolio and seeded committee recommendations. Continue?"}
            </p>

            <div className="flex justify-end gap-3 font-mono">
              <button
                onClick={() => setShowSwitchModal(false)}
                disabled={switching}
                className="px-4 py-2.5 border-2 border-black bg-white hover:bg-[#F8FAFC] font-black text-xs uppercase rounded-xl active:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitch}
                disabled={switching}
                className={`px-5 py-2.5 text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-[3px_3px_0px_#000000] cursor-pointer active:translate-y-0.5 disabled:opacity-50 flex items-center gap-2 ${
                  targetMode === "live" ? "bg-[#EF4444] hover:bg-[#DC2626]" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                }`}
              >
                {switching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Deploying...</span>
                  </>
                ) : (
                  <span>Acknowledge & Deploy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
