import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Comment: DELETE - Delete a time off record
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: '유효하지 않은 휴무 ID 입니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('designer_time_off')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting time off:', error);
      return NextResponse.json(
        { error: '휴무 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in designer-time-off DELETE route:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

