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

    // Check if account is being used in transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('accountId', accountId)
      .limit(1)

    if (transactions && transactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete account that is being used in transactions' 
      }, { status: 400 })
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
