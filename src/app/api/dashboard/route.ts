import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    portfolio: {
      value: 125400,
      changePercent: 4.21,
      changeAmount: 5062,
    },
    agentsActiveCount: 4,
    agentsTotalCount: 5,
    watchlistCount: 5,
    marketSentiment: "BULLISH",
  });
}
