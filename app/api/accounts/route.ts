import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // User belum login: hanya tampilkan system accounts
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_system', true)
        .order('name', { ascending: true })

      if (error) {
        console.log('Database error:', error)
        return NextResponse.json({ 
          error: error.message,
          accounts: [],
        }, { status: 500 })
      }

      return NextResponse.json({ accounts: accounts || [], success: true })
    }

    // ✅ User sudah login: ambil hidden accounts mereka
    const { data: hiddenAccounts } = await supabase
      .from('hidden_accounts')
      .select('account_id')
      .eq('user_id', user.id)

    const hiddenIds = (hiddenAccounts || []).map(h => h.account_id)

    // Query: system accounts + custom user accounts
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .or(`is_system.eq.true,user_id.eq.${user.id}`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.log('Database error:', error)
      return NextResponse.json({ 
        error: error.message, 
        accounts: [],
      }, { status: 500 })
    }

    // ✅ Filter out hidden accounts
    const visibleAccounts = (accounts || []).filter(
      acc => !hiddenIds.includes(acc.id)
    )

    return NextResponse.json({ 
      accounts: visibleAccounts, 
      success: true 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch accounts',
      accounts: [] 
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

    const { name, balance } = await request.json()
    // Validate input
    if (!name) {
      return NextResponse.json({ error: 'Wallet name is required' }, { status: 400 })
    }

    const { data: account, error } = await supabase
      .from('accounts')
      .insert([{
        name,
        balance: balance || 0,
        is_system: false, // ✅ User account
        user_id: user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Database error creating account:', error)
      return NextResponse.json({ 
        error: error.message || 'Database error' 
      }, { status: 500 })
    }

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error('Failed to create account:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create account' 
    }, { status: 500 })
  }
}
