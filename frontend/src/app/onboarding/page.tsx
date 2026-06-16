"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Rocket,
  Shield,
  Check,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Sliders,
  TrendingUp,
  User,
  AlertTriangle
} from "lucide-react";
import { useDashboardStore } from "@/lib/store";

export default function OnboardingPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const setDemoMode = useDashboardStore((state) => state.setDemoMode);

  // Wizard step: 1 = Mode selection, 2 = Preference form
  const [step, setStep] = useState(1);
  const [selectedMode, setSelectedMode] = useState<"demo" | "live" | null>(null);

  // Preference state
  const [name, setName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Professional Advisor");
  const [riskPreference, setRiskPreference] = useState("Moderate");
  const [investmentGoal, setInvestmentGoal] = useState("Aggressive Growth");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill user details from Clerk when loaded
  useEffect(() => {
    if (clerkUser) {
      setName(clerkUser.fullName || clerkUser.username || clerkUser.firstName || "");
    }
  }, [clerkUser]);

  // Check if user is already onboarded; if so, skip onboarding
  useEffect(() => {
    async function checkExistingOnboarded() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile.onboarded) {
            router.push("/dashboard");
          }
        }
      } catch (err) {
        console.error("Failed to check existing onboarding status", err);
      }
    }
    checkExistingOnboarded();
  }, [isLoaded, isSignedIn, getToken, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative">
        <div className="absolute inset-0 dot-pattern-brutal pointer-events-none z-0" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB] border-4 border-black shadow-[4px_4px_0px_#000000] animate-bounce flex items-center justify-center font-black text-white">
            SO
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#0F172A] font-bold animate-pulse">
            Establishing secure terminal connection...
          </span>
        </div>
      </div>
    );
  }

  const handleModeSelect = (mode: "demo" | "live") => {
    setSelectedMode(mode);
    setStep(2);
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name field is required");
      return;
    }
    if (!selectedMode) {
      setError("Please select an operating mode");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: selectedMode,
          name: name.trim(),
          avatar_url: clerkUser?.imageUrl || `https://avatar.vercel.sh/${encodeURIComponent(name)}`,
          experience_level: experienceLevel,
          investment_goal: investmentGoal,
          risk_preference: riskPreference
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to finalize account config");
      }

      // Sync active mode in local store
      setDemoMode(selectedMode === "demo");
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "A terminal sync error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans relative overflow-x-hidden py-12 px-6">
      {/* Dot Pattern Overlay */}
      <div className="absolute inset-0 dot-pattern-brutal pointer-events-none z-0" />

      {/* Floating brand header */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center z-10 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2563EB] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000] rotate-[-2deg]">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#0F172A] uppercase">
            Stock<span className="text-[#2563EB]">ox</span>
          </span>
        </div>
        <div className="font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 border-2 border-black bg-white rounded-lg shadow-[2px_2px_0px_#000000]">
          SECURE SETUP CONSOLE
        </div>
      </header>

      {/* Main wizard body */}
      <main className="w-full max-w-4xl mx-auto flex-grow flex flex-col justify-center items-center z-10 relative">
        <div className="w-full text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-full text-xs font-black text-[#2563EB] mb-4 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deployment Wizard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
            Welcome to Stockox
          </h1>
          <p className="text-sm md:text-base font-medium text-[#64748B] mt-2 max-w-xl mx-auto">
            AI-Powered Multi-Agent Investment Intelligence Platform
          </p>
        </div>

        {error && (
          <div className="w-full max-w-2xl bg-red-50 border-3 border-black p-4 mb-6 rounded-2xl shadow-[4px_4px_0px_#000000] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="text-xs font-black text-[#EF4444] uppercase tracking-wide">
              {error}
            </div>
          </div>
        )}

        {/* STEP 1: MODE SELECTION */}
        {step === 1 && (
          <div className="w-full grid md:grid-cols-2 gap-8 max-w-3xl">
            {/* Card 1: Demo Mode */}
            <div 
              onClick={() => handleModeSelect("demo")}
              className="glass-brutal-card p-6 flex flex-col justify-between cursor-pointer group hover:bg-[#F8FAFC] brutal-card-hover"
            >
              <div>
                <div className="w-12 h-12 bg-[#2563EB] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000] group-hover:rotate-6 transition-transform mb-6">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0F172A] mb-2">
                  Demo Mode
                </h3>
                <p className="text-xs text-[#64748B] font-medium mb-6">
                  Experience Stockox using a simulated portfolio.
                </p>
                <ul className="flex flex-col gap-3 font-mono text-[11px] font-bold text-black/75 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Virtual $100,000 Portfolio</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>AI Committee Recommendations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Simulated Buy/Sell Actions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Risk-Free Learning</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect("demo");
                }}
                className="w-full py-3 bg-[#2563EB] text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-[3px_3px_0px_#000000] hover:bg-[#1D4ED8] transition-colors cursor-pointer"
              >
                Start Demo
              </button>
            </div>

            {/* Card 2: Live Mode */}
            <div 
              onClick={() => handleModeSelect("live")}
              className="glass-brutal-card p-6 flex flex-col justify-between cursor-pointer group hover:bg-[#F8FAFC] brutal-card-hover"
            >
              <div>
                <div className="w-12 h-12 bg-[#000000] border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000000] group-hover:rotate-6 transition-transform mb-6">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0F172A] mb-2">
                  Live Mode
                </h3>
                <p className="text-xs text-[#64748B] font-medium mb-6">
                  Connect or build your real asset watchlists and track actual holdings.
                </p>
                <ul className="flex flex-col gap-3 font-mono text-[11px] font-bold text-black/75 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Live Market Universal Search</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Track Actual Holdings (Manual Entry)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Dynamic Sector & Asset Ingestion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Full Committee Risk Audits</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect("live");
                }}
                className="w-full py-3 bg-[#0F172A] text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-[3px_3px_0px_#000000] hover:bg-black/90 transition-colors cursor-pointer"
              >
                Activate Live Mode
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREFERENCE & CONFIGURATION FORM */}
        {step === 2 && (
          <form 
            onSubmit={handleCompleteOnboarding}
            className="w-full max-w-2xl glass-brutal-card p-8 flex flex-col gap-6"
          >
            <div className="border-b-2 border-black pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-[#0F172A]">
                  Configure Advisor Preferences
                </h3>
                <p className="text-[10px] font-bold font-mono text-[#64748B] uppercase mt-1">
                  Active Mode: {selectedMode === "demo" ? "VIRTUAL DEMO CAPITAL" : "REAL-MARKET LIVE"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-2 border-2 border-black bg-white rounded-lg hover:bg-[#F8FAFC] active:translate-y-[1px]"
              >
                <ArrowLeft className="w-4 h-4 text-[#0F172A]" />
              </button>
            </div>

            {/* Input - Name */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase text-[#0F172A] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Advisor Identity Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter profile name..."
                className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl p-3 font-bold text-xs focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000]"
              />
            </div>

            {/* Grid for parameters */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dropdown - Experience Level */}
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-black uppercase text-[#0F172A] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Experience Level</span>
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl p-3 font-bold text-xs focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000]"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Professional Advisor">Professional Advisor (Recommended)</option>
                </select>
              </div>

              {/* Dropdown - Risk Preference */}
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-black uppercase text-[#0F172A] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Risk Tolerance Profile</span>
                </label>
                <select
                  value={riskPreference}
                  onChange={(e) => setRiskPreference(e.target.value)}
                  className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl p-3 font-bold text-xs focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000]"
                >
                  <option value="Conservative">Conservative</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Aggressive">Aggressive</option>
                </select>
              </div>
            </div>

            {/* Dropdown - Investment Goal */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] font-black uppercase text-[#0F172A]">
                Primary Investment Goal
              </label>
              <select
                value={investmentGoal}
                onChange={(e) => setInvestmentGoal(e.target.value)}
                className="w-full bg-[#F8FAFC] border-3 border-black rounded-xl p-3 font-bold text-xs focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#000000]"
              >
                <option value="Wealth Preservation">Wealth Preservation</option>
                <option value="Aggressive Growth">Aggressive Growth</option>
                <option value="Dividend Income">Dividend Income</option>
                <option value="Speculative AI Signals">Speculative AI Signals</option>
              </select>
            </div>

            {/* Complete setup button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-4 bg-[#2563EB] text-white font-black text-xs uppercase rounded-xl border-3 border-black shadow-[3px_3px_0px_#000000] hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span>{loading ? "CONFIGURING SYSTEM PORTFOLIO..." : "COMPLETE ONBOARDING SETUP"}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-white" />}
            </button>
          </form>
        )}
      </main>

      {/* Footer console message */}
      <footer className="w-full max-w-5xl mx-auto mt-12 text-center font-mono text-[9px] text-[#64748B] z-10">
        SYSTEM CONFIGURATION STEP {step} OF 2 • STOCKOX PLATFORM V3.0
      </footer>
    </div>
  );
}
