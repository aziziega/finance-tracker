// hooks/useChartData.ts - UPDATE
import { useState, useEffect, useCallback } from 'react'

interface ChartData {
  name: string
  Income: number
  Expenses: number
  Savings: number
}

interface UseChartDataParams {
  range?: '1m' | '6m' | '1y' | 'custom'
  startDate?: string
  endDate?: string
}

export function useChartData(params: UseChartDataParams = {}) {
  const { range = '6m', startDate, endDate } = params
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query string
      const queryParams = new URLSearchParams({ range })
      if (range === 'custom' && startDate && endDate) {
        queryParams.append('startDate', startDate)
        queryParams.append('endDate', endDate)
      }

      const response = await fetch(`/api/dashboard/chart?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart data')
      }

      const result = await response.json()
      setData(result.chartData || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch chart data:', err)
    } finally {
      setLoading(false)
    }
  }, [range, startDate, endDate])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  return { data, loading, error, refetch: fetchChartData }
}