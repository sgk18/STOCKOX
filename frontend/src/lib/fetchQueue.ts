type Priority = "HIGH" | "MEDIUM" | "LOW";

interface QueueItem {
  url: string;
  init?: RequestInit;
  priority: Priority;
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
}

const queues: Record<Priority, QueueItem[]> = {
  HIGH: [],
  MEDIUM: [],
  LOW: [],
};

let activeConnections = 0;
const CONCURRENCY_LIMIT = 2; // Process queue sequentially with concurrency of 2 to prevent API storms while keeping throughput fast

function getPriority(url: string, init?: RequestInit): Priority {
  if (init && (init as any).priority) {
    return (init as any).priority;
  }

  const urlLower = url.toLowerCase();

  // HIGH Priority: Dashboard, sync, profile, portfolio summaries
  if (
    urlLower.includes("/auth/sync") ||
    urlLower.includes("/profile") ||
    urlLower.includes("/dashboard/portfolio") ||
    (urlLower.includes("/api/dashboard") && !urlLower.includes("/api/dashboard/"))
  ) {
    return "HIGH";
  }

  // MEDIUM Priority: Market Overview lists, watchlists
  if (
    urlLower.includes("/market-overview") ||
    urlLower.includes("/watchlist") ||
    urlLower.includes("/dashboard/watchlist") ||
    urlLower.includes("/dashboard/market-overview") ||
    urlLower.includes("/market-intelligence")
  ) {
    return "MEDIUM";
  }

  // LOW Priority: Research terminal metrics/history, AI committee rooms, logs, risk metrics, broker connect endpoints
  return "LOW";
}

function processQueue() {
  if (activeConnections >= CONCURRENCY_LIMIT) {
    return;
  }

  // Find the highest priority queue with items
  let nextItem: QueueItem | undefined;
  if (queues.HIGH.length > 0) {
    nextItem = queues.HIGH.shift();
  } else if (queues.MEDIUM.length > 0) {
    nextItem = queues.MEDIUM.shift();
  } else if (queues.LOW.length > 0) {
    nextItem = queues.LOW.shift();
  }

  if (!nextItem) {
    return;
  }

  activeConnections++;
  const { url, init, resolve, reject } = nextItem;

  const originalFetch = (window as any).__originalFetch || window.fetch;
  
  let cleanInit = init;
  if (init && (init as any).priority) {
    const { priority, ...rest } = init as any;
    cleanInit = rest;
  }

  originalFetch(url, cleanInit)
    .then((response: Response) => {
      resolve(response);
    })
    .catch((err: any) => {
      reject(err);
    })
    .finally(() => {
      activeConnections--;
      processQueue();
    });

  // Try to process more if concurrency slots are available
  processQueue();
}

export function queuedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input as any).url || String(input);
  const priority = getPriority(url, init);

  return new Promise<Response>((resolve, reject) => {
    queues[priority].push({
      url,
      init,
      priority,
      resolve,
      reject,
    });
    processQueue();
  });
}

export function initializeFetchQueue() {
  if (typeof window === "undefined") return;

  if (!(window as any).__originalFetch) {
    (window as any).__originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : (input as any).url || String(input);
      
      // Intercept internal api calls
      if (url.startsWith("/api") || url.includes("/api/")) {
        return queuedFetch(input, init);
      }
      
      return (window as any).__originalFetch(input, init);
    };
    console.info("[FETCH-QUEUE] Global priority-based fetch queue hook registered.");
  }
}
