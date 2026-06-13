"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType, UTCTimestamp, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import { Candle } from "@/lib/selectedStockStore";

interface LightweightChartProps {
	data: Candle[];
}

export default function LightweightChart({ data }: LightweightChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!chartContainerRef.current || data.length === 0) return;

		// 1. Sort data chronologically to prevent Lightweight Charts ordering assertions
		const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

		// 2. Initialize Chart
		const chart = createChart(chartContainerRef.current, {
			layout: {
				background: { type: ColorType.Solid, color: "#ffffff" },
				textColor: "#0F172A",
			},
			grid: {
				vertLines: { color: "rgba(15, 23, 42, 0.06)" },
				horzLines: { color: "rgba(15, 23, 42, 0.06)" },
			},
			width: chartContainerRef.current.clientWidth,
			height: 320,
			timeScale: {
				borderColor: "#000000",
				timeVisible: true,
			},
		});

		// 3. Add Candlestick Series
		const candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: "#22C55E",
			downColor: "#EF4444",
			borderUpColor: "#000000",
			borderDownColor: "#000000",
			wickUpColor: "#000000",
			wickDownColor: "#000000",
		});

		const candleData = sortedData.map((item) => ({
			time: item.timestamp as UTCTimestamp,
			open: item.open,
			high: item.high,
			low: item.low,
			close: item.close,
		}));
		candlestickSeries.setData(candleData);

		// 4. Add Volume Histogram Series
		const volumeSeries = chart.addSeries(HistogramSeries, {
			priceFormat: {
				type: "volume",
			},
			priceScaleId: "", // underlayed
		});

		volumeSeries.priceScale().applyOptions({
			scaleMargins: {
				top: 0.7, // 70% from top (overlayed at the bottom 30%)
				bottom: 0,
			},
		});

		const volumeData = sortedData.map((item) => ({
			time: item.timestamp as UTCTimestamp,
			value: item.volume,
			color: item.close >= item.open ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)",
		}));
		volumeSeries.setData(volumeData);

		// 5. Calculate 14-day Simple Moving Average (SMA)
		const smaSeries = chart.addSeries(LineSeries, {
			color: "#2563EB",
			lineWidth: 2,
			title: "SMA (14)",
		});

		const smaData = sortedData
			.map((item, idx) => {
				if (idx < 13) return null; // Needs 14 data points
				let sum = 0;
				for (let i = idx - 13; i <= idx; i++) {
					sum += sortedData[i].close;
				}
				return {
					time: item.timestamp as UTCTimestamp,
					value: sum / 14,
				};
			})
			.filter((item): item is { time: UTCTimestamp; value: number } => item !== null);

		smaSeries.setData(smaData);

		// 6. Handle Resizing
		const handleResize = () => {
			if (chartContainerRef.current) {
				chart.applyOptions({ width: chartContainerRef.current.clientWidth });
			}
		};
		window.addEventListener("resize", handleResize);

		// Fit timescale content
		chart.timeScale().fitContent();

		return () => {
			window.removeEventListener("resize", handleResize);
			chart.remove();
		};
	}, [data]);

	return (
		<div className="w-full select-none">
			<div
				ref={chartContainerRef}
				className="w-full border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000000] overflow-hidden bg-white p-2"
			/>
		</div>
	);
}
