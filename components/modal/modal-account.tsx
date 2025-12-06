"use client";

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Settings, EyeOff, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
    id: string
    name: string
    type: string
    balance: number
    is_system: boolean
    user_id?: string
}

export function CategoryAccount() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [hiddenAccounts, setHiddenAccounts] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newAccount, setNewAccount] = useState({
        name: '',
        type: 'cash',
        balance: 0,
    })


    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/accounts')
            const data = await response.json()
            const normalized = (data.accounts || []).map((a: any) => ({
                ...a,
                type: String(a.type || '').toLowerCase(),
                is_system: a.is_system === true || a.is_system === 'true' || a.is_system === 1,
                balance: Number(a.balance || 0),
            }))
            setAccounts(normalized)
        } catch {
            toast.error('Failed to fetch accounts')
        }
    }

    const fetchHiddenAccounts = async () => {
        try {
            const response = await fetch('/api/accounts/hidden')
            if (response.ok) {
                const data = await response.json()
                setHiddenAccounts(data.accounts || [])
            }
        } catch (error) {
            console.log('Failed to fetch hidden accounts:', error)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchAccounts()
            fetchHiddenAccounts()
        }
    }, [isOpen])

    const handleAddAccount = async () => {
        if (!newAccount.name.trim()) {
            toast.error('Account name is required')
            return
        }
        if (accounts.find(a => a.name.toLowerCase() === newAccount.name.trim().toLowerCase() && a.type === newAccount.type)) {
            toast.error('Account with this name and type already exists')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            })

            if (response.ok) {
                toast.success('Account created successfully')
                setNewAccount({ name: '', type: 'cash', balance: 0 })
                setShowAddForm(false)
                fetchAccounts()
            } else {
                const error = await response.json()
                const errorMessage = error.error || 'Failed to create account'
                console.error('Error creating account:', { status: response.status, error })

                if (response.status === 401) {
                    toast.error('Please login to create accounts')
                } else {
                    toast.error(errorMessage)
                }
            }
        } catch (error) {
            console.error('Failed to create account:', error)
            toast.error('Failed to create account. Please check console for details.')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAccount = async (accountId: string) => {
        const account = accounts.find(a => a.id === accountId)
        const isSystem = account?.is_system

        const confirmMessage = isSystem
            ? 'Hide this system account from your view?'
            : 'Are you sure you want to delete this account?'

        if (!confirm(confirmMessage)) return

        try {
            const response = await fetch(`/api/accounts/${accountId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                const result = await response.json()
                const successMessage = result.hidden
                    ? 'Account hidden successfully'
                    : 'Account deleted successfully'

                toast.success(successMessage)
                fetchAccounts()
                fetchHiddenAccounts()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to process account')
            }
        } catch (error) {
            toast.error('Failed to process account')
        }
    }

    const handleRestoreAccount = async (accountId: string) => {
        try {
            const response = await fetch(`/api/accounts/${accountId}/unhide`, {
                method: 'POST'
            })

            if (response.ok) {
                toast.success('Account restored successfully')
                fetchAccounts()
                fetchHiddenAccounts()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to restore account')
            }
        } catch (error) {
            toast.error('Failed to restore account')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Account Wallet
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Account Management</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Add Account Form */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Accounts</h3>
                        <Button
                            onClick={() => setShowAddForm(!showAddForm)}
                            size="sm"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Account
                        </Button>
                    </div>

                    {showAddForm && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium">Create New Account</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="account-name" className="mb-2">Name</Label>
                                    <Input
                                        id="account-name"
                                        value={newAccount.name}
                                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                        placeholder="Account name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="account-type" className="mb-2">Type</Label>
                                    <Select value={newAccount.type} onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="bank">Bank</SelectItem>
                                            <SelectItem value="credit">Credit</SelectItem>
                                            <SelectItem value="investment">Investment</SelectItem>
                                            <SelectItem value="loan">Loan</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="account-balance" className="mb-2">Initial Balance</Label>
                                    <Input
                                        id="account-balance"
                                        type="number"
                                        value={newAccount.balance}
                                        onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button onClick={handleAddAccount} disabled={loading} className="w-full cursor-pointer">
                                        {loading ? 'Creating...' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Accounts List */}
                    <div className="space-y-4">
                        {['cash', 'bank', 'credit', 'investment', 'loan', 'other'].map(type => {
                            const typeAccounts = accounts.filter(acc => acc.type === type)

                            return (
                                <div key={type} className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-3">{type.toUpperCase()} Accounts ({typeAccounts.length})</h4>
                                    <div className="grid gap-2">
                                        {typeAccounts.map(account => (
                                            <div key={account.id} className="flex items-center justify-between p-2 border rounded hover:bg-pink-950">
                                                <div className="flex items-center space-x-3">
                                                    <span className="font-medium">{account.name}</span>
                                                    <Badge variant="outline" className="text-xs">{account.balance.toLocaleString()}</Badge>
                                                    {account.is_system && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            System
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteAccount(account.id)}
                                                    className="text-red-600 hover:text-red-700 cursor-pointer"
                                                    aria-label={account.is_system ? "Hide account" : "Delete account"}
                                                    title={account.is_system ? "Hide this account" : "Delete account"}
                                                >
                                                    {account.is_system ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {/* Hidden Accounts Section */}
                    {hiddenAccounts.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <h3 className="text-lg font-semibold mb-3">Hidden Accounts ({hiddenAccounts.length})</h3>
                            <div className="grid gap-2">
                                {hiddenAccounts.map(item => {
                                    const account = item.account
                                    if (!account) return null

                                    return (
                                        <div key={account.id} className="flex items-center justify-between p-2 border rounded bg-background/50">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-medium opacity-60">{account.name}</span>
                                                <Badge variant="outline" className="text-xs">{account.type}</Badge>
                                                {account.is_system && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        System
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRestoreAccount(account.id)}
                                                className="text-green-600 hover:text-green-700 cursor-pointer"
                                                aria-label="Restore account"
                                                title="Restore account"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
