"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FileDown, Loader2, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ExportRangeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExportRangeModal({
    open,
    onOpenChange
}: ExportRangeModalProps) {
    const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select both start and end dates')
            return
        }

        if (startDate > endDate) {
            toast.error('Start date must be before end date')
            return
        }

        try {
            setLoading(true)

            const response = await fetch(
                `/api/reports/export?format=${exportFormat}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.details || errorData.error || 'Failed to export data')
            }

            // Get filename from response header or use default
            const contentDisposition = response.headers.get('content-disposition')
            const dateRange = `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
                : `transactions-${dateRange}.${exportFormat}`

            // Download file
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success(`Exported as ${exportFormat.toUpperCase()}`)
            onOpenChange(false)
        } catch (error: any) {
            console.error('Export error:', error)
            toast.error(error.message || 'Failed to export data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Transactions</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select date range to export transactions
                        </p>
                    </div>

                    {/* Date Range Selection */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>From Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                        captionLayout="dropdown"
                                        fromYear={new Date().getFullYear() - 5}
                                        toYear={new Date().getFullYear()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>To Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
                                        initialFocus
                                        captionLayout="dropdown"
                                        fromYear={new Date().getFullYear() - 5}
                                        toYear={new Date().getFullYear()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div className="space-y-3">
                        <Label>Export Format</Label>
                        <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as 'csv' | 'pdf')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="csv" id="range-csv" />
                                <Label htmlFor="range-csv" className="cursor-pointer font-normal">
                                    CSV - Spreadsheet format
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pdf" id="range-pdf" />
                                <Label htmlFor="range-pdf" className="cursor-pointer font-normal">
                                    PDF - Printable document
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={loading || !startDate || !endDate}
                            className="cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
