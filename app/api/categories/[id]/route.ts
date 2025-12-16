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

    const { id: categoryId } = await params

    // Verify category exists and belongs to user
    const { data: category } = await supabase
      .from('categories')
      .select('user_id')
      .eq('id', categoryId)
      .single()

    if (!category) {
      return NextResponse.json({ 
        error: 'Category not found' 
      }, { status: 404 })
    }

    if (category.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Cannot delete category from other user' 
      }, { status: 403 })
    }

    // Check if category is being used in transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('categoryId', categoryId)
      .limit(1)

    if (transactions && transactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that is being used in transactions' 
      }, { status: 400 })
    }

    // Hard delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete category' 
    }, { status: 500 })
  }
}
