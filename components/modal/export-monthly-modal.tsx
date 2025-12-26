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
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExportMonthlyModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    startDate: string
    endDate: string
    monthLabel: string
}

export function ExportMonthlyModal({
    open,
    onOpenChange,
    startDate,
    endDate,
    monthLabel
}: ExportMonthlyModalProps) {
    const [format, setFormat] = useState<'csv' | 'pdf'>('csv')
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        try {
            setLoading(true)

            const response = await fetch(
                `/api/reports/export?format=${format}&startDate=${startDate}&endDate=${endDate}`
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.details || errorData.error || 'Failed to export data')
            }

            // Get filename from response header or use default
            const contentDisposition = response.headers.get('content-disposition')
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
                : `transactions-${monthLabel}.${format}`

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

            toast.success(`Exported as ${format.toUpperCase()}`)
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
                    <DialogTitle>Export Monthly Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Export transactions for <strong>{monthLabel}</strong>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label>Export Format</Label>
                        <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'csv' | 'pdf')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="csv" id="csv" />
                                <Label htmlFor="csv" className="cursor-pointer font-normal">
                                    CSV - Spreadsheet format (Excel, Google Sheets)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pdf" id="pdf" />
                                <Label htmlFor="pdf" className="cursor-pointer font-normal">
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
                            disabled={loading}
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
                                    Export {format.toUpperCase()}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
