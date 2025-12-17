import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const transactionId = id

    // Get transaction details first
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts:accountId (id, balance, user_id)
      `)
      .eq('id', transactionId)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 })
    }

    // Verify account belongs to user
    if (transaction.accounts?.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 })
    }

    // Revert balance changes
    const account = transaction.accounts
    let newBalance = account.balance

    // Reverse the transaction effect
    if (transaction.type === 'EXPENSE' || transaction.type === 'TRANSFER') {
      // Add back the amount that was deducted
      newBalance += transaction.amount
    } else if (transaction.type === 'INCOME') {
      // Deduct the amount that was added
      newBalance -= transaction.amount
    }

    // Update source account balance
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', transaction.accountId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update account balance error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update account balance' 
      }, { status: 500 })
    }

    // For TRANSFER: revert destination account too
    if (transaction.type === 'TRANSFER' && transaction.toAccountId) {
      const { data: destAccount } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('id', transaction.toAccountId)
        .eq('user_id', user.id)
        .single()

      if (destAccount) {
        const newDestBalance = destAccount.balance - transaction.amount

        const { error: updateDestError } = await supabase
          .from('accounts')
          .update({ balance: newDestBalance })
          .eq('id', transaction.toAccountId)
          .eq('user_id', user.id)

        if (updateDestError) {
          // Rollback source account
          await supabase
            .from('accounts')
            .update({ balance: account.balance })
            .eq('id', transaction.accountId)
            .eq('user_id', user.id)

          console.error('Update destination account error:', updateDestError)
          return NextResponse.json({ 
            error: 'Failed to update destination account balance' 
          }, { status: 500 })
        }
      }
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      console.error('Delete transaction error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete transaction' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Transaction deleted successfully'
    })
  } catch (error) {
    console.error('Delete transaction error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete transaction' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const transactionId = id
    const body = await request.json()
    const { type, amount, categoryId, accountId, toAccountId, description, date } = body

    // Validation
    if (!type || !amount || !accountId || !date) {
      return NextResponse.json({ 
        error: 'Type, amount, accountId, and date are required' 
      }, { status: 400 })
    }

    // Get original transaction
    const { data: originalTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts:accountId (id, balance, user_id)
      `)
      .eq('id', transactionId)
      .single()

    if (fetchError || !originalTransaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 })
    }

    // Verify account belongs to user
    if (originalTransaction.accounts?.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 })
    }

    // Handle category auto-fetch for TRANSFER
    let finalCategoryId = categoryId
    if (type === 'TRANSFER') {
      const { data: transferCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('type', 'TRANSFER')
        .eq('user_id', user.id)
        .single()
      
      finalCategoryId = transferCategory?.id
    } else {
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

    const newAmount = Number(amount)
    if (newAmount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be greater than 0' 
      }, { status: 400 })
    }

    // Step 1: Revert original transaction balance changes
    const originalAccount = originalTransaction.accounts
    let revertedBalance = originalAccount.balance

    if (originalTransaction.type === 'EXPENSE' || originalTransaction.type === 'TRANSFER') {
      revertedBalance += originalTransaction.amount
    } else if (originalTransaction.type === 'INCOME') {
      revertedBalance -= originalTransaction.amount
    }

    // Step 2: Get new accounts info
    const { data: newSourceAccount } = await supabase
      .from('accounts')
      .select('id, balance, user_id')
      .eq('id', accountId)
      .single()

    if (!newSourceAccount || newSourceAccount.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Source account not found or unauthorized' 
      }, { status: 404 })
    }

    // Calculate new balance for source account
    let finalSourceBalance = accountId === originalTransaction.accountId 
      ? revertedBalance 
      : newSourceAccount.balance

    if (type === 'EXPENSE' || type === 'TRANSFER') {
      finalSourceBalance -= newAmount
    } else if (type === 'INCOME') {
      finalSourceBalance += newAmount
    }

    // Check sufficient balance
    if ((type === 'EXPENSE' || type === 'TRANSFER') && finalSourceBalance < 0) {
      return NextResponse.json({ 
        error: 'Insufficient balance in source account' 
      }, { status: 400 })
    }

    // Step 3: Update transaction
    const transactionData: any = {
      type: type.toUpperCase(),
      amount: newAmount,
      accountId,
      date,
      description: description || null,
      toAccountId: type === 'TRANSFER' ? toAccountId : null
    }

    if (finalCategoryId) {
      transactionData.categoryId = finalCategoryId
    }

    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update(transactionData)
      .eq('id', transactionId)

    if (updateTransactionError) {
      console.error('Update transaction error:', updateTransactionError)
      return NextResponse.json({ 
        error: 'Failed to update transaction' 
      }, { status: 500 })
    }

    // Step 4: Update balances
    // Revert original source account
    if (accountId === originalTransaction.accountId) {
      // Same account, just update with final balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: finalSourceBalance })
        .eq('id', accountId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update account error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update account balance' 
        }, { status: 500 })
      }
    } else {
      // Different account, revert old and update new
      const { error: revertError } = await supabase
        .from('accounts')
        .update({ balance: revertedBalance })
        .eq('id', originalTransaction.accountId)
        .eq('user_id', user.id)

      if (revertError) {
        console.error('Revert old account error:', revertError)
        return NextResponse.json({ 
          error: 'Failed to revert old account balance' 
        }, { status: 500 })
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: finalSourceBalance })
        .eq('id', accountId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update new account error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update new account balance' 
        }, { status: 500 })
      }
    }

    // Step 5: Handle original destination account (if was TRANSFER)
    if (originalTransaction.type === 'TRANSFER' && originalTransaction.toAccountId) {
      const { data: originalDestAccount } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('id', originalTransaction.toAccountId)
        .eq('user_id', user.id)
        .single()

      if (originalDestAccount) {
        const revertedDestBalance = originalDestAccount.balance - originalTransaction.amount
        
        await supabase
          .from('accounts')
          .update({ balance: revertedDestBalance })
          .eq('id', originalTransaction.toAccountId)
          .eq('user_id', user.id)
      }
    }

    // Step 6: Handle new destination account (if new TRANSFER)
    if (type === 'TRANSFER' && toAccountId) {
      const { data: newDestAccount } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('id', toAccountId)
        .eq('user_id', user.id)
        .single()

      if (!newDestAccount) {
        return NextResponse.json({ 
          error: 'Destination account not found' 
        }, { status: 404 })
      }

      const newDestBalance = newDestAccount.balance + newAmount

      const { error: updateDestError } = await supabase
        .from('accounts')
        .update({ balance: newDestBalance })
        .eq('id', toAccountId)
        .eq('user_id', user.id)

      if (updateDestError) {
        console.error('Update destination account error:', updateDestError)
        return NextResponse.json({ 
          error: 'Failed to update destination account balance' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Transaction updated successfully'
    })
  } catch (error) {
    console.error('Update transaction error:', error)
    return NextResponse.json({ 
      error: 'Failed to update transaction' 
    }, { status: 500 })
  }
}
