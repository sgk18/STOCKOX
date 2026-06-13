"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { useAnalysisStore } from "@/lib/analysisStore";
import { useAuth } from "@clerk/nextjs";
import Button from "../../ui/Button";

interface WatchlistButtonProps {
  ticker: string;
  companyName: string;
}

export default function WatchlistButton({ ticker, companyName }: WatchlistButtonProps) {
  const { getToken } = useAuth();
  const watchlist = useAnalysisStore((state) => state.watchlist);
  const toggleWatchlistItem = useAnalysisStore((state) => state.toggleWatchlistItem);
  
  const [isPending, setIsPending] = useState(false);
  const isWatchlisted = watchlist.some((w) => w.ticker === ticker);

  const handleToggle = async () => {
    setIsPending(true);
    try {
      const token = await getToken();
      await toggleWatchlistItem(ticker, companyName, token);
    } catch (err) {
      console.error("Failed to toggle watchlist status:", err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={isWatchlisted ? "accent" : "secondary"}
      onClick={handleToggle}
      isLoading={isPending}
      leftIcon={
        <Star
          className={`w-4.5 h-4.5 transition-transform ${
            isWatchlisted ? "fill-black text-black scale-110" : "text-black/60"
          }`}
        />
      }
      className={`text-xs py-2 px-4 border-2 shadow-[2px_2px_0px_#000000] font-black uppercase tracking-wider rounded-xl select-none ${
        isWatchlisted ? "bg-[#FACC15] hover:bg-[#E2B80D]" : "bg-white hover:bg-black/5"
      }`}
    >
      {isWatchlisted ? "Watchlisted" : "Add to Watchlist"}
    </Button>
  );
}
