"use client"

import { useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useDailyTransactions } from "@/hooks/useGroupedTransactions"
import { getCategoryIcon } from "@/lib/category-icons"
import { Trash2, Loader2, ChevronLeft, ChevronRight, ArrowRight, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface RecentTransactionsProps {
    onEditTransaction?: (transaction: any) => void
    onTransactionDeleted?: () => void
}

export function RecentTransactions({ onEditTransaction, onTransactionDeleted }: RecentTransactionsProps) {
    const { dailyData, currentDate, loading, error, goToPreviousDay, goToNextDay, refetch, setDate } = useDailyTransactions()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    const handleDelete = async () => {
        if (!deleteId) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/transactions/${deleteId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success('Transaction deleted successfully')
                refetch()
                onTransactionDeleted?.()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to delete transaction')
            }
        } catch (error) {
            console.error('Delete transaction error:', error)
            toast.error('Failed to delete transaction')
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    // Loading state
    if (loading && !dailyData) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>Failed to load transactions</p>
                <p className="text-sm">{error}</p>
            </div>
        )
    }

    const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

    return (
        <>
            <div className="space-y-4">
                {/* Date Navigation Header */}
                <div className="flex items-center justify-between bg-primary text-primary-foreground rounded-lg p-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousDay}
                        className="text-primary-foreground hover:bg-primary-foreground/20"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex flex-col items-center gap-0 h-auto py-1 px-4 text-primary-foreground hover:bg-primary-foreground/20 cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    <h3 className="font-semibold text-lg">
                                        {dailyData?.displayDate}
                                    </h3>
                                </div>
                                <p className="text-xs opacity-80">
                                    {format(currentDate, 'EEEE, d MMM yyyy')}
                                </p>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={(date) => {
                                    if (date) {
                                        setDate(date)
                                        setIsCalendarOpen(false)
                                    }
                                }}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                captionLayout="dropdown"
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextDay}
                        disabled={isToday}
                        className="text-primary-foreground hover:bg-primary-foreground/20 disabled:opacity-30"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Daily Summary Card */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Income</p>
                        <p className="text-lg font-bold text-green-600">
                            {dailyData?.dailyIncome.toLocaleString('id-ID') || '0'}
                        </p>
                    </div>
                    <div className="text-center border-x">
                        <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                        <p className="text-lg font-bold text-red-600">
                            {dailyData?.dailyExpense.toLocaleString('id-ID') || '0'}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Balance</p>
                        <p className={`text-lg font-bold ${(dailyData?.dailyBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(dailyData?.dailyBalance || 0) >= 0 ? '+' : ''}
                            {dailyData?.dailyBalance.toLocaleString('id-ID') || '0'}
                        </p>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full">
                    {!dailyData?.transactions || dailyData.transactions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No transactions for this day</p>
                            <p className="text-sm">Try another date or add a transaction</p>
                        </div>
                    ) : (
                        dailyData.transactions.map((transaction) => {
                            const Icon = getCategoryIcon(transaction.categories?.icon)
                            const isIncome = transaction.type === 'INCOME'
                            const isExpense = transaction.type === 'EXPENSE'
                            const isTransfer = transaction.type === 'TRANSFER'

                            return (
                                <div
                                    key={transaction.id}
                                    className="flex items-center group cursor-pointer hover:bg-muted/50 rounded-lg p-3 transition-colors"
                                    onClick={() => onEditTransaction?.(transaction)}
                                >
                                    <Avatar
                                        className="h-10 w-10 border flex items-center justify-center"
                                        style={{
                                            backgroundColor: transaction.categories?.color || '#6B7280',
                                            borderColor: transaction.categories?.color || '#6B7280'
                                        }}
                                    >
                                        <Icon className="h-5 w-5 text-white" />
                                    </Avatar>

                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-medium">
                                            {transaction.is_initial_balance && (
                                                <Badge variant="secondary" className="mr-2 text-xs">
                                                    Initial Setup
                                                </Badge>
                                            )}
                                            {transaction.description || transaction.categories?.name || 'Transaction'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {transaction.accounts.name}
                                            {transaction.is_initial_balance && (
                                                <span className="ml-1">• Wallet Created</span>
                                            )}
                                            {isTransfer && transaction.toAccountId && ' → Transfer'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`text-base font-semibold ${isIncome ? "text-green-500" :
                                            isExpense ? "text-red-500" :
                                                "text-blue-500"
                                            }`}>
                                            {isExpense && "-"}
                                            {isIncome && "+"}
                                            {Math.abs(transaction.amount).toLocaleString('id-ID')}
                                        </span>

                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeleteId(transaction.id)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this transaction? This action will revert the balance changes and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

        </>
    )
}