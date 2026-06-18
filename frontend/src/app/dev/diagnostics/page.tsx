"use client";

import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bug,
  Database,
  Lock,
  Zap,
  Globe,
  Bot,
  Terminal,
  RefreshCw,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Server,
  Key,
} from "lucide-react";

interface DiagnosticsData {
  status: {
    frontend: string;
    backend: string;
    database: string;
    valkey: string;
    clerk: string;
    supabase: string;
    market_apis: string;
    band_agents: string;
    websocket: string;
  };
  database: {
    connected: boolean;
    latency_ms: number;
    counts: {
      users: number;
      portfolios: number;
      watchlists: number;
      recommendations: number;
      stock_metadata: number;
    };
  };
  cache: {
    connected: boolean;
    provider: string;
    hits: number;
    misses: number;
    hit_rate: string;
    keys: number;
    memory_usage: string;
  };
  market_providers: Array<{
    provider: string;
    status: string;
    latency_ms: number;
    quota_remaining: string;
    last_error: string;
  }>;
  agents: Array<{
    name: string;
    loaded: boolean;
    running: boolean;
    error: string;
    execution_time_ms: number;
  }>;
  env_variables: Array<{
    name: string;
    status: string;
  }>;
  recent_errors: Array<{
    timestamp: string;
    module: string;
    error: string;
    stack_trace: string;
    api_endpoint: string;
  }>;
}

interface ApiEndpointTest {
  endpoint: string;
  status: string;
  responseTime: string;
  error: string;
}

