import { NextResponse } from "next/server";

export async function GET() {
  const marketOverview = [
    {
      name: "S&P 500",
      value: 5431.60,
      changePercent: 0.85,
      history: [
        { time: "10:00", value: 5390 },
        { time: "11:00", value: 5410 },
        { time: "12:00", value: 5405 },
        { time: "13:00", value: 5420 },
        { time: "14:00", value: 5431 },
      ],
    },
    {
      name: "NASDAQ",
      value: 16920.45,
      changePercent: 1.42,
      history: [
        { time: "10:00", value: 16700 },
        { time: "11:00", value: 16810 },
        { time: "12:00", value: 16790 },
        { time: "13:00", value: 16870 },
        { time: "14:00", value: 16920 },
      ],
    },
    {
      name: "NIFTY 50",
      value: 23501.10,
      changePercent: 0.55,
      history: [
        { time: "10:00", value: 23380 },
        { time: "11:00", value: 23420 },
        { time: "12:00", value: 23450 },
        { time: "13:00", value: 23480 },
        { time: "14:00", value: 23501 },
      ],
    },
    {
      name: "Gold",
      value: 2320.15,
      changePercent: -0.32,
      history: [
        { time: "10:00", value: 2330 },
        { time: "11:00", value: 2325 },
        { time: "12:00", value: 2322 },
        { time: "13:00", value: 2318 },
        { time: "14:00", value: 2320 },
      ],
    },
    {
      name: "Bitcoin",
      value: 67450.00,
      changePercent: 3.84,
      history: [
        { time: "10:00", value: 65100 },
        { time: "11:00", value: 66200 },
        { time: "12:00", value: 65900 },
        { time: "13:00", value: 66800 },
        { time: "14:00", value: 67450 },
      ],
    },
  ];
  return NextResponse.json(marketOverview);
}
