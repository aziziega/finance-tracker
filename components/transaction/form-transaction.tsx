"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CategoryModal } from "@/components/modal/modal-category"
import { CategoryAccount } from "@/components/modal/modal-account"

interface AddTransactionFormProps {
  onComplete: () => void
}


export function FormTransaction({ onComplete }: AddTransactionFormProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [transactionType, setTransactionType] = useState<string>("expense")
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [refreshKey, setRefreshKey] = useState(0)

  // STEP 3: Account/Wallet state management
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [selectedToAccount, setSelectedToAccount] = useState<string>("")
  const [refreshAccountKey, setRefreshAccountKey] = useState(0)

  // Amount formatting state
  const [amount, setAmount] = useState<string>("")
  const [displayAmount, setDisplayAmount] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }, [])

  // STEP 3: Fetch accounts (sama pattern dengan categories)
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setAccounts([])
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [refreshKey, fetchCategories])

  // STEP 3: Effect untuk fetch accounts
  useEffect(() => {
    fetchAccounts()
  }, [refreshAccountKey, fetchAccounts])

  const handleCategoryAdded = () => {
    // Trigger re-fetch ketika kategori baru ditambah
    setRefreshKey(prev => prev + 1)
  }

  // STEP 3: Handler untuk account updates (pattern sama dengan category)
  const handleAccountAdded = () => {
    setRefreshAccountKey(prev => prev + 1)
  }

  const handleTransactionTypeChange = (newType: string) => {
    setTransactionType(newType)

    if (newType === 'transfer') {
      // Auto-select Transfer category
      const transferCategory = categories.find(cat => cat.type?.toLowerCase() === 'transfer')
      if (transferCategory) {
        setSelectedCategory(transferCategory.id)
      }
    } else {
      setSelectedCategory("")
    }
  }

  // Format amount dengan thousand separator
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value

    // Remove semua non-digit characters (kecuali .)
    const rawValue = input.replace(/[^\d]/g, '')

    if (rawValue === '') {
      setAmount('')
      setDisplayAmount('')
      return
    }

    // Simpan raw value (untuk submit ke API nanti)
    setAmount(rawValue)

    // Format dengan thousand separator untuk display
    const formatted = Number(rawValue).toLocaleString('id-ID')
    setDisplayAmount(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!selectedAccount) {
      toast.error('Please select a wallet')
      return
    }

    if (transactionType !== 'transfer' && !selectedCategory) {
      toast.error('Please select a category')
      return
    }

    if (transactionType === 'transfer' && !selectedToAccount) {
      toast.error('Please select destination wallet')
      return
    }

    if (transactionType === 'transfer' && selectedAccount === selectedToAccount) {
      toast.error('Source and destination wallets must be different')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: any = {
        type: transactionType.toUpperCase(),
        amount: Number(amount),
        accountId: selectedAccount,
        date: date.toISOString(),
        description: description.trim() || null
      }

      if (transactionType !== 'transfer') {
        payload.categoryId = selectedCategory
      }

      if (transactionType === 'transfer') {
        payload.toAccountId = selectedToAccount
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success('Transaction created successfully')

        // Reset form
        setAmount('')
        setDisplayAmount('')
        setDescription('')
        setSelectedCategory('')
        setSelectedAccount('')
        setSelectedToAccount('')
        setDate(new Date())

        // Refresh accounts to show updated balances
        fetchAccounts()

        onComplete()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create transaction')
      }
    } catch (error) {
      console.error('Create transaction error:', error)
      toast.error('Failed to create transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transaction-type">Transaction Type</Label>
          <RadioGroup id="transaction-type" defaultValue="expense" className="flex" onValueChange={handleTransactionTypeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expense" id="expense" className="cursor-pointer" />
              <Label htmlFor="expense" className="cursor-pointer">
                Expense
              </Label>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <RadioGroupItem value="income" id="income" className="cursor-pointer" />
              <Label htmlFor="income" className="cursor-pointer">
                Income
              </Label>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <RadioGroupItem value="transfer" id="transfer" className="cursor-pointer" />
              <Label htmlFor="transfer" className="cursor-pointer">
                Transfer
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-muted-foreground">Rp</span>
            <Input
              id="amount"
              type="text"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="0"
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          {/* Modal Category - Pass transaction type untuk filter, disabled untuk transfer */}
          {transactionType !== 'transfer' && (
            <CategoryModal
              onCategoryAdded={handleCategoryAdded}
              transactionType={transactionType}
            />
          )}
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            disabled={transactionType === 'transfer'}
          >
            <SelectTrigger className="w-full" id="category">
              <SelectValue placeholder={transactionType === 'transfer' ? 'Transfer' : `Select ${transactionType.toUpperCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {transactionType === "expense" ? (
                <>
                  {categories
                    .filter(cat => cat.type?.toLowerCase() === 'expense')
                    .map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  }
                </>
              ) : transactionType === "income" ? (
                <>
                  {
                    categories
                      .filter(cat => cat.type?.toLowerCase() === 'income')
                      .map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                  }
                </>
              ) : (
                <>
                  {categories
                    .filter(cat => cat.type?.toLowerCase() === 'transfer')
                    .map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  }
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter transaction details..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account">Wallet</Label>
          {/* STEP 3: Pass callback untuk real-time update */}
          <CategoryAccount onAccountAdded={handleAccountAdded} />
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-full" id="account">
              <SelectValue placeholder="Select wallet" />
            </SelectTrigger>
            <SelectContent>
              {/* STEP 5: Empty state handling */}
              {accounts.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No wallets available. Add one first!
                </div>
              ) : (
                accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - Rp {Number(account.balance || 0).toLocaleString('id-ID')}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {transactionType === "transfer" && (
          <div className="space-y-2">
            <Label htmlFor="to-account">To Wallet</Label>
            <Select value={selectedToAccount} onValueChange={setSelectedToAccount}>
              <SelectTrigger id="to-account">
                <SelectValue placeholder="Select destination wallet" />
              </SelectTrigger>
              <SelectContent>
                {/* STEP 3: Filter out source wallet dari destination options */}
                {accounts
                  .filter(acc => acc.id !== selectedAccount)
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - Rp {Number(account.balance || 0).toLocaleString('id-ID')}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onComplete}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </Button>
      </div>
    </form>
  )
}
