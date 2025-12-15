import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Ambil hidden accounts dengan join ke tabel accounts
    const { data: hiddenAccounts, error } = await supabase
      .from('hidden_accounts')
      .select(`
        id,
        account_id,
        hidden_at,
        accounts (
          id,
          name,
          balance,
          is_system
        )
      `)
      .eq('user_id', user.id)
      .order('hidden_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        accounts: [] 
      }, { status: 500 })
    }

    // ✅ Format data untuk kemudahan penggunaan
    const formattedAccounts = (hiddenAccounts || []).map(item => ({
      hidden_id: item.id,
      hidden_at: item.hidden_at,
      account: item.accounts
    }))

    return NextResponse.json({ 
      accounts: formattedAccounts,
      success: true 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch hidden accounts',
      accounts: [] 
    }, { status: 500 })
  }
}
