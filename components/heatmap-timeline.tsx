"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order } from "@/lib/pnl";



type ParsedOrder = Order & {
  timestamp: number;
};

type DragMode = "start" | "end" | "bar" | null;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MS_IN_MONTH = 30 * 24 * 60 * 60 * 1000; // ~1 month in ms

// --- Helper: Format Currency ---
const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `₽${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₽${(value / 1_000).toFixed(1)}K`;
  return `₽${value.toFixed(0)}`;
};

export function Heatmap() {
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Data Loading & Pre-processing (Performance: Parse dates once)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("orders_cache") || "[]");
      setRawOrders(stored);
    } catch (e) {
      console.error("Failed to load orders", e);
    }
    setIsLoaded(true);
  }, []);

  const sortedOrders: ParsedOrder[] = useMemo(() => {
    if (!isLoaded) return [];
    return rawOrders
      .filter((o) => o.Status === "Completed")
      .map((o) => ({ ...o, timestamp: new Date(o.Time).getTime() }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rawOrders, isLoaded]);

  const [mode, setMode] = useState<"BUY" | "SELL">("BUY");

  // 2. Time Range Calculations
  const { minTime, totalDuration } = useMemo(() => {
    if (sortedOrders.length === 0)
      return { minTime: 0, maxTime: 100, totalDuration: 100 };
    const min = sortedOrders[0].timestamp;
    const max = sortedOrders[sortedOrders.length - 1].timestamp;
    return { minTime: min, maxTime: max, totalDuration: max - min };
  }, [sortedOrders]);

  // Calculate min percentage for 1 month
  const minRangePercent = useMemo(() => {
    if (totalDuration <= 0) return 0;
    const pct = (MS_IN_MONTH / totalDuration) * 100;
    return pct > 100 ? 100 : pct;
  }, [totalDuration]);

  // Slider State (0-100)
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(100);

  // 3. Slice Optimization (Performance: Avoid .filter iteration on full array)
  const filteredOrders = useMemo(() => {
    if (sortedOrders.length === 0) return [];

    // Calculate timestamps from percentages
    const startTs = minTime + totalDuration * (rangeStart / 100);
    const endTs = minTime + totalDuration * (rangeEnd / 100);

    // Find indices (Binary search would be faster for >100k items, but simple loop is fine for <10k)
    // Using findIndex is O(N) but faster than filter which allocates new array every check
    let startIndex = 0;
    let endIndex = sortedOrders.length - 1;

    for (let i = 0; i < sortedOrders.length; i++) {
      if (sortedOrders[i].timestamp >= startTs) {
        startIndex = i;
        break;
      }
    }
    for (let i = sortedOrders.length - 1; i >= 0; i--) {
      if (sortedOrders[i].timestamp <= endTs) {
        endIndex = i;
        break;
      }
    }

    if (startIndex > endIndex) return [];

    // Slice is faster than filter for range operations
    return sortedOrders.slice(startIndex, endIndex + 1);
  }, [sortedOrders, rangeStart, rangeEnd, minTime, totalDuration]);

  // 4. Heatmap Generation
  const { grid, maxValue, totalVolume, count } = useMemo(() => {
    const gridData: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );
    let max = 1;
    let sum = 0;
    let cnt = 0;

    const relevantOrders = filteredOrders.filter((o) => o.Type === mode);

    for (const order of relevantOrders) {
      const date = new Date(order.timestamp);
      // getDay: 0=Sun, 1=Mon. We want Mon=0, Sun=6.
      // (day + 6) % 7 handles shift correctly.
      const dayOfWeek = (date.getDay() + 6) % 7;
      const hour = date.getHours();
      const val = order["Fiat Amount"];

      gridData[dayOfWeek][hour] += val;
      sum += val;
      cnt++;
    }

    // Find max after filling to avoid second loop
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (gridData[d][h] > max) max = gridData[d][h];
      }
    }

    return { grid: gridData, maxValue: max, totalVolume: sum, count: cnt };
  }, [filteredOrders, mode]);

  // --- Slider Logic ---
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startRange: number;
    endRange: number;
    mode: DragMode;
  }>({ startX: 0, startRange: 0, endRange: 0, mode: null });

  const handlePointerDown = (
    e: React.PointerEvent,
    dragMode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture initial state
    dragRef.current = {
      startX: e.clientX,
      startRange: rangeStart,
      endRange: rangeEnd,
      mode: dragMode,
    };
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current.mode || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const deltaPx = e.clientX - dragRef.current.startX;
      const deltaPercent = (deltaPx / rect.width) * 100;

      const { startRange, endRange, mode: dragMode } = dragRef.current;

      let newStart = startRange;
      let newEnd = endRange;

      if (dragMode === "bar") {
        newStart = Math.max(0, Math.min(100 - (endRange - startRange), startRange + deltaPercent));
        newEnd = newStart + (endRange - startRange);
      } else if (dragMode === "start") {
        newStart = Math.max(0, Math.min(endRange - minRangePercent, startRange + deltaPercent));
      } else if (dragMode === "end") {
        newEnd = Math.min(100, Math.max(startRange + minRangePercent, endRange + deltaPercent));
      }

      setRangeStart(newStart);
      setRangeEnd(newEnd);
    },
    [minRangePercent]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current.mode = null;
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  }, []);

  // Styles
  const colorHex = mode === "BUY" ? "#18f168" : "#f91c1c";
  const colorClass = mode === "BUY" ? "green" : "red";

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="w-full mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              Order Volume Heatmap
            </CardTitle>
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {(["BUY", "SELL"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    mode === m
                      ? m === "BUY"
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-red-500 text-white shadow-md"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  {m} Orders
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label={`Total ${mode} Volume`}
              value={formatCurrency(totalVolume)}
              subtext={`${count} orders`}
              color={colorClass}
            />
            <StatCard
              label="Average per Order"
              value={formatCurrency(count > 0 ? totalVolume / count : 0)}
              subtext="Mean value"
              color={colorClass}
            />
            <StatCard
              label="Active Range"
              value={`${Math.round(totalDuration * ((rangeEnd - rangeStart) / 100) / (1000 * 60 * 60 * 24))} Days`}
              subtext="Selected period"
              color={colorClass}
            />
          </div>

          {/* Heatmap Visualization */}
          <div className="space-y-3">
            <h3 className={`text-lg font-semibold text-${colorClass}-600`}>
              {mode} Volume Distribution
            </h3>
            
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="flex mb-1">
                  <div className="w-12" />
                  {HOURS.map((h) => (
                    <div key={h} className="flex-1 text-center text-xs text-muted-foreground">
                      {h}
                    </div>
                  ))}
                </div>
                {/* Grid */}
                {DAYS.map((day, dIdx) => (
                  <div key={day} className="flex items-center mb-1">
                    <div className="w-12 text-sm text-muted-foreground">{day}</div>
                    <div className="flex gap-1 flex-1">
                      {HOURS.map((hour) => {
                        const val = grid[dIdx][hour];
                        const intensity = val / maxValue;
                        return (
                          <div
                            key={hour}
                            className="flex-1 aspect-square rounded relative group hover:scale-110 hover:z-10 transition-transform cursor-default"
                            style={{
                              backgroundColor: val > 0 
                                ? `${colorHex}${Math.floor(Math.max(intensity * 255, 40)).toString(16).padStart(2, '0')}`
                                : 'rgba(30, 30, 30, 0.05)'
                            }}
                            title={`${day} ${hour}:00 - ${formatCurrency(val)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optimized Custom Range Slider */}
          <div className="space-y-4 pt-4 border-t select-none">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Timeline</h3>
                <span className="text-xs text-muted-foreground font-mono">
                    Min View: 1 Month
                </span>
            </div>
            
            <div className="relative pt-6 pb-2 px-2" ref={sliderRef}>
              {/* Background Track */}
              <div className="absolute top-1/2 left-0 w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full -translate-y-1/2" />

              {/* Active Bar (Draggable) */}
              <div
                className="absolute top-1/2 h-2 bg-neutral-500 rounded-full -translate-y-1/2 cursor-grab active:cursor-grabbing group"
                style={{
                  left: `${rangeStart}%`,
                  width: `${rangeEnd - rangeStart}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "bar")}
              >
                {/* Hover overlay to make grabbing easier */}
                 <div className="absolute inset-0 -top-2 -bottom-2 w-full bg-transparent" />
              </div>

              {/* Left Thumb */}
              <div
                className="absolute top-1/2 w-6 h-6 bg-white border-2 border-neutral-600 rounded-full shadow-lg -translate-y-1/2 -translate-x-1/2 cursor-ew-resize hover:scale-110 transition-transform z-20 flex items-center justify-center"
                style={{ left: `${rangeStart}%` }}
                onPointerDown={(e) => handlePointerDown(e, "start")}
              >
                 <div className="w-1 h-3 bg-neutral-300 rounded-full" />
              </div>

              {/* Right Thumb */}
              <div
                className="absolute top-1/2 w-6 h-6 bg-white border-2 border-neutral-600 rounded-full shadow-lg -translate-y-1/2 -translate-x-1/2 cursor-ew-resize hover:scale-110 transition-transform z-20 flex items-center justify-center"
                style={{ left: `${rangeEnd}%` }}
                onPointerDown={(e) => handlePointerDown(e, "end")}
              >
                <div className="w-1 h-3 bg-neutral-300 rounded-full" />
              </div>
            </div>

            {/* Date Labels */}
            <div className="flex justify-between text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <span>{new Date(minTime + totalDuration * (rangeStart / 100)).toLocaleDateString()}</span>
              <span>{new Date(minTime + totalDuration * (rangeEnd / 100)).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple Stat Card Component
function StatCard({ label, value, subtext, color }: { label: string; value: string; subtext: string; color: string }) {
    // Note: Tailwind dynamic classes (bg-${color}-500) might not work if not safelisted. 
    // Using style or standard classes is safer. 
    const isGreen = color === 'green';
    return (
        <div className={`p-4 rounded-lg border ${isGreen ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className={`text-sm font-medium ${isGreen ? 'text-green-600' : 'text-red-600'}`}>{label}</div>
            <div className={`text-2xl font-bold ${isGreen ? 'text-green-700' : 'text-red-700'}`}>{value}</div>
            <div className="text-xs text-muted-foreground opacity-75">{subtext}</div>
        </div>
    )
}