"use client"

import type React from "react"

import { useState, useEffect } from "react"
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

interface AddTransactionFormProps {
  onComplete: () => void
}

export function FormTransaction({ onComplete }: AddTransactionFormProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [transactionType, setTransactionType] = useState<string>("expense")
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()

        console.log('API Response:', data) // Debug

        setCategories(data.categories || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      }
    }


    fetchCategories()
  }, [])


  const handleTransactionTypeChange = (newType: string) => {
    setTransactionType(newType)
    setSelectedCategory("") // ✅ Reset selected category
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would handle the form submission, like saving to a database
    // For now, we'll just call onComplete to close the form

    onComplete()
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
              <RadioGroupItem value="income" id="income" />
              <Label htmlFor="income" className="cursor-pointer">
                Income
              </Label>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <RadioGroupItem value="transfer" id="transfer" />
              <Label htmlFor="transfer" className="cursor-pointer">
                Transfer
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
            <Input id="amount" type="number" step="0.01" placeholder="0.00" className="pl-7" />
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
          {/* Modal Categor */}
          <CategoryModal />
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-full" id="category">
              <SelectValue placeholder={`Select category`} />
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
        <Textarea id="description" placeholder="Enter transaction details..." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account">Account</Label>
          <Select>
            <SelectTrigger className="w-full" id="account">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Main Checking</SelectItem>
              <SelectItem value="savings">Savings Account</SelectItem>
              <SelectItem value="credit">Credit Card</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {transactionType === "transfer" && (

          <div className="space-y-2">
            <Label htmlFor="to-account">To Account</Label>
            <Select>
              <SelectTrigger id="to-account">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Main Checking</SelectItem>
                <SelectItem value="savings">Savings Account</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onComplete}>
          Cancel
        </Button>
        <Button type="submit">Save Transaction</Button>
      </div>
    </form>
  )
}
