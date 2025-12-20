import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        transactions: [],
        summary: {
          totalExpenses: 0,
          totalIncome: 0,
          balance: 0,
          dailyAverageExpense: 0,
          dailyAverageIncome: 0,
          expensesByCategory: [],
          incomesByCategory: []
        }
      })
    }

    const accountIds = accounts.map(a => a.id)

    // Fetch transactions for the date range
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        description,
        date,
        accountId,
        categoryId,
        categories (
          id,
          name,
          type,
          icon,
          color
        ),
        accounts!fk_transaction_account (
          name
        )
      `)
      .in('accountId', accountIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (transError) {
      console.error('Transaction fetch error:', transError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Calculate summary
    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const balance = totalIncome - totalExpenses

    // Calculate daily averages
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const dailyAverageExpense = daysDiff > 0 ? totalExpenses / daysDiff : 0
    const dailyAverageIncome = daysDiff > 0 ? totalIncome / daysDiff : 0

    // Group by category for expenses
    const expensesByCategory = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc: any[], transaction) => {
        const categoryName = transaction.categories?.name || 'Uncategorized'
        const categoryColor = transaction.categories?.color || '#6B7280'
        const categoryIcon = transaction.categories?.icon || 'circle'
        
        const existing = acc.find(item => item.category === categoryName)
        if (existing) {
          existing.amount += Number(transaction.amount)
          existing.count += 1
        } else {
          acc.push({
            category: categoryName,
            amount: Number(transaction.amount),
            count: 1,
            color: categoryColor,
            icon: categoryIcon
          })
        }
        return acc
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        ...item,
        percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0
      }))

    // Group by category for income
    const incomesByCategory = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc: any[], transaction) => {
        const categoryName = transaction.categories?.name || 'Uncategorized'
        const categoryColor = transaction.categories?.color || '#6B7280'
        const categoryIcon = transaction.categories?.icon || 'circle'
        
        const existing = acc.find(item => item.category === categoryName)
        if (existing) {
          existing.amount += Number(transaction.amount)
          existing.count += 1
        } else {
          acc.push({
            category: categoryName,
            amount: Number(transaction.amount),
            count: 1,
            color: categoryColor,
            icon: categoryIcon
          })
        }
        return acc
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        ...item,
        percentage: totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0
      }))

    return NextResponse.json({
      transactions,
      summary: {
        totalExpenses,
        totalIncome,
        balance,
        dailyAverageExpense,
        dailyAverageIncome,
        expensesByCategory,
        incomesByCategory
      }
    })
  } catch (error) {
    console.error('Monthly report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
