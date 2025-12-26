"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useChartData } from "@/hooks/useChartData"
import { Loader2, Calendar as CalendarIcon, Settings } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { format, startOfMonth, endOfMonth, parse } from "date-fns"
import { ReportDetailsModal } from "@/components/modal/modal-report-details"

type TimeRange = '1m' | '6m' | '1y' | 'custom'

interface OverviewProps {
  onEditTransaction?: (transaction: any) => void
}

export function Overview({ onEditTransaction }: OverviewProps = {}) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('6m')
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date>()
  const [tempEndDate, setTempEndDate] = useState<Date>()

  // Report details modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<{
    startDate: string
    endDate: string
    label: string
  } | null>(null)

  // Fetch data with selected range
  const { data, loading, error } = useChartData({
    range: selectedRange,
    startDate: customStartDate?.toISOString(),
    endDate: customEndDate?.toISOString()
  })

  const handleRangeChange = (value: string) => {
    const range = value as TimeRange

    if (range === 'custom') {
      // Only open dialog - don't change selectedRange yet
      setTempStartDate(customStartDate)
      setTempEndDate(customEndDate)
      setDialogOpen(true)
    } else {
      setSelectedRange(range)
      setCustomStartDate(undefined)
      setCustomEndDate(undefined)
    }
  }

  const handleOpenCustomDialog = () => {
    setTempStartDate(customStartDate)
    setTempEndDate(customEndDate)
    setDialogOpen(true)
  }

  const handleApplyCustomRange = () => {
    if (tempStartDate && tempEndDate) {
      setCustomStartDate(tempStartDate)
      setCustomEndDate(tempEndDate)
      setSelectedRange('custom')
      setDialogOpen(false)
    }
  }

  const handleCancelCustomRange = () => {
    setTempStartDate(undefined)
    setTempEndDate(undefined)
    setDialogOpen(false)
  }

  // Handle bar click to open report details
  const handleBarClick = (clickedData: any, index: number) => {
    if (!clickedData) return

    const monthLabel = clickedData.name

    // Parse the month label to get start and end dates
    let startDate: Date
    let endDate: Date

    if (selectedRange === 'custom') {
      // For custom range, use the full custom period
      if (customStartDate && customEndDate) {
        startDate = customStartDate
        endDate = customEndDate
      } else {
        return
      }
    } else {
      // Parse the month label (e.g., "Jan 2025")
      try {
        const parsedDate = parse(monthLabel, 'MMM yyyy', new Date())
        startDate = startOfMonth(parsedDate)
        endDate = endOfMonth(parsedDate)
      } catch (error) {
        console.error('Failed to parse month label:', error)
        return
      }
    }

    setSelectedPeriod({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label: monthLabel
    })
    setReportModalOpen(true)
  }

  // Handle chart click (for clicking anywhere on chart, not just bars)
  const handleChartClick = (data: any) => {
    if (!data || !data.activeLabel) return

    const monthLabel = data.activeLabel

    // Parse the month label to get start and end dates
    let startDate: Date
    let endDate: Date

    if (selectedRange === 'custom') {
      // For custom range, use the full custom period
      if (customStartDate && customEndDate) {
        startDate = customStartDate
        endDate = customEndDate
      } else {
        return
      }
    } else {
      // Parse the month label (e.g., "Jan 2025")
      try {
        const parsedDate = parse(monthLabel, 'MMM yyyy', new Date())
        startDate = startOfMonth(parsedDate)
        endDate = endOfMonth(parsedDate)
      } catch (error) {
        console.error('Failed to parse month label:', error)
        return
      }
    }

    setSelectedPeriod({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label: monthLabel
    })
    setReportModalOpen(true)
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

        {/* Show selected custom range if active */}
        {selectedRange === 'custom' && customStartDate && customEndDate && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCustomDialog}
              className="h-8"
            >
              <Settings className="h-4 w-4 mr-1" />
              Change
            </Button>
          </div>
        )}
      </div>

      {/* Custom Range Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
            <DialogDescription>
              Choose a start and end date to view aggregated financial data for that period.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <CalendarComponent
                mode="single"
                selected={tempStartDate}
                onSelect={setTempStartDate}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={new Date().getFullYear() + 1}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <CalendarComponent
                mode="single"
                selected={tempEndDate}
                onSelect={setTempEndDate}
                disabled={(date) => tempStartDate ? date < tempStartDate : false}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={new Date().getFullYear() + 1}
                className="rounded-md border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCustomRange}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCustomRange}
              disabled={!tempStartDate || !tempEndDate}
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
          />
          <Legend />
          <Bar
            dataKey="Income"
            fill="#22c55e"
            onClick={handleBarClick}
          />
          <Bar
            dataKey="Expenses"
            fill="#ef4444"
            onClick={handleBarClick}
          />
          <Bar
            dataKey="Savings"
            fill="#3b82f6"
            onClick={handleBarClick}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Report Details Modal */}
      {selectedPeriod && (
        <ReportDetailsModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          startDate={selectedPeriod.startDate}
          endDate={selectedPeriod.endDate}
          monthLabel={selectedPeriod.label}
          onEditTransaction={onEditTransaction}
        />
      )}
    </div>
  )
}