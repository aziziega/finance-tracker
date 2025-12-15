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

interface CategoryAccountProps {
    onAccountAdded?: () => void
}

export function CategoryAccount(props: CategoryAccountProps) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [hiddenAccounts, setHiddenAccounts] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newAccount, setNewAccount] = useState({
        name: '',
        balance: '', // Raw value (for API)
    })
    const [displayBalance, setDisplayBalance] = useState('') // Formatted value (for display)


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
            // BONUS: Parallel fetch untuk performance
            Promise.all([
                fetchAccounts(),
                fetchHiddenAccounts()
            ])
        }
    }, [isOpen])

    // Format balance dengan thousand separator
    const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value

        // Remove semua non-digit characters
        const rawValue = input.replace(/[^\d]/g, '')

        if (rawValue === '') {
            setNewAccount({ ...newAccount, balance: '' })
            setDisplayBalance('')
            return
        }

        // Simpan raw value (untuk submit ke API)
        setNewAccount({ ...newAccount, balance: rawValue })

        // Format dengan thousand separator untuk display
        const formatted = Number(rawValue).toLocaleString('id-ID')
        setDisplayBalance(formatted)
    }

    const handleAddAccount = async () => {
        if (!newAccount.name.trim()) {
            toast.error('Account name is required')
            return
        }
        if (accounts.find(a => a.name.toLowerCase() === newAccount.name.trim().toLowerCase())) {
            toast.error('Account with this name already exists')
            return
        }

        setLoading(true)
        try {
            // STEP 4: Convert balance string → number saat submit
            const payload = {
                name: newAccount.name,
                balance: Number(newAccount.balance || 0)
            }

            const response = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                toast.success('Wallet created successfully')
                setNewAccount({ name: '', balance: '' })
                setDisplayBalance('')
                setShowAddForm(false)
                fetchAccounts()
                // STEP 2: Notify parent untuk refresh dropdown
                props.onAccountAdded?.()
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
                // STEP 2: Notify parent untuk refresh dropdown
                props.onAccountAdded?.()
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
                toast.success('Wallet restored successfully')
                fetchAccounts()
                fetchHiddenAccounts()
                // STEP 2: Notify parent untuk refresh dropdown
                props.onAccountAdded?.()
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
                    Manage Wallet
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Wallet Management</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Add Wallet Form */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">My Wallets</h3>
                        <Button
                            onClick={() => setShowAddForm(!showAddForm)}
                            size="sm"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Wallet
                        </Button>
                    </div>

                    {showAddForm && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium">Create New Wallet</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="wallet-name">Wallet Name</Label>
                                    <Input
                                        id="wallet-name"
                                        value={newAccount.name}
                                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                        placeholder="e.g., BCA, DANA, Mandiri"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="wallet-balance">Initial Balance</Label>
                                    <Input
                                        id="wallet-balance"
                                        type="text"
                                        value={displayBalance}
                                        onChange={handleBalanceChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button onClick={handleAddAccount} disabled={loading} className="w-full md:w-auto cursor-pointer">
                                        {loading ? 'Creating...' : 'Create Wallet'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Wallets List - FLAT (no grouping) */}
                    <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">All Wallets ({accounts.length})</h4>
                        <div className="grid gap-2">
                            {/* STEP 5: Empty state */}
                            {accounts.length === 0 ? (
                                <div className="text-sm text-muted-foreground p-4 text-center border-2 border-dashed rounded">
                                    No wallets yet. Add your first wallet above!
                                </div>
                            ) : (
                                accounts.map(account => (
                                    <div key={account.id} className="flex items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <span className="font-medium">{account.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                Rp {account.balance.toLocaleString('id-ID')}
                                            </Badge>
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
                                            aria-label={account.is_system ? "Hide wallet" : "Delete wallet"}
                                            title={account.is_system ? "Hide this wallet" : "Delete wallet"}
                                        >
                                            {account.is_system ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {/* Hidden Wallets Section */}
                    {hiddenAccounts.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <h3 className="text-lg font-semibold mb-3">Hidden Wallets ({hiddenAccounts.length})</h3>
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
                                                aria-label="Restore wallet"
                                                title="Restore wallet"
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
