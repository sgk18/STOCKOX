/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

type EventListener = (event: BaseEvent) => void;

interface WebSocketState {
  socket: WebSocket | null;
  connected: boolean;
  connecting: boolean;
  listeners: Record<string, EventListener[]>;
  connect: (token?: string | null) => void;
  disconnect: () => void;
  subscribe: (eventType: string, listener: EventListener) => () => void;
  unsubscribe: (eventType: string, listener: EventListener) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let manualClose = false;

  return {
    socket: null,
    connected: false,
    connecting: false,
    listeners: {},

    connect: (token) => {
      if (get().socket || get().connecting) return;

      set({ connecting: true });
      manualClose = false;

      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      
      // Determine the base WebSocket URL
      let wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (!wsBaseUrl) {
        wsBaseUrl = host.includes("localhost") 
          ? "ws://localhost:8080/ws" 
          : `${wsProto}//${host}/ws`;
      } else {
        // If NEXT_PUBLIC_WS_URL is set, make sure it points to /ws endpoint
        if (wsBaseUrl.endsWith("/api/dashboard/ws") || wsBaseUrl.endsWith("/api/ws")) {
          wsBaseUrl = wsBaseUrl.replace(/\/api\/dashboard\/ws$/, "/ws").replace(/\/api\/ws$/, "/ws");
        }
      }

      // Append token if present
      const wsUrl = token ? `${wsBaseUrl}?token=${token}` : wsBaseUrl;

      console.log("[WS-STORE] Connecting to WebSocket:", wsBaseUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS-STORE] Connection established");
        set({ socket: ws, connected: true, connecting: false });
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      ws.onmessage = (messageEvent) => {
        try {
          const rawEvent = JSON.parse(messageEvent.data);
          // If we receive a newline separated list of events (from buffering)
          if (Array.isArray(rawEvent)) {
            rawEvent.forEach((ev) => get().listeners[ev.type]?.forEach((l) => l(ev)));
          } else if (rawEvent.type) {
            const ev: BaseEvent = rawEvent;
            // Trigger specific listeners
            const specificListeners = get().listeners[ev.type] || [];
            specificListeners.forEach((listener) => {
              try {
                listener(ev);
              } catch (e) {
                console.error(`[WS-STORE] Error in listener for ${ev.type}:`, e);
              }
            });

            // Trigger wildcard "*" listeners
            const wildcardListeners = get().listeners["*"] || [];
            wildcardListeners.forEach((listener) => {
              try {
                listener(ev);
              } catch (e) {
                console.error("[WS-STORE] Error in wildcard listener:", e);
              }
            });
          }
        } catch (e) {
          console.error("[WS-STORE] Failed to parse message:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("[WS-STORE] WebSocket encountered error:", err);
      };

      ws.onclose = () => {
        console.log("[WS-STORE] Connection closed");
        set({ socket: null, connected: false, connecting: false });

        if (!manualClose) {
          // Reconnect in 5 seconds
          console.log("[WS-STORE] Reconnecting in 5s...");
          reconnectTimeout = setTimeout(() => {
            get().connect(token);
          }, 5000);
        }
      };
    },

    disconnect: () => {
      manualClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      const ws = get().socket;
      if (ws) {
        ws.close();
      }
      set({ socket: null, connected: false, connecting: false });
    },

    subscribe: (eventType, listener) => {
      set((state) => {
        const list = state.listeners[eventType] || [];
        return {
          listeners: {
            ...state.listeners,
            [eventType]: [...list, listener],
          },
        };
      });

      // Return unsubscribe function
      return () => get().unsubscribe(eventType, listener);
    },

    unsubscribe: (eventType, listener) => {
      set((state) => {
        const list = state.listeners[eventType] || [];
        return {
          listeners: {
            ...state.listeners,
            [eventType]: list.filter((l) => l !== listener),
          },
        };
      });
    },
  };
});
