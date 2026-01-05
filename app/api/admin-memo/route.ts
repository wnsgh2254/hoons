import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch the admin memo
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admin_memo')
      .select('content')
      .eq('id', 1)
      .single();

    if (error) {
      // If row doesn't exist, return empty string
      if (error.code === 'PGRST116') {
        return NextResponse.json({ content: '' });
      }
      throw error;
    }

    return NextResponse.json({ content: data?.content || '' });
  } catch (error: any) {
    console.error('Error fetching admin memo:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin memo' },
      { status: 500 }
    );
  }
}

// PATCH: Update the admin memo
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    // Use upsert to insert or update the single row
    const { data, error } = await supabase
      .from('admin_memo')
      .upsert({ id: 1, content }, { onConflict: 'id' })
      .select('content')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ content: data?.content || '' });
  } catch (error: any) {
    console.error('Error updating admin memo:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update admin memo' },
      { status: 500 }
    );
  }
}
