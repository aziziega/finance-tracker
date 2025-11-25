import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(
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

    // ✅ Remove dari hidden_accounts
    const { error } = await supabase
      .from('hidden_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('account_id', accountId)

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      message: 'Account restored successfully'
    })
  } catch (error) {
    console.error('Restore account error:', error)
    return NextResponse.json({ 
      error: 'Failed to restore account' 
    }, { status: 500 })
  }
}
