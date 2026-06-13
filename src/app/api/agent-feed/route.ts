import { NextResponse } from "next/server";

export async function GET() {
  const feed = [
    {
      id: "feed-1",
      agentId: "research",
      agentName: "Research Agent",
      message: "Parsing NVDA Q1 balance sheet. Margins increased by 2.4% YoY. Value score: 92/100.",
      timestamp: "10 mins ago",
    },
    {
      id: "feed-2",
      agentId: "news",
      agentName: "News Agent",
      message: "Detected high-sentiment keyword clusters for semiconductors. Tech sector momentum is rising.",
      timestamp: "8 mins ago",
    },
    {
      id: "feed-3",
      agentId: "technical",
      agentName: "Technical Agent",
      message: "NVDA EMA 50 crossover verified on 4h chart. Immediate resistance target is $195.",
      timestamp: "5 mins ago",
    },
    {
      id: "feed-4",
      agentId: "risk",
      agentName: "Risk Agent",
      message: "Standard deviation check for tech holdings suggests adding NVDA keeps portfolio Volatility index stable (Beta: 1.12).",
      timestamp: "3 mins ago",
    },
    {
      id: "feed-5",
      agentId: "committee",
      agentName: "Committee Agent",
      message: "Consensus reached: 88% BUY recommendation dispatched for NVDA pool.",
      timestamp: "Just now",
    },
  ];
  return NextResponse.json(feed);
}
