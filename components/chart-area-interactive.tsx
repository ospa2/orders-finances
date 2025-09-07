"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup, ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { transformOrdersToChartData } from "@/lib/pnl"

type Order = {
  "Order No.": number
  Type: "BUY" | "SELL"
  "Fiat Amount": number
  Price: number
  "Coin Amount": number
  Counterparty: string
  Status: "Completed" | "Canceled"
  Time: string
}

export const description = "An interactive area chart"

const chartConfig = {
  visitors: { label: "Visitors" },
  buy: { label: "Buy", color: "var(--color-buy)" },
  sell: { label: "Sell", color: "var(--color-sell)" },
  revenue: { label: "Revenue", color: "var(--color-revenue)" },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const [chartData, setChartData] = React.useState<any[]>([])

  // загрузка данных
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/chart-data")
        const raw = await res.json()
        
        setChartData(raw)
      } catch (err) {
        console.error("Failed to fetch chart data", err)
      }
    }
    load()
  }, [])

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  // последняя дата в данных
  const referenceDate = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return new Date()
    return new Date(chartData[chartData.length - 1].date)
  }, [chartData])

  // фильтр по диапазону
  const filteredData = React.useMemo(() => {
    if (!chartData) return []
    let daysToSubtract = 90
    if (timeRange === "30d") daysToSubtract = 30
    else if (timeRange === "7d") daysToSubtract = 7

    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract + 1)

    return chartData.filter((item) => {
      const d = new Date(item.date)
      return d >= startDate && d <= referenceDate
    })
  }, [timeRange, referenceDate, chartData])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Visitors</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Total for the last 3 months</span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Select a value">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillBuy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-buy)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-buy)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillSell" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sell)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-sell)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }}
            />

            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }}
                  indicator="dot"
                />
              }
            />

            <Area dataKey="sell" type="natural" fill="url(#fillSell)" stroke="var(--color-sell)" stackId="a" yAxisId="left" />
            <Area dataKey="buy" type="natural" fill="url(#fillBuy)" stroke="var(--color-buy)" stackId="a" yAxisId="left" />
            <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} activeDot={{ r: 3 }} yAxisId="right" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
