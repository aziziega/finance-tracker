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

    // ✅ Cek apakah account adalah system account
    const { data: account } = await supabase
      .from('accounts')
      .select('is_system, user_id')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ 
        error: 'Account not found' 
      }, { status: 404 })
    }

    // ✅ Jika SYSTEM ACCOUNT: hide saja (tidak delete dari DB)
    if (account.is_system) {
      const { error } = await supabase
        .from('hidden_accounts')
        .insert({ 
          user_id: user.id, 
          account_id: accountId 
        })

      if (error) {
        // Jika sudah di-hide sebelumnya (duplicate), anggap sukses
        if (error.code === '23505') {
          return NextResponse.json({ success: true, hidden: true })
        }
        throw error
      }

      return NextResponse.json({ 
        success: true, 
        hidden: true,
        message: 'System account hidden successfully'
      })
    }

    // ✅ Jika CUSTOM ACCOUNT: cek ownership & transactions
    if (account.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Cannot delete account from other user' 
      }, { status: 403 })
    }

    // Cek apakah digunakan di transactions
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

    // ✅ Delete custom account dari DB
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      deleted: true,
      message: 'Custom account deleted successfully'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete account' 
    }, { status: 500 })
  }
}
