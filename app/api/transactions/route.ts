import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { error } from 'console'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'
    const accountId = searchParams.get('accountId')

    // Get user's account IDs first for filtering
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)

    const accountIds = (userAccounts || []).map(acc => acc.id)

    if (accountIds.length === 0) {
      return NextResponse.json({ 
        transactions: [],
        count: 0
      })
    }

    let query = supabase
      .from('transactions')
      .select(`*`)
      .in('accountId', accountIds)
      .order('date', { ascending: false })
      .limit(Number(limit))

    if (accountId) {
      query = query.eq('accountId', accountId)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('Fetch transactions error:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to fetch transactions' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      transactions: transactions || [],
      count: transactions?.length || 0
    })
  } catch (error) {
    console.error('Fetch transactions error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch transactions' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, categoryId, accountId, toAccountId, description, date } = body

    // Validation
    if (!type || !amount || !accountId || !date) {
      return NextResponse.json({ 
        error: 'Type, amount, accountId, and date are required' 
      }, { status: 400 })
    }

    let finalCategoryId = categoryId

    if (type === 'TRANSFER') {
      // ✅ Auto-fetch Transfer category dari database
      const { data: transferCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('type', 'TRANSFER')
        .eq('user_id', user.id)
        .single()
      
      finalCategoryId = transferCategory?.id
    } else {
      // INCOME/EXPENSE tetap require categoryId
      if (!categoryId) {
        return NextResponse.json({ 
          error: 'Category is required for non-transfer transactions' 
        }, { status: 400 })
      }
    }

    if (type === 'TRANSFER' && !toAccountId) {
      return NextResponse.json({ 
        error: 'Destination account is required for transfer' 
      }, { status: 400 })
    }

    if (type === 'TRANSFER' && accountId === toAccountId) {
      return NextResponse.json({ 
        error: 'Source and destination accounts must be different' 
      }, { status: 400 })
    }

    const transactionAmount = Number(amount)
    if (transactionAmount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be greater than 0' 
      }, { status: 400 })
    }

    // Verify accounts belong to user
    const { data: sourceAccount } = await supabase
      .from('accounts')
      .select('id, balance, user_id')
      .eq('id', accountId)
      .single()

    if (!sourceAccount || sourceAccount.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Source account not found or unauthorized' 
      }, { status: 404 })
    }

    // Check sufficient balance for EXPENSE and TRANSFER
    if ((type === 'EXPENSE' || type === 'TRANSFER') && sourceAccount.balance < transactionAmount) {
      return NextResponse.json({ 
        error: 'Insufficient balance in source account' 
      }, { status: 400 })
    }

    let destinationAccount = null
    if (type === 'TRANSFER') {
      const { data: destAccount } = await supabase
        .from('accounts')
        .select('id, balance, user_id')
        .eq('id', toAccountId)
        .single()

      if (!destAccount || destAccount.user_id !== user.id) {
        return NextResponse.json({ 
          error: 'Destination account not found or unauthorized' 
        }, { status: 404 })
      }
      destinationAccount = destAccount
    }

    // Start transaction logic
    // 1. Create transaction record
    const transactionData: any = {
      type: type.toUpperCase(),
      amount: transactionAmount,
      accountId,
      date,
      description: description || null,
      toAccountId: type === 'TRANSFER' ? toAccountId : null
    }

    if (finalCategoryId) {
      transactionData.categoryId = finalCategoryId
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single()

    if (transactionError) {
      console.error('Create transaction error:', transactionError)
      return NextResponse.json({ 
        error: transactionError.message || 'Failed to create transaction' 
      }, { status: 500 })
    }

    // 2. Update account balances
    let newSourceBalance = sourceAccount.balance

    if (type === 'EXPENSE' || type === 'TRANSFER') {
      newSourceBalance -= transactionAmount
    } else if (type === 'INCOME') {
      newSourceBalance += transactionAmount
    }

    const { error: updateSourceError } = await supabase
      .from('accounts')
      .update({ balance: newSourceBalance })
      .eq('id', accountId)
      .eq('user_id', user.id)

    if (updateSourceError) {
      // Rollback: delete transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      console.error('Update source account error:', updateSourceError)
      return NextResponse.json({ 
        error: 'Failed to update source account balance' 
      }, { status: 500 })
    }

    // 3. For TRANSFER: update destination account
    if (type === 'TRANSFER' && destinationAccount) {
      const newDestBalance = destinationAccount.balance + transactionAmount

      const { error: updateDestError } = await supabase
        .from('accounts')
        .update({ balance: newDestBalance })
        .eq('id', toAccountId)

      if (updateDestError) {
        // Rollback: revert source account and delete transaction
        await supabase
          .from('accounts')
          .update({ balance: sourceAccount.balance })
          .eq('id', accountId)
          .eq('user_id', user.id)

        await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id)

        console.error('Update destination account error:', updateDestError)
        return NextResponse.json({ 
          error: 'Failed to update destination account balance' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      transaction,
      success: true,
      message: 'Transaction created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create transaction error:', error)
    return NextResponse.json({ 
      error: 'Failed to create transaction' 
    }, { status: 500 })
  }
}
