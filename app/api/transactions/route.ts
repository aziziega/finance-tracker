import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { error } from 'console'
import { rateLimit, getClientIdentifier, RateLimitPresets, createRateLimitResponse } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 60 requests per minute for reads
    const rateLimitResult = await rateLimit(
      getClientIdentifier(request, user.id),
      RateLimitPresets.relaxed
    )

    if (!rateLimitResult.success) {
      const response = createRateLimitResponse(rateLimitResult)
      return NextResponse.json(response.body, { 
        status: response.status,
        headers: response.headers 
      })
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

    const offset = searchParams.get('offset') || '0'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories:categoryId (id, name, type, color, icon),
        accounts:accountId (id, name, balance)
      `)
      .in('accountId', accountIds)
      .order('date', { ascending: false })

    // Add date range filter
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    if (accountId) {
      query = query.eq('accountId', accountId)
    }

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1)

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

    // Rate limiting: 5 requests per minute for creates
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

    const body = await request.json()
    const { type, amount, categoryId, accountId, toAccountId, description, date } = body

    // Validation
    if (!type || !amount || !accountId || !date) {
      return NextResponse.json({ 
        error: 'Type, amount, accountId, and date are required' 
      }, { status: 400 })
    }

    let finalCategoryId = categoryId

    // Auto-fetch Transfer category
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

    // ✅ Call stored procedure instead of manual transaction
    const { data, error } = await supabase.rpc('create_transaction', {
      p_user_id: user.id,
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
                        data.error === 'ACCOUNT_NOT_FOUND' ? 404 : 400
      
      return NextResponse.json({ 
        error: data.error,
        message: data.message,
        details: data
      }, { status: statusCode })
    }

    return NextResponse.json({ 
      success: true,
      transaction_id: data.transaction_id,
      message: data.message,
      details: data.details
    }, { status: 201 })

  } catch (error) {
    console.error('Create transaction error:', error)
    return NextResponse.json({ 
      error: 'Failed to create transaction' 
    }, { status: 500 })
  }
}
