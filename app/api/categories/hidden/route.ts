import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Ambil hidden categories dengan join ke tabel categories
    const { data: hiddenCategories, error } = await supabase
      .from('hidden_categories')
      .select(`
        id,
        category_id,
        hidden_at,
        categories (
          id,
          name,
          type,
          icon,
          color,
          is_system
        )
      `)
      .eq('user_id', user.id)
      .order('hidden_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        categories: [] 
      }, { status: 500 })
    }

    // ✅ Format data untuk kemudahan penggunaan
    const formattedCategories = (hiddenCategories || []).map(item => ({
      hidden_id: item.id,
      hidden_at: item.hidden_at,
      category: item.categories
    }))

    return NextResponse.json({ 
      categories: formattedCategories,
      success: true 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch hidden categories',
      categories: [] 
    }, { status: 500 })
  }
}
