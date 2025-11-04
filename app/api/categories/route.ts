import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = createClient() 

    
    const { data: categories, error } = await (await supabase)
      .from('categories') 
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        categories: []
      }, { status: 500 })
    }

    
    return NextResponse.json({ 
      categories: categories || [],
      success: true
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      categories: []
    }, { status: 500 })
  }
}