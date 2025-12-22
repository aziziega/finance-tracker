import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's accounts (both default and custom)
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.log('Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        accounts: [],
      }, { status: 500 })
    }

    return NextResponse.json({ 
      accounts: accounts || [], 
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
        is_default: false, // User custom account
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

    // Create initial balance transaction if balance > 0
    if (balance && balance > 0) {
      // Get or create "Initial Balance" category
      let { data: initialCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Initial Balance')
        .eq('user_id', user.id)
        .single()

      // If not exists, create it
      if (!initialCategory) {
        const { data: newCategory } = await supabase
          .from('categories')
          .insert([{
            name: 'Initial Balance',
            type: 'INCOME',
            icon: 'wallet',
            color: '#10b981',
            user_id: user.id,
            is_default: false
          }])
          .select()
          .single()
        
        initialCategory = newCategory
      }

      // Create initial balance transaction
      if (initialCategory) {
        await supabase
          .from('transactions')
          .insert([{
            type: 'INCOME',
            amount: balance,
            accountId: account.id,
            categoryId: initialCategory.id,
            description: `Initial balance for ${name}`,
            date: new Date().toISOString(),
            is_initial_balance: true
          }])
      }
    }

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error('Failed to create account:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create account' 
    }, { status: 500 })
  }
}

