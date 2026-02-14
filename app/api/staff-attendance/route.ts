import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

// Comment: Require manager or director role; returns 403 response or null if allowed
async function requireManagerOrDirector(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_session');
  if (!sessionCookie) {
    return NextResponse.json(
      { error: '출/퇴근 관리는 manager, director 직급만 사용할 수 있습니다.' },
      { status: 403 }
    );
  }
  let session: { role?: string; expiresAt?: string };
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.json(
      { error: '출/퇴근 관리는 manager, director 직급만 사용할 수 있습니다.' },
      { status: 403 }
    );
  }
  const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null;
  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.json(
      { error: '출/퇴근 관리는 manager, director 직급만 사용할 수 있습니다.' },
      { status: 403 }
    );
  }
  const role = (session.role || '').toLowerCase();
  if (role !== 'manager' && role !== 'director') {
    return NextResponse.json(
      { error: '출/퇴근 관리는 manager, director 직급만 사용할 수 있습니다.' },
      { status: 403 }
    );
  }
  return null;
}

// Comment: Get current time in Australia/Sydney as HH:mm
function getSydneyTimeNow(): string {
  const now = new Date();
  const sydney = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const h = sydney.getHours();
  const m = sydney.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

// Comment: GET - Fetch attendance for a designer on a date (manager/director only)
export async function GET(request: NextRequest) {
  try {
    const forbidden = await requireManagerOrDirector();
    if (forbidden) return forbidden;

    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designer_id');
    const date = searchParams.get('date');

    if (!designerId || !date) {
      return NextResponse.json(
        { error: 'designer_id and date are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('designer_id', Number(designerId))
      .eq('work_date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching staff attendance:', error);
      return NextResponse.json(
        { error: '출퇴근 기록 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ attendance: data }, { status: 200 });
  } catch (err) {
    console.error('Error in staff-attendance GET:', err);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Comment: POST - Clock-in, clock-out, or set manual total (upsert) (manager/director only)
export async function POST(request: NextRequest) {
  try {
    const forbidden = await requireManagerOrDirector();
    if (forbidden) return forbidden;

    const body = await request.json();
    const { designer_id, work_date, action, manual_total_minutes } = body;

    if (!designer_id || !work_date) {
      return NextResponse.json(
        { error: 'designer_id and work_date are required.' },
        { status: 400 }
      );
    }

    const designerId = Number(designer_id);
    const workDateStr = String(work_date).slice(0, 10); // YYYY-MM-DD

    if (action === 'set_manual_total') {
      const value = manual_total_minutes == null ? null : Number(manual_total_minutes);
      if (value != null && (value < 0 || !Number.isFinite(value))) {
        return NextResponse.json(
          { error: '총 근무 시간은 0 이상의 숫자여야 합니다.' },
          { status: 400 }
        );
      }
      const { data: existing } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('designer_id', designerId)
        .eq('work_date', workDateStr)
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('staff_attendance')
          .update({
            manual_total_minutes: value === '' || value == null ? null : Math.round(value),
            updated_at: new Date().toISOString(),
          })
          .eq('designer_id', designerId)
          .eq('work_date', workDateStr)
          .select()
          .single();
        if (updateError) {
          console.error('Error updating manual total:', updateError);
          return NextResponse.json(
            { error: '총 근무 시간 수정에 실패했습니다.' },
            { status: 500 }
          );
        }
        return NextResponse.json({ attendance: updated }, { status: 200 });
      }

      const { data: inserted, error: insertError } = await supabase
        .from('staff_attendance')
        .insert({
          designer_id: designerId,
          work_date: workDateStr,
          manual_total_minutes: value === '' || value == null ? null : Math.round(value),
        })
        .select()
        .single();
      if (insertError) {
        console.error('Error inserting attendance for manual total:', insertError);
        return NextResponse.json(
          { error: '총 근무 시간 저장에 실패했습니다.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ attendance: inserted }, { status: 200 });
    }

    if (action !== 'clock_in' && action !== 'clock_out') {
      return NextResponse.json(
        { error: 'action must be clock_in, clock_out, or set_manual_total.' },
        { status: 400 }
      );
    }

    const timeNow = getSydneyTimeNow();

    const { data: existing } = await supabase
      .from('staff_attendance')
      .select('id, clock_in, clock_out')
      .eq('designer_id', designerId)
      .eq('work_date', workDateStr)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (action === 'clock_in') updates.clock_in = timeNow;
      else updates.clock_out = timeNow;
      const { data: updated, error: updateError } = await supabase
        .from('staff_attendance')
        .update(updates)
        .eq('designer_id', designerId)
        .eq('work_date', workDateStr)
        .select()
        .single();
      if (updateError) {
        console.error('Error updating attendance:', updateError);
        return NextResponse.json(
          { error: action === 'clock_in' ? '출근 기록에 실패했습니다.' : '퇴근 기록에 실패했습니다.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ attendance: updated }, { status: 200 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('staff_attendance')
      .insert({
        designer_id: designerId,
        work_date: workDateStr,
        clock_in: action === 'clock_in' ? timeNow : null,
        clock_out: action === 'clock_out' ? timeNow : null,
      })
      .select()
      .single();
    if (insertError) {
      console.error('Error inserting attendance:', insertError);
      return NextResponse.json(
        { error: action === 'clock_in' ? '출근 기록에 실패했습니다.' : '퇴근 기록에 실패했습니다.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ attendance: inserted }, { status: 200 });
  } catch (err) {
    console.error('Error in staff-attendance POST:', err);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