export default function DiagnosticsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  // Hide in production
  const isProduction = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_MODE !== "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [apiTests, setApiTests] = useState<ApiEndpointTest[]>([]);
  const [testingApis, setTestingApis] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [testingBand, setTestingBand] = useState(false);

  useEffect(() => {
    if (isProduction) {
      router.push("/dashboard");
    }
  }, [isProduction, router]);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/dev/diagnostics", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch diagnostics: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load diagnostics from backend");
    } finally {
      setLoading(false);
    }
  };

  const runApiTests = async () => {
    setTestingApis(true);
    const endpoints = [
      "/api/dashboard",
      "/api/profile",
      "/api/portfolio",
      "/api/watchlist",
      "/api/search?q=AAPL",
      "/api/dashboard/recommendations",
      "/api/market-overview",
      "/api/dashboard/committee",
    ];

    const results: ApiEndpointTest[] = [];

    for (const ep of endpoints) {
      const start = performance.now();
      try {
        const token = await getToken();
        const res = await fetch(ep, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
        const duration = Math.round(performance.now() - start);

        if (res.ok) {
          results.push({
            endpoint: ep,
            status: `${res.status} ${res.statusText}`,
            responseTime: `${duration}ms`,
            error: "",
          });
        } else {
          const body = await res.text().catch(() => "");
          results.push({
            endpoint: ep,
            status: `${res.status} ${res.statusText}`,
            responseTime: `${duration}ms`,
            error: body.slice(0, 100) || "API returned error code",
          });
        }
      } catch (err: any) {
        const duration = Math.round(performance.now() - start);
        results.push({
          endpoint: ep,
          status: "Network Error",
          responseTime: `${duration}ms`,
          error: err.message || "Failed to connect",
        });
      }
    }

    setApiTests(results);
    setTestingApis(false);
  };

  const handleClearCache = async () => {
    if (!confirm("Are you sure you want to clear the entire Valkey Cache?")) return;
    setClearingCache(true);
    try {
      const res = await fetch("/api/dev/diagnostics/clear-cache", {
        method: "POST",
      });
      if (res.ok) {
        alert("Valkey cache cleared successfully!");
        fetchDiagnostics();
      } else {
        const body = await res.json();
        alert(`Failed to clear cache: ${body.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Network error clearing cache: ${err.message}`);
    } finally {
      setClearingCache(false);
    }
  };

  const handleTestBand = async () => {
    setTestingBand(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/analysis/test-agent", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`BAND DIAGNOSTICS PASSED:\n${resJson.message}\nMock status: ${resJson.mock}`);
        fetchDiagnostics();
      } else {
        alert(`BAND DIAGNOSTICS FAILED:\n${resJson.message}`);
      }
    } catch (err: any) {
      alert(`Band connection check failed: ${err.message}`);
    } finally {
      setTestingBand(false);
    }
  };

  const exportDiagnosticsReport = () => {
    if (!data) return;
    const report = {
      ...data,
      api_tests: apiTests,
      exported_at: new Date().toISOString(),
      client_env: {
        node_env: process.env.NODE_ENV,
        clerk_loaded: isLoaded,
        clerk_signed_in: isSignedIn,
        clerk_user_id: clerkUser?.id || "N/A",
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isProduction) {
      fetchDiagnostics();
      runApiTests();
    }
  }, [isProduction]);

  if (isProduction) return null;

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "healthy" || s === "pass" || s === "true" || s === "found" || s.startsWith("200")) return "bg-emerald-500 text-white border-emerald-600";
    if (s === "warning" || s === "degraded") return "bg-amber-500 text-white border-amber-600";
    return "bg-rose-500 text-white border-rose-600";
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === "healthy" || s === "pass" || s === "true" || s === "found" || s.startsWith("200")) return <CheckCircle className="w-3.5 h-3.5" />;
    if (s === "warning" || s === "degraded") return <AlertTriangle className="w-3.5 h-3.5" />;
    return <XCircle className="w-3.5 h-3.5" />;
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-black font-sans p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:bg-gray-50 cursor-pointer mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Terminal
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 border-3 border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">System Diagnostics</h1>
              <p className="text-xs font-bold text-gray-500">Developer diagnostics console · Temporary module</p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 border-3 border-black text-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Run Full Health Check
          </button>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border-3 border-black text-rose-600 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cache
          </button>
          <button
            onClick={exportDiagnosticsReport}
            disabled={!data}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] border-3 border-black text-white rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            Export Diagnostics
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64 max-w-7xl mx-auto">
          <RefreshCw className="w-10 h-10 text-[#2563EB] animate-spin" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-rose-100 border-4 border-rose-500 rounded-2xl flex items-start gap-3 shadow-[4px_4px_0px_#000]">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm text-rose-800 uppercase">Backend Diagnostics Unreachable</p>
                <p className="text-xs text-rose-700 font-bold mt-1">{error}</p>
                <button onClick={fetchDiagnostics} className="mt-3 px-3 py-1.5 bg-rose-600 text-white border-2 border-black rounded-lg font-black text-[10px] uppercase shadow-[2px_2px_0px_#000] hover:bg-rose-700">
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* Grid section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Overall Status Map & System health */}
            <div className="md:col-span-4 space-y-6">
              {/* Overall Status dashboard */}
              <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#2563EB]" />
                  System Health Dashboard
                </h2>
                {data && (
                  <div className="space-y-2.5">
                    {Object.entries(data.status).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-[#F8FAFC] border-2 border-black/10 rounded-xl">
                        <span className="text-xs font-black uppercase text-gray-600">{key.replace("_", " ")}</span>
                        <div className={`flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border-2 ${getStatusColor(val)}`}>
                          {getStatusIcon(val)} {val}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Environment Variable Auditor */}
              <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#2563EB]" />
                  Environment Variables
                </h2>
                {data && (
                  <div className="space-y-2">
                    {data.env_variables.map((ev) => (
                      <div key={ev.name} className="flex justify-between items-center p-2 bg-[#F8FAFC] border border-gray-200 rounded-xl">
                        <span className="font-mono text-[9px] font-bold text-gray-700 truncate max-w-[200px]" title={ev.name}>
                          {ev.name}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border-2 ${getStatusColor(ev.status)}`}>
                          {ev.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Database, Cache, API and Agent health */}
            <div className="md:col-span-8 space-y-6">
              {/* API Health test board */}
              <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-2">
                  <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-[#2563EB]" />
                    API Health Checklist
                  </h2>
                  <button
                    onClick={runApiTests}
                    disabled={testingApis}
                    className="px-3 py-1.5 bg-white border-2 border-black rounded-lg font-black text-[9px] uppercase shadow-[2px_2px_0px_#000] hover:bg-gray-50 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingApis ? "animate-spin" : ""}`} />
                    Test APIs
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-gray-50">
                        <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-gray-500">Endpoint</th>
                        <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-gray-500">Status</th>
                        <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-gray-500">Latency</th>
                        <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-gray-500">Response Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiTests.map((t, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-[#F8FAFC]">
                          <td className="px-3 py-2.5 font-mono text-[10px] font-bold">{t.endpoint}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border-2 ${getStatusColor(t.status)}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-black">{t.responseTime}</td>
                          <td className="px-3 py-2.5 text-[10px] font-mono text-rose-600 truncate max-w-[200px]" title={t.error}>
                            {t.error || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database & Valkey Cache Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Database health */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                  <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#2563EB]" />
                    PostgreSQL Tables
                  </h2>
                  {data && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold border-b border-gray-100 pb-1.5">
                        <span className="text-gray-400">Connection</span>
                        <span className={data.database.connected ? "text-emerald-600" : "text-rose-500"}>
                          {data.database.connected ? "Connected" : "Disconnected"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-b border-gray-100 pb-1.5">
                        <span className="text-gray-400">Query Latency</span>
                        <span className="text-black font-black">{data.database.latency_ms}ms</span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Record Counts</p>
                        {Object.entries(data.database.counts).map(([tbl, count]) => (
                          <div key={tbl} className="flex justify-between items-center text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg p-2">
                            <span className="text-gray-600 capitalize">{tbl.replace("_", " ")}</span>
                            <span className="font-mono font-black">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Valkey Cache stats */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                  <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#2563EB]" />
                    Valkey Cache stats
                  </h2>
                  {data && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold border-b border-gray-100 pb-1.5">
                        <span className="text-gray-400">Connection</span>
                        <span className={data.cache.connected ? "text-emerald-600" : "text-rose-500"}>
                          {data.cache.connected ? "Connected" : "Disconnected"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-b border-gray-100 pb-1.5">
                        <span className="text-gray-400">Provider</span>
                        <span className="text-black font-black">{data.cache.provider}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-b border-gray-100 pb-1.5">
                        <span className="text-gray-400">Keys Stored</span>
                        <span className="text-black font-black">{data.cache.keys}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-b border-gray-100 pb-1.5">
                        <span className="text-gray-400">Memory Usage</span>
                        <span className="text-black font-black">{data.cache.memory_usage}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                          <p className="text-[16px] font-black text-emerald-600">{data.cache.hits}</p>
                          <p className="text-[8px] font-black uppercase text-emerald-500">Hits</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-center">
                          <p className="text-[16px] font-black text-rose-600">{data.cache.misses}</p>
                          <p className="text-[8px] font-black uppercase text-rose-500">Misses</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                          <p className="text-[16px] font-black text-blue-600">{data.cache.hit_rate}</p>
                          <p className="text-[8px] font-black uppercase text-blue-500">Hit Rate</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Market Data Providers & LLM Agents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Market Data Providers */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                  <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[#2563EB]" />
                    Market Data Providers
                  </h2>
                  {data && (
                    <div className="space-y-3">
                      {data.market_providers.map((p) => (
                        <div key={p.provider} className="border-2 border-black/10 rounded-xl p-3 bg-[#F8FAFC]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-xs text-black">{p.provider}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getStatusColor(p.status)}`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-bold">
                            <div>Latency: <span className="text-black font-black">{p.latency_ms}ms</span></div>
                            <div>Quota: <span className="text-black font-black">{p.quota_remaining}</span></div>
                          </div>
                          {p.last_error && (
                            <p className="text-[9px] font-mono text-rose-600 mt-2 bg-rose-50 p-1.5 rounded border border-rose-100">
                              {p.last_error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LLM Agents health check status */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                  <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-2">
                    <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-[#2563EB]" />
                      Band Committee Agents
                    </h2>
                    <button
                      onClick={handleTestBand}
                      disabled={testingBand}
                      className="px-3 py-1 bg-white border-2 border-black rounded-lg font-black text-[9px] uppercase shadow-[2px_2px_0px_#000] hover:bg-gray-50 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${testingBand ? "animate-spin" : ""}`} />
                      Diagnostics
                    </button>
                  </div>
                  {data && (
                    <div className="space-y-3">
                      {data.agents.map((a) => (
                        <div key={a.name} className="flex justify-between items-center p-2.5 bg-[#F8FAFC] border-2 border-black/10 rounded-xl">
                          <div>
                            <p className="text-xs font-black text-[#0F172A]">{a.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold">Latency: {a.execution_time_ms}ms</p>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border-2 ${getStatusColor(a.loaded ? "PASS" : "FAIL")}`}>
                            {a.loaded ? "LOADED" : "MISSING"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Auth Health Details */}
              <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#2563EB]" />
                  Auth Health Details (Clerk + Supabase)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Clerk Session Info</p>
                    <div className="flex justify-between text-xs font-medium bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <span className="text-gray-500">Clerk Loaded</span>
                      <span className="font-black">{isLoaded ? "PASS" : "FAIL"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <span className="text-gray-500">User Logged In</span>
                      <span className="font-black">{isSignedIn ? "PASS" : "FAIL"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <span className="text-gray-500">User ID</span>
                      <span className="font-mono font-bold truncate max-w-[150px]">{clerkUser?.id || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">User Sync Details</p>
                    <div className="flex justify-between text-xs font-medium bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <span className="text-gray-500">JWT Valid</span>
                      <span className="font-black">{isSignedIn ? "PASS" : "FAIL"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <span className="text-gray-500">User Synced</span>
                      <span className="font-black">{data?.status.clerk === "Healthy" ? "PASS" : "FAIL"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <span className="text-gray-500">Supabase Exists</span>
                      <span className="font-black">{data?.status.supabase === "Healthy" ? "PASS" : "FAIL"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Error Console */}
              <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-5">
                <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-gray-100 pb-2 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-rose-500 animate-pulse" />
                  Live Error Console
                </h2>
                {data && data.recent_errors.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs font-black uppercase text-gray-400">No recent errors logged.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {data?.recent_errors.map((err, idx) => (
                      <div key={idx} className="p-3 border-2 border-rose-200 bg-rose-50/50 rounded-xl space-y-1.5 font-mono text-[10px]">
                        <div className="flex justify-between items-center font-bold text-rose-800">
                          <span>Module: {err.module}</span>
                          <span>{new Date(err.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-rose-700 font-extrabold">Error: {err.error}</p>
                        <p className="text-gray-500 font-bold">Endpoint: {err.api_endpoint || "—"}</p>
                        {err.stack_trace && (
                          <div className="bg-rose-100/50 border border-rose-200 p-2 rounded text-gray-600 font-bold overflow-x-auto whitespace-pre">
                            {err.stack_trace}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
