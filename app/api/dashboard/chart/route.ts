import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { startOfMonth, subMonths, subDays, subYears, format, differenceInMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '6m' // Default: 6 months
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')

    // Calculate start date based on range
    let startDate: Date
    let monthsToShow: number

    switch (range) {
      case '1m':
        startDate = subMonths(new Date(), 1)
        monthsToShow = 1
        break
      case '6m':
        startDate = subMonths(new Date(), 6)
        monthsToShow = 6
        break
      case '1y':
        startDate = subYears(new Date(), 1)
        monthsToShow = 12
        break
      case 'custom':
        if (customStart && customEnd) {
          startDate = new Date(customStart)
          const endDate = new Date(customEnd)
          
          // Get user's account IDs
          const { data: userAccounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)

          const accountIds = (userAccounts || []).map(acc => acc.id)

          if (accountIds.length === 0) {
            return NextResponse.json({ chartData: [] })
          }

          // Get transactions in custom range
          const { data: customTransactions } = await supabase
            .from('transactions')
            .select('amount, type')
            .in('accountId', accountIds)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())

          // Aggregate total for the entire period
          let totalIncome = 0
          let totalExpense = 0

          customTransactions?.forEach(transaction => {
            if (transaction.type === 'INCOME') {
              totalIncome += Number(transaction.amount)
            } else if (transaction.type === 'EXPENSE') {
              totalExpense += Number(transaction.amount)
            }
          })

          // Return single aggregated data point
          const customChartData = [{
            name: `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`,
            Income: totalIncome,
            Expenses: totalExpense,
            Savings: totalIncome - totalExpense
          }]

          return NextResponse.json({ chartData: customChartData })
        } else {
          return NextResponse.json({ 
            error: 'Custom range requires startDate and endDate' 
          }, { status: 400 })
        }
      default:
        startDate = subMonths(new Date(), 6)
        monthsToShow = 6
    }

    // Get user's account IDs
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)

    const accountIds = (userAccounts || []).map(acc => acc.id)

    if (accountIds.length === 0) {
      return NextResponse.json({ chartData: [] })
    }

    // Get transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .in('accountId', accountIds)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true })

    // Group by month and aggregate
    const monthlyData = new Map<string, { income: number; expense: number }>()

    // Initialize months
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i)
      const monthKey = format(startOfMonth(monthDate), 'yyyy-MM')
      monthlyData.set(monthKey, { income: 0, expense: 0 })
    }

    // Aggregate transactions
    transactions?.forEach(transaction => {
      const monthKey = format(startOfMonth(new Date(transaction.date)), 'yyyy-MM')
      const current = monthlyData.get(monthKey)
      
      if (current) {
        if (transaction.type === 'INCOME') {
          current.income += Number(transaction.amount)
        } else if (transaction.type === 'EXPENSE') {
          current.expense += Number(transaction.amount)
        }
      }
    })

    // Format for chart
    const chartData = Array.from(monthlyData.entries()).map(([monthKey, data]) => ({
      name: format(new Date(monthKey + '-01'), 'MMM yyyy'), // "Jan 2024", "Feb 2024"
      Income: data.income,
      Expenses: data.expense,
      Savings: data.income - data.expense
    }))

    return NextResponse.json({ chartData })
  } catch (error) {
    console.error('Chart data error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch chart data' 
    }, { status: 500 })
  }
}