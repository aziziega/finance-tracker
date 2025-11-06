import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categoryId = params.id

    // ✅ Check if category is system category
    const { data: category } = await supabase
      .from('categories')
      .select('is_system, user_id')
      .eq('id', categoryId)
      .single()

    if (category?.is_system) {
      return NextResponse.json({ 
        error: 'Cannot delete system category' 
      }, { status: 403 })
    }

    if (category?.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Cannot delete category from other user' 
      }, { status: 403 })
    }

    // ✅ Check if category is being used in transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('categoryid', categoryId)
      .limit(1)

    if (transactions && transactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that is being used in transactions' 
      }, { status: 400 })
    }

    // ✅ Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id) // Double check ownership

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to delete category' 
    }, { status: 500 })
  }
}