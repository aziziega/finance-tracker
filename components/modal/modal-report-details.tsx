"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Loader2 } from "lucide-react"
import { getCategoryIcon } from "@/lib/category-icons"

interface ReportData {
    transactions: any[]
    summary: {
        totalExpenses: number
        totalIncome: number
        balance: number
        dailyAverageExpense: number
        dailyAverageIncome: number
        expensesByCategory: {
            category: string
            amount: number
            count: number
            percentage: number
            color: string
            icon: string
        }[]
        incomesByCategory: {
            category: string
            amount: number
            count: number
            percentage: number
            color: string
            icon: string
        }[]
    }
}

interface ReportDetailsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    startDate: string
    endDate: string
    monthLabel: string
}

export function ReportDetailsModal({
    open,
    onOpenChange,
    startDate,
    endDate,
    monthLabel
}: ReportDetailsModalProps) {
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("chart")

    useEffect(() => {
        if (open && startDate && endDate) {
            fetchReportData()
        }
    }, [open, startDate, endDate])

    const fetchReportData = async () => {
        try {
            setLoading(true)
            const response = await fetch(
                `/api/reports/monthly?startDate=${startDate}&endDate=${endDate}`
            )

            if (!response.ok) {
                throw new Error('Failed to fetch report data')
            }

            const data = await response.json()
            setReportData(data)
        } catch (error) {
            console.error('Error fetching report data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Prepare pie chart data - combine top categories and group small ones
    const preparePieData = () => {
        if (!reportData) return []

        const allCategories = [
            ...reportData.summary.expensesByCategory,
            ...reportData.summary.incomesByCategory.map(cat => ({
                ...cat,
                category: cat.category === 'Transferan' ? 'Transferan' : cat.category
            }))
        ]

        // Calculate total for correct percentage
        const total = allCategories.reduce((sum, cat) => sum + cat.amount, 0)

        // Sort by amount and recalculate percentage based on total
        const sortedCategories = allCategories
            .sort((a, b) => b.amount - a.amount)
            .map(cat => ({
                name: cat.category,
                value: cat.amount,
                color: cat.color,
                percentage: total > 0 ? (cat.amount / total) * 100 : 0
            }))

        return sortedCategories
    }

    const pieData = preparePieData()

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{payload[0].name}</p>
                    <p className="text-sm text-muted-foreground">
                        Rp {payload[0].value.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {payload[0].payload.percentage?.toFixed(1)}%
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Report Details</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : reportData ? (
                    <div className="flex flex-col min-h-0 flex-1">
                        {/* Tabs - Sticky */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1">
                            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                                <TabsTrigger value="chart">Chart</TabsTrigger>
                                <TabsTrigger value="category">Category</TabsTrigger>
                            </TabsList>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto flex-1 mt-4">
                                {/* Chart Tab */}
                                <TabsContent value="chart" className="space-y-4 mt-0">
                                    <div className="text-center py-2">
                                        <p className="text-sm text-muted-foreground">{monthLabel}</p>
                                    </div>

                                    {/* Pie Chart */}
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No data available
                                        </div>
                                    )}

                                    {/* Category List */}
                                    <div className="space-y-2">
                                        {pieData.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold">
                                                        {item.value.toLocaleString('id-ID')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.percentage?.toFixed(0)}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* Category Tab */}
                                <TabsContent value="category" className="space-y-4 mt-0">
                                    <div className="text-center py-2">
                                        <p className="text-sm text-muted-foreground">{monthLabel}</p>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium">Expenses</span>
                                            <span className="text-sm font-bold">
                                                {reportData.summary.totalExpenses.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span className="text-xs">daily average</span>
                                            <span className="text-xs">
                                                {reportData.summary.dailyAverageExpense.toLocaleString('id-ID', {
                                                    maximumFractionDigits: 0
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium">Income</span>
                                            <span className="text-sm font-bold text-green-600">
                                                + {reportData.summary.totalIncome.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span className="text-xs">daily average</span>
                                            <span className="text-xs text-green-600">
                                                + {reportData.summary.dailyAverageIncome.toLocaleString('id-ID', {
                                                    maximumFractionDigits: 0
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t">
                                            <span className="text-sm font-bold">Balance</span>
                                            <span className={`text-sm font-bold ${reportData.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {reportData.summary.balance >= 0 ? '+ ' : ''}
                                                {reportData.summary.balance.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expenses by Category */}
                                    {reportData.summary.expensesByCategory.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-center text-muted-foreground">
                                                Expenses by Category
                                            </h3>
                                            <div className="space-y-2">
                                                {reportData.summary.expensesByCategory.map((category, index) => {
                                                    const Icon = getCategoryIcon(category.icon)
                                                    return (
                                                        <div key={index} className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className="w-8 h-8 rounded flex items-center justify-center"
                                                                        style={{ backgroundColor: category.color }}
                                                                    >
                                                                        <Icon className="w-4 h-4 text-white" />
                                                                    </div>
                                                                    <span className="text-sm font-medium">
                                                                        {category.category}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-semibold">
                                                                    {category.amount.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="absolute left-0 top-0 h-full rounded-full"
                                                                    style={{
                                                                        width: `${category.percentage}%`,
                                                                        backgroundColor: category.color
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Incomes by Category */}
                                    {reportData.summary.incomesByCategory.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-center text-muted-foreground">
                                                Incomes by Category
                                            </h3>
                                            <div className="space-y-2">
                                                {reportData.summary.incomesByCategory.map((category, index) => {
                                                    const Icon = getCategoryIcon(category.icon)
                                                    return (
                                                        <div key={index} className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className="w-8 h-8 rounded flex items-center justify-center"
                                                                        style={{ backgroundColor: category.color }}
                                                                    >
                                                                        <Icon className="w-4 h-4 text-white" />
                                                                    </div>
                                                                    <span className="text-sm font-medium">
                                                                        {category.category}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-semibold">
                                                                    {category.amount.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="absolute left-0 top-0 h-full rounded-full"
                                                                    style={{
                                                                        width: `${category.percentage}%`,
                                                                        backgroundColor: category.color
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        No data available
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
