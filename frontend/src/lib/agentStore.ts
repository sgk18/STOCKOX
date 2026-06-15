import { create } from "zustand";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "idle" | "thinking" | "analyzing" | "completed" | "error";
  activity: string;
}

interface AgentState {
  agents: Agent[];
  updateAgentStatus: (name: string, status: Agent["status"], activity: string) => void;
  resetAgents: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [
    { id: "research", name: "Research Agent", role: "Fundamental Valuation", status: "idle", activity: "Awaiting analysis trigger" },
    { id: "news", name: "News Agent", role: "Sentiment & Macro Coverage", status: "idle", activity: "Awaiting analysis trigger" },
    { id: "fundamental", name: "Fundamental Agent", role: "Valuation & PEG Ratios", status: "idle", activity: "Awaiting analysis trigger" },
    { id: "technical", name: "Technical Agent", role: "Breakouts & EMA Crosses", status: "idle", activity: "Awaiting analysis trigger" },
    { id: "risk", name: "Risk Agent", role: "Volatility Stress Modeling", status: "idle", activity: "Awaiting analysis trigger" },
    { id: "committee", name: "Committee Agent", role: "Consensus Synthesis", status: "idle", activity: "Awaiting analysis trigger" },
  ],
  updateAgentStatus: (name, status, activity) => set((state) => ({
    agents: state.agents.map((agent) =>
      agent.name === name ? { ...agent, status, activity } : agent
    ),
  })),
  resetAgents: () => set({
    agents: [
      { id: "research", name: "Research Agent", role: "Fundamental Valuation", status: "idle", activity: "Awaiting analysis trigger" },
      { id: "news", name: "News Agent", role: "Sentiment & Macro Coverage", status: "idle", activity: "Awaiting analysis trigger" },
      { id: "fundamental", name: "Fundamental Agent", role: "Valuation & PEG Ratios", status: "idle", activity: "Awaiting analysis trigger" },
      { id: "technical", name: "Technical Agent", role: "Breakouts & EMA Crosses", status: "idle", activity: "Awaiting analysis trigger" },
      { id: "risk", name: "Risk Agent", role: "Volatility Stress Modeling", status: "idle", activity: "Awaiting analysis trigger" },
      { id: "committee", name: "Committee Agent", role: "Consensus Synthesis", status: "idle", activity: "Awaiting analysis trigger" },
    ],
  }),
}));
