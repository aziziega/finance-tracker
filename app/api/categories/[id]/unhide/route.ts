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

    const { id: categoryId } = await params

    // ✅ Remove dari hidden_categories
    const { error } = await supabase
      .from('hidden_categories')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId)

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      message: 'Category restored successfully'
    })
  } catch (error) {
    console.error('Restore category error:', error)
    return NextResponse.json({ 
      error: 'Failed to restore category' 
    }, { status: 500 })
  }
}
