import { useState, useEffect, useCallback } from 'react'

interface Account {
  id: string
  name: string
  balance: number
  is_default: boolean
  user_id: string
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return { accounts, loading, error, refetch: fetchAccounts }
}