import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's categories (both default and custom)
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.log('Database error:', error)
      return NextResponse.json({ 
        error: error.message, 
        categories: [],
      }, { status: 500 })
    }

    return NextResponse.json({ 
      categories: categories || [], 
      success: true 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch categories',
      categories: [] 
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

    const { name, type, icon, color } = await request.json()
    // Validate input
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert([{
        name,
        type: type.toUpperCase(),
        icon: icon || 'circle',
        color: color || '#6B7280',
        is_default: false, // User custom category
        user_id: user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Database error creating category:', error)
      return NextResponse.json({ 
        error: error.message || 'Database error' 
      }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Failed to create category:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create category' 
    }, { status: 500 })
  }
}
