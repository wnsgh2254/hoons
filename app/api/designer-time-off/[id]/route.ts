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

    const { data: targetRow, error: targetErr } = await supabase
      .from('designer_time_off')
      .select('id, designer_id, shop_id, start_date, end_date, reason')
      .eq('id', id)
      .maybeSingle();

    if (targetErr) {
      console.error('Error loading time off for delete:', targetErr);
      return NextResponse.json(
        { error: '휴무 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!targetRow) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Comment: Delete exact duplicate rows together so one confirmation fully clears the date state.
    let deleteQuery = supabase
      .from('designer_time_off')
      .delete()
      .eq('designer_id', Number(targetRow.designer_id))
      .eq('start_date', targetRow.start_date)
      .eq('end_date', targetRow.end_date)
      .eq('reason', targetRow.reason ?? null);

    deleteQuery =
      targetRow.shop_id == null
        ? deleteQuery.is('shop_id', null)
        : deleteQuery.eq('shop_id', Number(targetRow.shop_id));

    const { error } = await deleteQuery;

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

