"use client";

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Settings, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
    id: string
    name: string
    balance: number
    is_default: boolean
    user_id: string
}

interface CategoryAccountProps {
    onAccountAdded?: () => void
}

export function CategoryAccount(props: CategoryAccountProps) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newAccount, setNewAccount] = useState({
        name: '',
        balance: '', // Raw value (for API)
    })
    const [displayBalance, setDisplayBalance] = useState('') // Formatted value (for display)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editData, setEditData] = useState({ name: '', balance: '' })
    const [editDisplayBalance, setEditDisplayBalance] = useState('')


    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/accounts')
            const data = await response.json()
            const normalized = (data.accounts || []).map((a: any) => ({
                ...a,
                is_default: a.is_default === true || a.is_default === 'true' || a.is_default === 1,
                balance: Number(a.balance || 0),
            }))
            setAccounts(normalized)
        } catch {
            toast.error('Failed to fetch accounts')
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchAccounts()
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

    const handleEditBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value
        const rawValue = input.replace(/[^\d]/g, '')

        if (rawValue === '') {
            setEditData({ ...editData, balance: '' })
            setEditDisplayBalance('')
            return
        }

        setEditData({ ...editData, balance: rawValue })
        const formatted = Number(rawValue).toLocaleString('id-ID')
        setEditDisplayBalance(formatted)
    }

    const startEdit = (account: Account) => {
        setEditingId(account.id)
        setEditData({
            name: account.name,
            balance: account.balance.toString()
        })
        setEditDisplayBalance(account.balance.toLocaleString('id-ID'))
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditData({ name: '', balance: '' })
        setEditDisplayBalance('')
    }

    const handleUpdateAccount = async (accountId: string) => {
        if (!editData.name.trim()) {
            toast.error('Account name is required')
            return
        }

        setLoading(true)
        try {
            const payload = {
                name: editData.name,
                balance: Number(editData.balance || 0)
            }

            const response = await fetch(`/api/accounts/${accountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                toast.success('Wallet updated successfully')
                cancelEdit()
                fetchAccounts()
                props.onAccountAdded?.()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to update wallet')
            }
        } catch (error) {
            console.error('Failed to update account:', error)
            toast.error('Failed to update wallet')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAccount = async (accountId: string) => {
        const account = accounts.find(a => a.id === accountId)

        const confirmMessage = account?.is_default
            ? 'Delete this default wallet? This cannot be undone.'
            : 'Are you sure you want to delete this wallet?'

        if (!confirm(confirmMessage)) return

        try {
            const response = await fetch(`/api/accounts/${accountId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success('Wallet deleted successfully')
                fetchAccounts()
                props.onAccountAdded?.()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to delete wallet')
            }
        } catch (error) {
            toast.error('Failed to delete wallet')
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
                                        {editingId === account.id ? (
                                            // Edit Mode
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor={`edit-name-${account.id}`} className="text-xs">Wallet Name</Label>
                                                    <Input
                                                        id={`edit-name-${account.id}`}
                                                        value={editData.name}
                                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                        placeholder="Wallet name"
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`edit-balance-${account.id}`} className="text-xs">Balance</Label>
                                                    <Input
                                                        id={`edit-balance-${account.id}`}
                                                        type="text"
                                                        value={editDisplayBalance}
                                                        onChange={handleEditBalanceChange}
                                                        placeholder="0"
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={cancelEdit}
                                                        disabled={loading}
                                                        className="cursor-pointer"
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateAccount(account.id)}
                                                        disabled={loading}
                                                        className="cursor-pointer"
                                                    >
                                                        <Check className="h-4 w-4 mr-1" />
                                                        {loading ? 'Saving...' : 'Save'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <>
                                                <div className="flex items-center space-x-3">
                                                    <span className="font-medium">{account.name}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        Rp {account.balance.toLocaleString('id-ID')}
                                                    </Badge>
                                                    {account.is_default && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => startEdit(account)}
                                                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                                                        aria-label="Edit wallet"
                                                        title="Edit wallet"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteAccount(account.id)}
                                                        className="text-red-600 hover:text-red-700 cursor-pointer"
                                                        aria-label="Delete wallet"
                                                        title="Delete wallet"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
