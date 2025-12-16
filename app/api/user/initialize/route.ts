import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('🔍 User check:', { user: user?.id, error: userError })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Check if user already initialized
    const { data: existingAccounts, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    console.log('🔍 Existing accounts check:', { count: existingAccounts?.length, error: checkError })

    if (existingAccounts && existingAccounts.length > 0) {
      return NextResponse.json({ 
        message: 'User already initialized',
        alreadyInitialized: true 
      })
    }

    // ✅ Fetch templates
    const { data: walletTemplates, error: walletError } = await supabase
      .from('default_wallet_templates')
      .select('*')
      .order('order_index', { ascending: true })

    console.log('🔍 Wallet templates:', { count: walletTemplates?.length, error: walletError })

    const { data: categoryTemplates, error: categoryError } = await supabase
      .from('default_category_templates')
      .select('*')
      .order('order_index', { ascending: true })

    console.log('🔍 Category templates:', { count: categoryTemplates?.length, error: categoryError })

    if (walletError || categoryError) {
      throw new Error(`Template fetch failed: ${walletError?.message || categoryError?.message}`)
    }

    // ✅ Create accounts from templates (FIXED: is_system → is_default)
    const accountsToInsert = (walletTemplates || []).map(template => ({
      name: template.name,
      balance: template.balance || 0,
      is_default: true, // ✅ FIXED: Changed from is_system
      user_id: user.id
    }))

    console.log('🔍 Accounts to insert:', accountsToInsert.length)

    if (accountsToInsert.length > 0) {
      const { error: accountInsertError } = await supabase
        .from('accounts')
        .insert(accountsToInsert)

      if (accountInsertError) {
        console.error('❌ Account insert error:', accountInsertError)
        
        // ✅ Better error handling for duplicate entries
        if (accountInsertError.code === '23505') {
          console.warn('⚠️ Some accounts already exist, skipping...')
          // Don't throw error, just log warning
        } else {
          throw new Error(`Failed to insert accounts: ${accountInsertError.message}`)
        }
      }
    }

    // ✅ Create categories from templates (FIXED: is_system → is_default)
    const categoriesToInsert = (categoryTemplates || []).map(template => ({
      name: template.name,
      type: template.type,
      color: template.color || '#6B7280',
      icon: template.icon || 'circle',
      is_default: true, // ✅ FIXED: Changed from is_system
      user_id: user.id
    }))

    console.log('🔍 Categories to insert:', categoriesToInsert.length)

    // Line 89-104, ganti dengan:
if (categoriesToInsert.length > 0) {
  let successCount = 0;
  
  for (const category of categoriesToInsert) {
    const { error: categoryInsertError } = await supabase
      .from('categories')
      .insert([category])
    
    if (!categoryInsertError) {
      successCount++
    } else if (categoryInsertError.code !== '23505') {
      // Only throw error if it's NOT a duplicate error
      console.error(`❌ Failed to insert category "${category.name}":`, categoryInsertError)
      throw new Error(`Failed to insert category: ${categoryInsertError.message}`)
    }
  }
  
  console.log(`✅ Successfully inserted ${successCount}/${categoriesToInsert.length} categories`)
}

// Do the same for accounts (line 63-76)
if (accountsToInsert.length > 0) {
  let successCount = 0;
  
  for (const account of accountsToInsert) {
    const { error: accountInsertError } = await supabase
      .from('accounts')
      .insert([account])
    
    if (!accountInsertError) {
      successCount++
    } else if (accountInsertError.code !== '23505') {
      console.error(`❌ Failed to insert account "${account.name}":`, accountInsertError)
      throw new Error(`Failed to insert account: ${accountInsertError.message}`)
    }
  }
  
  console.log(`✅ Successfully inserted ${successCount}/${accountsToInsert.length} accounts`)
}

    console.log('✅ Initialization successful')

    return NextResponse.json({ 
      message: 'User initialized successfully',
      accountsCreated: accountsToInsert.length,
      categoriesCreated: categoriesToInsert.length,
      success: true
    })
  } catch (error) {
    console.error('❌ Initialization error:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}