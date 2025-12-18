"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useChartData } from "@/hooks/useChartData"
import { Loader2, Calendar } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"

type TimeRange = '1m' | '6m' | '1y' | 'custom'

export function Overview() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('6m')
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  // Fetch data with selected range
  const { data, loading, error } = useChartData({
    range: selectedRange,
    startDate: customStartDate?.toISOString(),
    endDate: customEndDate?.toISOString()
  })

  const handleRangeChange = (value: string) => {
    const range = value as TimeRange
    setSelectedRange(range)

    if (range !== 'custom') {
      setShowCustomPicker(false)
      setCustomStartDate(undefined)
      setCustomEndDate(undefined)
    } else {
      setShowCustomPicker(true)
    }
  }

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setShowCustomPicker(false)
      // Data will auto-refresh via useEffect in hook
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-muted rounded w-64 animate-pulse" />
        </div>
        <div className="flex items-center justify-center h-[350px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Tabs value={selectedRange} onValueChange={handleRangeChange}>
          <TabsList>
            <TabsTrigger value="1m">1 Month</TabsTrigger>
            <TabsTrigger value="6m">6 Months</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center justify-center h-[350px] text-red-500">
          Failed to load chart data
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <Tabs value={selectedRange} onValueChange={handleRangeChange}>
          <TabsList>
            <TabsTrigger value="1m">1 Month</TabsTrigger>
            <TabsTrigger value="6m">6 Months</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center justify-center h-[350px] text-muted-foreground">
          No transaction data available for this period
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeframe Selector */}
      <div className="flex justify-between items-center gap-4">
        <Tabs value={selectedRange} onValueChange={handleRangeChange}>
          <TabsList>
            <TabsTrigger value="1m">1 Month</TabsTrigger>
            <TabsTrigger value="6m">6 Months</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                {customStartDate && customEndDate
                  ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`
                  : 'Select dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => customStartDate ? date < customStartDate : false}
                  />
                </div>
                <Button
                  onClick={handleApplyCustomRange}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full"
                >
                  Apply Range
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
          />
          <Legend />
          <Bar dataKey="Income" fill="#22c55e" />
          <Bar dataKey="Expenses" fill="#ef4444" />
          <Bar dataKey="Savings" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}