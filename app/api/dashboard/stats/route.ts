import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get total balance from all accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', user.id)

    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

    // 2. Get current month date range
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get user's account IDs for filtering transactions
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)

    const accountIds = (userAccounts || []).map(acc => acc.id)

    if (accountIds.length === 0) {
      return NextResponse.json({
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        savingsRate: 0,
        lastMonthIncome: 0,
        lastMonthExpense: 0,
        incomeChange: 0,
        expenseChange: 0
      })
    }

    // 3. Get current month transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .in('accountId', accountIds)
      .gte('date', firstDay.toISOString())
      .lte('date', lastDay.toISOString())

    const monthlyIncome = transactions
      ?.filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    const monthlyExpense = transactions
      ?.filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    // 4. Get last month transactions for comparison
    const lastMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const { data: lastMonthTransactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .in('accountId', accountIds)
      .gte('date', lastMonthFirstDay.toISOString())
      .lte('date', lastMonthLastDay.toISOString())

    const lastMonthIncome = lastMonthTransactions
      ?.filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    const lastMonthExpense = lastMonthTransactions
      ?.filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    // 5. Calculate savings rate
    const savingsRate = monthlyIncome > 0 
      ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 
      : 0

    // 6. Calculate percentage changes
    const incomeChange = lastMonthIncome > 0 
      ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 
      : monthlyIncome > 0 ? 100 : 0

    const expenseChange = lastMonthExpense > 0 
      ? ((monthlyExpense - lastMonthExpense) / lastMonthExpense) * 100 
      : monthlyExpense > 0 ? 100 : 0

    return NextResponse.json({
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      savingsRate,
      lastMonthIncome,
      lastMonthExpense,
      incomeChange,
      expenseChange
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
