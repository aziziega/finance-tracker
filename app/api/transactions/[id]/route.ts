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

    // ✅ Call stored procedure instead of manual delete logic
    const { data, error } = await supabase.rpc('delete_transaction', {
      p_user_id: user.id,
      p_transaction_id: transactionId
    })

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 })
    }

    // Check result from stored procedure
    if (!data.success) {
      const statusCode = data.error === 'TRANSACTION_NOT_FOUND' ? 404 :
                        data.error === 'UNAUTHORIZED' ? 403 : 400
      
      return NextResponse.json({ 
        error: data.error,
        message: data.message
      }, { status: statusCode })
    }

    return NextResponse.json({ 
      success: true,
      message: data.message
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
    } else if (!categoryId) {
      return NextResponse.json({ 
        error: 'Category is required for non-transfer transactions' 
      }, { status: 400 })
    }

    // ✅ Call stored procedure instead of manual update logic
    const { data, error } = await supabase.rpc('update_transaction', {
      p_user_id: user.id,
      p_transaction_id: transactionId,
      p_type: type.toUpperCase(),
      p_amount: Number(amount),
      p_account_id: accountId,
      p_category_id: finalCategoryId,
      p_to_account_id: toAccountId || null,
      p_description: description || null,
      p_date: date
    })

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 })
    }

    // Check result from stored procedure
    if (!data.success) {
      const statusCode = data.error === 'INSUFFICIENT_BALANCE' ? 400 : 
                        data.error === 'UNAUTHORIZED' ? 403 :
                        data.error === 'TRANSACTION_NOT_FOUND' ? 404 :
                        data.error === 'ACCOUNT_NOT_FOUND' ? 404 : 400
      
      return NextResponse.json({ 
        error: data.error,
        message: data.message,
        details: data
      }, { status: statusCode })
    }

    return NextResponse.json({ 
      success: true,
      message: data.message
    })
  } catch (error) {
    console.error('Update transaction error:', error)
    return NextResponse.json({ 
      error: 'Failed to update transaction' 
    }, { status: 500 })
  }
}
