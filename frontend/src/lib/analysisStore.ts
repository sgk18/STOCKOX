import { create } from "zustand";

export interface AgentPlaceholder {
	name: string;
	status: string;
	message: string;
}

interface AnalysisState {
	agents: AgentPlaceholder[];
	isAnalyzing: boolean;
	analysisFinished: boolean;
	setAgents: (agents: AgentPlaceholder[]) => void;
	runAnalysis: (ticker: string) => Promise<void>;
	resetAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
	agents: [
		{ name: "Research Agent", status: "Idle", message: "Waiting for Analysis" },
		{ name: "News Agent", status: "Idle", message: "Waiting for Analysis" },
		{ name: "Technical Agent", status: "Idle", message: "Waiting for Analysis" },
		{ name: "Risk Agent", status: "Idle", message: "Waiting for Analysis" },
		{ name: "Committee Agent", status: "Idle", message: "Waiting for Analysis" },
	],
	isAnalyzing: false,
	analysisFinished: false,
	setAgents: (agents) => set({ agents }),
	runAnalysis: async (ticker) => {
		set({ isAnalyzing: true, analysisFinished: false });
		// In future modules, this will connect to the real-time agent debate loops.
	},
	resetAnalysis: () => set({
		isAnalyzing: false,
		analysisFinished: false,
		agents: [
			{ name: "Research Agent", status: "Idle", message: "Waiting for Analysis" },
			{ name: "News Agent", status: "Idle", message: "Waiting for Analysis" },
			{ name: "Technical Agent", status: "Idle", message: "Waiting for Analysis" },
			{ name: "Risk Agent", status: "Idle", message: "Waiting for Analysis" },
			{ name: "Committee Agent", status: "Idle", message: "Waiting for Analysis" },
		],
	}),
}));
