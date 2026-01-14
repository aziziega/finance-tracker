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
      
      finalCategoryId = transferCategory?.id || null
    } else if (!categoryId) {
      return NextResponse.json({ 
        error: 'Category is required for non-transfer transactions' 
      }, { status: 400 })
    }

    // Additional validation for TRANSFER
    if (type === 'TRANSFER' && !toAccountId) {
      return NextResponse.json({ 
        error: 'Destination account is required for transfer' 
      }, { status: 400 })
    }

    // ✅ Call stored procedure instead of manual transaction
    // Ensure proper UUID type handling - convert falsy to null
    const rpcParams = {
      p_user_id: user.id,
      p_type: type.toUpperCase(),
      p_amount: Number(amount),
      p_account_id: accountId || null,
      p_category_id: finalCategoryId || null,
      p_to_account_id: toAccountId || null,
      p_description: description?.trim() || null,
      p_date: date
    }

    // Critical: Ensure no empty strings or undefined for UUID fields
    if (!rpcParams.p_account_id) {
      return NextResponse.json({ 
        error: 'Account ID is required' 
      }, { status: 400 })
    }

    // Convert empty strings to null for UUID fields
    if (rpcParams.p_category_id === '' || rpcParams.p_category_id === undefined) {
      rpcParams.p_category_id = null
    }
    if (rpcParams.p_to_account_id === '' || rpcParams.p_to_account_id === undefined) {
      rpcParams.p_to_account_id = null
    }

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Transaction Request:', {
        type: type.toUpperCase(),
        amount: Number(amount),
        categoryId: finalCategoryId,
        accountId: accountId,
        toAccountId: toAccountId
      })
      console.log('🔍 RPC Params:', rpcParams)
    }

    const { data, error } = await supabase.rpc('create_transaction', rpcParams)

    if (error) {
      // Enhanced error logging
      console.error('❌ RPC Error Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        params: rpcParams
      })
      
      // Better error messages
      let errorMessage = 'Failed to create transaction'
      let errorDetails = error.message
      
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        errorMessage = 'DATABASE_ERROR: Stored procedures not installed'
        errorDetails = 'Please install stored procedures from supabase-stored-procedures.sql file in Supabase SQL Editor'
      } else if (error.message?.includes('operator does not exist') || error.message?.includes('uuid')) {
        errorMessage = 'DATABASE_ERROR: Type mismatch - Stored procedure needs update'
        errorDetails = 'The stored procedure signature is outdated. Please DROP and re-run supabase-stored-procedures.sql. See DIAGNOSTIC_UUID_ERROR.md for detailed instructions.'
      } else if (error.code === 'PGRST301') {
        errorMessage = 'DATABASE_ERROR: Permission denied'
        errorDetails = 'Stored procedure exists but user lacks permission'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        message: errorDetails,
        hint: 'Check server console logs for detailed parameters',
        rawError: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    // Log successful RPC response
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ RPC Response:', data)
    }

    // Check result from stored procedure
    if (!data.success) {
      // Log business logic error from stored procedure
      console.error('❌ Stored Procedure Error:', {
        error: data.error,
        message: data.message,
        details: data
      })
      
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
