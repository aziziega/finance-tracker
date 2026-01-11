import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { rateLimit, getClientIdentifier, RateLimitPresets, createRateLimitResponse } from '@/lib/rate-limit'

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

    // Rate limiting: 5 requests per minute for deletes
    const rateLimitResult = await rateLimit(
      getClientIdentifier(request, user.id),
      RateLimitPresets.strict
    )

    if (!rateLimitResult.success) {
      const response = createRateLimitResponse(rateLimitResult)
      return NextResponse.json(response.body, { 
        status: response.status,
        headers: response.headers 
      })
    }

    const { id: accountId } = await params

    // Verify account exists and belongs to user
    const { data: account } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ 
        error: 'Account not found' 
      }, { status: 404 })
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Cannot delete account from other user' 
      }, { status: 403 })
    }

    // Check if account has transactions (excluding initial balance)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, is_initial_balance')
      .eq('accountId', accountId)

    // Filter only real transactions (not initial balance)
    const realTransactions = transactions?.filter(t => !t.is_initial_balance) || []

    if (realTransactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete account that has transaction history. Please delete all transactions first.' 
      }, { status: 400 })
    }

    // Delete initial balance transactions first (if any)
    if (transactions && transactions.length > 0) {
      await supabase
        .from('transactions')
        .delete()
        .eq('accountId', accountId)
        .eq('is_initial_balance', true)
    }

    // Hard delete the account
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete account' 
    }, { status: 500 })
  }
}


// 1. TAMBAHKAN PUT ENDPOINT DI app/api/accounts/[id]/route.ts
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

    // Rate limiting: 5 requests per minute for updates
    const rateLimitResult = await rateLimit(
      getClientIdentifier(request, user.id),
      RateLimitPresets.strict
    )

    if (!rateLimitResult.success) {
      const response = createRateLimitResponse(rateLimitResult)
      return NextResponse.json(response.body, { 
        status: response.status,
        headers: response.headers 
      })
    }

    const { id: accountId } = await params
    const { name, balance } = await request.json()

    // Validate input
    if (!name && balance === undefined) {
      return NextResponse.json({ 
        error: 'At least name or balance is required' 
      }, { status: 400 })
    }

    // Verify account exists and belongs to user
    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ 
        error: 'Account not found' 
      }, { status: 404 })
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Cannot update account from other user' 
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (balance !== undefined) updateData.balance = Number(balance)

    // Update account
    const { data: updatedAccount, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update account error:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to update account' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      account: updatedAccount,
      success: true,
      message: 'Account updated successfully'
    })
  } catch (error) {
    console.error('Update account error:', error)
    return NextResponse.json({ 
      error: 'Failed to update account' 
    }, { status: 500 })
  }
}