import { NextResponse } from "next/server";

export async function GET() {
  const watchlist = [
    { ticker: "NVDA", name: "NVIDIA Corp.", price: 187.20, changePercent: 4.20, aiScore: 92, risk: "Low", recommendation: "BUY" },
    { ticker: "AAPL", name: "Apple Inc.", price: 178.45, changePercent: 1.15, aiScore: 82, risk: "Low", recommendation: "BUY" },
    { ticker: "TSLA", name: "Tesla Inc.", price: 210.80, changePercent: -2.40, aiScore: 64, risk: "High", recommendation: "HOLD" },
    { ticker: "MSFT", name: "Microsoft Corp.", price: 415.50, changePercent: 0.85, aiScore: 88, risk: "Low", recommendation: "BUY" },
    { ticker: "AMD", name: "Advanced Micro Devices", price: 162.30, changePercent: -1.95, aiScore: 71, risk: "Medium", recommendation: "HOLD" },
  ];
  return NextResponse.json(watchlist);
}
