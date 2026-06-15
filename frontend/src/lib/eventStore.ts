/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { BaseEvent } from "./websocketStore";

interface EventState {
  events: BaseEvent[];
  addEvent: (event: BaseEvent) => void;
  clearEvents: () => void;
  fetchSessionEvents: (sessionId: string, token: string | null) => Promise<BaseEvent[]>;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  addEvent: (event) => set((state) => {
    // Prevent adding identical event IDs
    if (state.events.some((e) => e.id === event.id)) return state;
    return { events: [...state.events, event] };
  }),
  clearEvents: () => set({ events: [] }),
  fetchSessionEvents: async (sessionId, token) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseUrl}/api/v1/analysis/${sessionId}/events`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch session event logs");
      }

      const dbEvents = await response.json();
      // Map database format to standard BaseEvent format
      const formattedEvents: BaseEvent[] = dbEvents.map((e: any) => ({
        id: e.id,
        type: e.event_type,
        timestamp: e.created_at,
        payload: JSON.parse(e.payload),
      }));

      set({ events: formattedEvents });
      return formattedEvents;
    } catch (err) {
      console.error("[EVENT-STORE-ERR] Error fetching events:", err);
      return [];
    }
  },
}));
