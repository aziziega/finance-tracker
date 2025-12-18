import { useState, useEffect, useCallback } from 'react'

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  savingsRate: number
  lastMonthIncome: number
  lastMonthExpense: number
  incomeChange: number
  expenseChange: number
  transactionCount: number
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
