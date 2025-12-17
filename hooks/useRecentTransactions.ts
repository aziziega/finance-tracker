import { useState, useEffect, useCallback } from 'react'

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  date: string
  categories: {
    name: string
    color: string
    icon: string
  } | null
  accounts: {
    name: string
  }
}

export function useRecentTransactions(limit = 10) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, loading, error, refetch: fetchTransactions }
}