"use client";
import React, { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormTransaction } from "@/components/transaction/form-transaction";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/overview/overview";
import { RecentTransactions } from "@/components/transaction/recent-transactions";
import { AccountSummary } from "@/components/account/account-summary";
import { LoansOverview } from "@/components/overview/loans-overview";
import { SavingsOverview } from "@/components/overview/savings-overview";
import { FinancialGoals } from "@/components/goal/financial-goals";


export default function DashboardPreview() {
    const [showTransaction, setShowTransaction] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<any>(null)
    const { stats, loading, error, refetch } = useDashboardStats()
    const formRef = useRef<HTMLDivElement>(null)
    const dashboardTitleRef = useRef<HTMLHeadingElement>(null)

    const handleTransactionComplete = () => {
        setShowTransaction(false)
        setEditingTransaction(null)
        refetch() // Refresh dashboard stats
    }

    const handleEditTransaction = (transaction: any) => {
        setEditingTransaction(transaction)
        setShowTransaction(true)
        // Scroll to dashboard title after state updates
        setTimeout(() => {
            dashboardTitleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
    }

    const handleTransactionDeleted = () => {
        refetch() // Refresh dashboard stats after deletion
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <main className="flex flex-1 flex-col gap-4 md:gap-8 sm:gap-6 md:p-8 sm:p-6 p-4 mt-20">
                    <div className="flex items-center justify-between">
                        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
                        <div className="h-10 bg-muted rounded w-40 animate-pulse" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="pb-2">
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                </CardHeader>
                                <CardContent>
                                    <div className="h-8 bg-muted rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </main>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <main className="flex flex-1 flex-col gap-4 md:gap-8 sm:gap-6 md:p-8 sm:p-6 p-4 mt-20">
                    <Card className="border-red-500">
                        <CardHeader>
                            <CardTitle className="text-red-500">Error Loading Dashboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{error}</p>
                            <Button onClick={refetch} className="mt-4">Retry</Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col ">
            <main className="flex flex-1 flex-col gap-4 md:gap-8 sm:gap-6 md:p-8 sm:p-6 p-4 mt-20">
                <div className="flex items-center justify-between">
                    <h1 ref={dashboardTitleRef} className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
                    <Button className="cursor-pointer" onClick={() => {
                        setEditingTransaction(null)
                        setShowTransaction(!showTransaction)
                    }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                    {/* <Button
                        onClick={() => {
                            client.auth.signOut();
                        }}
                    >
                        SignOut
                    </Button> */}
                </div>
                {showTransaction && (
                    <Card ref={formRef} className="mb-4">
                        <CardHeader>
                            <CardTitle>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</CardTitle>
                            <CardDescription>
                                {editingTransaction ? 'Update transaction details' : 'Record a new expense or income'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormTransaction
                                onComplete={handleTransactionComplete}
                                editTransaction={editingTransaction}
                            />
                        </CardContent>
                    </Card>)}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                Rp {stats?.totalBalance.toLocaleString('id-ID')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                All wallet combined
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                Rp {stats?.monthlyIncome.toLocaleString('id-ID')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {stats && stats.incomeChange >= 0 ? '+' : ''}
                                {stats?.incomeChange.toFixed(1)}% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                Rp {stats?.monthlyExpense.toLocaleString('id-ID')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {stats && stats.expenseChange >= 0 ? '+' : ''}
                                {stats?.expenseChange.toFixed(1)}% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats?.savingsRate.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Of your income
                            </p>
                        </CardContent>
                    </Card>

                </div>
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="accounts">Accounts</TabsTrigger>
                        <TabsTrigger value="loans">Loans</TabsTrigger>
                        <TabsTrigger value="savings">Savings</TabsTrigger>
                        <TabsTrigger value="goals">Goals</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <Card className="lg:col-span-4">
                                <CardHeader>
                                    <CardTitle>Financial Overview</CardTitle>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <Overview onEditTransaction={handleEditTransaction} />
                                </CardContent>
                            </Card>
                            <Card className="lg:col-span-3">
                                <CardHeader>
                                    <CardTitle>Recent Transactions</CardTitle>
                                    <CardDescription>You made {stats?.transactionCount || 0} transaction{stats?.transactionCount !== 1 ? 's' : ''} this month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RecentTransactions
                                        onEditTransaction={handleEditTransaction}
                                        onTransactionDeleted={handleTransactionDeleted}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="accounts" className="space-y-4">
                        <AccountSummary onBalanceChanged={refetch} />
                    </TabsContent>
                    <TabsContent value="loans" className="space-y-4">
                        <LoansOverview />
                    </TabsContent>
                    <TabsContent value="savings" className="space-y-4">
                        <SavingsOverview />
                    </TabsContent>
                    <TabsContent value="goals" className="space-y-4">
                        <FinancialGoals />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );

}