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
import { useRecentTransactions } from "@/hooks/useRecentTransactions"
import { formatTransactionDate } from "@/lib/date-utils"
import { getCategoryIcon } from "@/lib/category-icons"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

interface RecentTransactionsProps {
    onEditTransaction?: (transaction: any) => void
    onTransactionDeleted?: () => void
}

export function RecentTransactions({ onEditTransaction, onTransactionDeleted }: RecentTransactionsProps) {
    const { transactions, loading, error, refetch } = useRecentTransactions(10)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

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
    if (loading) {
        return (
            <div className="space-y-8">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center animate-pulse">
                        <div className="h-9 w-9 bg-muted rounded-full" />
                        <div className="ml-4 space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-1/3" />
                            <div className="h-3 bg-muted rounded w-1/4" />
                        </div>
                        <div className="h-4 bg-muted rounded w-20" />
                    </div>
                ))}
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

    // Empty state
    if (transactions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm">Add your first transaction to get started!</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {transactions.map((transaction) => {
                const Icon = getCategoryIcon(transaction.categories?.icon)
                const isIncome = transaction.type === 'INCOME'
                const isExpense = transaction.type === 'EXPENSE'
                const isTransfer = transaction.type === 'TRANSFER'

                return (
                    <div
                        key={transaction.id}
                        className="flex items-center group cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={() => onEditTransaction?.(transaction)}
                    >
                        <Avatar
                            className="h-9 w-9 border flex items-center justify-center"
                            style={{
                                backgroundColor: transaction.categories?.color || '#6B7280',
                                borderColor: transaction.categories?.color || '#6B7280'
                            }}
                        >
                            <Icon className="h-4 w-4 text-white" />
                        </Avatar>

                        <div className="ml-4 space-y-1 flex-1">
                            <p className="text-sm font-medium leading-none">
                                {transaction.description || transaction.categories?.name || 'Transaction'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {formatTransactionDate(transaction.date)}
                            </p>
                        </div>
                        <div className="ml-auto font-medium">
                            <span className={
                                isIncome ? "text-green-500" :
                                    isExpense ? "text-red-500" :
                                        "text-blue-500"
                            }>
                                {isIncome && "+"}
                                {isExpense && "-"}
                                Rp {Math.abs(transaction.amount).toLocaleString('id-ID')}
                            </span>
                        </div>

                        {transaction.categories && (
                            <Badge variant="outline" className="ml-2">
                                {transaction.categories.name}
                            </Badge>
                        )}

                        {/* Delete button */}
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteId(transaction.id)
                                }}
                            >
                                <Trash2 className="h-4 w-4 cursor-pointer" />
                            </Button>
                        </div>
                    </div>
                )
            })}

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
    )
}
