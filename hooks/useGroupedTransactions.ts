import { useState, useCallback, useEffect } from 'react'
import { format, startOfDay, endOfDay, addDays, subDays, isToday, isYesterday } from 'date-fns'

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  date: string
  is_initial_balance?: boolean
  categories: {
    name: string
    color: string
    icon: string
  } | null
  accounts: {
    name: string
  }
  toAccountId?: string
}

export interface DailyData {
  date: Date
  displayDate: string
  transactions: Transaction[]
  dailyIncome: number
  dailyExpense: number
  dailyBalance: number
}

export function useDailyTransactions() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [dailyData, setDailyData] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDailyTransactions = useCallback(async (date: Date) => {
    try {
      setLoading(true)
      
      const startDay = startOfDay(date).toISOString()
      const endDay = endOfDay(date).toISOString()
      
      const response = await fetch(`/api/transactions?startDate=${startDay}&endDate=${endDay}&limit=100`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      const transactions = data.transactions || []

      // Calculate daily summary - exclude initial balance from totals only
      const dailyIncome = transactions
        .filter((t: Transaction) => t.type === 'INCOME' && !t.is_initial_balance)
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
      
      const dailyExpense = transactions
        .filter((t: Transaction) => t.type === 'EXPENSE')
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

      setDailyData({
        date,
        displayDate: formatDateHeader(date),
        transactions,
        dailyIncome,
        dailyExpense,
        dailyBalance: dailyIncome - dailyExpense
      })
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPreviousDay = useCallback(() => {
    const prevDay = subDays(currentDate, 1)
    setCurrentDate(prevDay)
    fetchDailyTransactions(prevDay)
  }, [currentDate, fetchDailyTransactions])

  const goToNextDay = useCallback(() => {
    const nextDay = addDays(currentDate, 1)
    const today = new Date()
    
    // Prevent going to future dates
    if (nextDay <= today) {
      setCurrentDate(nextDay)
      fetchDailyTransactions(nextDay)
    }
  }, [currentDate, fetchDailyTransactions])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentDate(today)
    fetchDailyTransactions(today)
  }, [fetchDailyTransactions])

  const setDate = useCallback((date: Date) => {
    setCurrentDate(date)
    fetchDailyTransactions(date)
  }, [fetchDailyTransactions])

  // Initial fetch
  useEffect(() => {
    fetchDailyTransactions(currentDate)
  }, [])

  return { 
    dailyData,
    currentDate,
    loading, 
    error,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setDate,
    refetch: () => fetchDailyTransactions(currentDate)
  }
}

function formatDateHeader(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  
  return format(date, 'EEEE, MMM d, yyyy')
}
