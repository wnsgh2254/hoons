import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculatePolicyRefundAmount } from '@/lib/cancellation-policy';
import { refundStripeDepositForBooking } from '@/lib/refund-stripe-deposit';
import { isCancelledBookingStatus } from '@/lib/booking-status';

// Comment: Update a single booking (date/time/status etc.)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log('🔵 API PATCH 요청 받음:', { id });
    
    if (!id) {
      console.error('❌ 유효하지 않은 예약 ID');
      return NextResponse.json({ error: '유효하지 않은 예약 ID 입니다.' }, { status: 400 });
    }

    const body = await request.json();
    console.log('📥 요청 body:', body);
    const updates: any = {};

    // Comment: Get current booking to check end time
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('booking_time, service_id, custom_service_duration, service:service_id(duration_minutes)')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const bookingTime = typeof body.booking_time === 'string' ? body.booking_time : currentBooking?.booking_time;
    const serviceId = body.service_id !== undefined ? (body.service_id === null ? null : Number(body.service_id)) : currentBooking?.service_id;
    const customDuration = typeof body.custom_service_duration === 'number' || typeof body.custom_service_duration === 'string' 
      ? Number(body.custom_service_duration) 
      : currentBooking?.custom_service_duration;

    // Comment: Check if booking end time exceeds 21:00 (9 PM)
    if (bookingTime) {
      const [startHour, startMin] = bookingTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      let durationMinutes = 60; // Default 1 hour

      if (customDuration && customDuration > 0) {
        durationMinutes = customDuration;
      } else if (serviceId) {
        const service = currentBooking?.service as any;
        if (service?.duration_minutes) {
          durationMinutes = service.duration_minutes;
        } else if (body.service_id !== undefined) {
          // Comment: Fetch service if it's being updated
          const { data: serviceData } = await supabase
            .from('services')
            .select('duration_minutes')
            .eq('id', serviceId)
            .single();
          if (serviceData?.duration_minutes) {
            durationMinutes = serviceData.duration_minutes;
          }
        }
      }

      const endMinutes = startMinutes + durationMinutes;
      const endHour = Math.floor(endMinutes / 60);

      // Comment: If end time exceeds 21:00, return error
      if (endHour > 21 || (endHour === 21 && (endMinutes % 60) > 0)) {
        return NextResponse.json(
          { error: `예약 종료 시간이 21시를 넘을 수 없습니다. 시작 시간 ${startHour}:${String(startMin).padStart(2, '0')}에 ${durationMinutes}분 예약은 불가능합니다.` },
          { status: 400 }
        );
      }
    }

    if (typeof body.booking_date === 'string') {
      updates.booking_date = body.booking_date;
    }
    if (typeof body.booking_time === 'string') {
      updates.booking_time = body.booking_time;
    }
    if (typeof body.status === 'string') {
      updates.status = body.status;
      console.log('✅ 상태 업데이트 추가:', { status: body.status });
    }
    if (typeof body.total_amount === 'number' || typeof body.total_amount === 'string') {
      updates.total_amount = Number(body.total_amount);
    }
    if (typeof body.deposit_amount === 'number' || typeof body.deposit_amount === 'string') {
      updates.deposit_amount = Number(body.deposit_amount);
    }
    if (body.service_id === null) {
      updates.service_id = null;
    } else if (typeof body.service_id === 'number' || typeof body.service_id === 'string') {
      updates.service_id = Number(body.service_id);
    }
    if (typeof body.custom_service_name === 'string') {
      updates.custom_service_name = body.custom_service_name;
    }
    if (typeof body.custom_service_duration === 'number' || typeof body.custom_service_duration === 'string') {
      updates.custom_service_duration = Number(body.custom_service_duration);
    }
    if (typeof body.memo === 'string' || body.memo === null) {
      updates.memo = body.memo === null ? null : body.memo;
    }
    if (typeof body.color_label === 'string' || body.color_label === null) {
      updates.color_label = body.color_label;
    }
    if (body.shop_id !== undefined) {
      if (body.shop_id === null) {
        updates.shop_id = null;
      } else if (typeof body.shop_id === 'number' || typeof body.shop_id === 'string') {
        updates.shop_id = Number(body.shop_id);
      }
    }
    if (body.designer_id !== undefined) {
      if (body.designer_id === null) {
        updates.designer_id = null;
      } else if (typeof body.designer_id === 'number' || typeof body.designer_id === 'string') {
        updates.designer_id = Number(body.designer_id);
      }
    }

    // Comment: Optional Stripe refund when admin cancels a booking with a paid card deposit
    const refundStripeDeposit =
      body.refund_stripe_deposit === true || body.refund_stripe_deposit === 'true';
    const statusRaw = typeof body.status === 'string' ? body.status.trim() : '';
    const isCancelling = isCancelledBookingStatus(statusRaw);

    if (refundStripeDeposit && isCancelling) {
      // Comment: Use * so missing optional columns (before SQL migration) does not break the query.
      // Selecting unknown column names makes PostgREST return an error we were wrongly mapping to 404.
      const { data: refundRow, error: refundFetchErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (refundFetchErr) {
        console.error('Refund prefetch failed:', refundFetchErr);
        return NextResponse.json(
          { error: refundFetchErr.message || '예약을 불러오지 못했습니다.' },
          { status: 500 },
        );
      }
      if (!refundRow) {
        return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
      }

      const depositPaid = Math.max(0, Number((refundRow as any).deposit_paid) || 0);
      const alreadyRefundedDb = (refundRow as any).deposit_refunded_at != null;
      const policyRefund = calculatePolicyRefundAmount(
        depositPaid,
        typeof (refundRow as any).booking_date === 'string' ? (refundRow as any).booking_date : null,
      );

      if (!alreadyRefundedDb && depositPaid > 0) {
        const result = await refundStripeDepositForBooking({
          bookingId: Number(id),
          stripePaymentIntentId: (refundRow as any).stripe_payment_intent_id,
          depositPaidAud: depositPaid,
          refundAmountAud: policyRefund.refundAmountAud,
        });

        if (!result.ok) {
          return NextResponse.json(
            {
              error:
                result.error ||
                'Stripe 환불에 실패했습니다. 예약은 취소되지 않았습니다.',
            },
            { status: 502 },
          );
        }

        let refundedAmountAud = 0;
        if ('skipped' in result && result.skipped) {
          if (
            result.reason.includes('fully refunded') ||
            result.reason.includes('Already refunded')
          ) {
            updates.deposit_refunded_at = new Date().toISOString();
          }
        } else if ('refundId' in result) {
          updates.deposit_refunded_at = new Date().toISOString();
          updates.stripe_refund_id = result.refundId;
          refundedAmountAud = Math.max(
            0,
            Number((result as any).refundedAmountAud || policyRefund.refundAmountAud || 0),
          );
        }

        if (refundedAmountAud > 0) {
          const { data: refundHeader, error: refundHeaderError } = await supabase
            .from('refunds')
            .insert({
              customer_id: (refundRow as any).customer_id || null,
              shop_id: (refundRow as any).shop_id || null,
              total_amount: refundedAmountAud,
              point_deduction: 0,
              cash_amount: 0,
              card_amount: refundedAmountAud,
              bank_transfer_amount: 0,
              memo: `Booking #${id} deposit refund (${Math.round(policyRefund.refundRate * 100)}%)`,
              refund_date: new Date().toISOString().split('T')[0],
              refund_time: new Date().toTimeString().slice(0, 5),
            })
            .select('id')
            .single();

          if (refundHeaderError) {
            console.error('Failed to create deposit refund header:', refundHeaderError);
          } else if (refundHeader?.id) {
            const { error: refundItemError } = await supabase
              .from('refund_items')
              .insert({
                refund_id: refundHeader.id,
                item_type: 'deposit',
                item_name: 'Booking deposit refund',
                unit_price: refundedAmountAud,
                quantity: 1,
                amount: refundedAmountAud,
                manager: null,
              });

            if (refundItemError) {
              console.error('Failed to create deposit refund item:', refundItemError);
            }
          }
        }
      }
    }

    // Comment: cancellation_reason 필드는 선택적 (컬럼이 없을 수도 있음)
    let cancellationReason: string | null | undefined = undefined;
    if (body.cancellation_reason !== undefined) {
      if (typeof body.cancellation_reason === 'string' || body.cancellation_reason === null) {
        cancellationReason = body.cancellation_reason === null ? null : body.cancellation_reason;
      }
    }

    if (Object.keys(updates).length === 0 && cancellationReason === undefined) {
      console.warn('⚠️ 업데이트할 필드가 없습니다.');
      return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 });
    }

    console.log('📤 Supabase 업데이트 실행:', { id, updates, cancellationReason });
    console.log('📋 업데이트할 status 값:', updates.status);
    
    // Comment: cancellation_reason을 제외한 업데이트 먼저 실행
    let { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase 업데이트 에러:', error);
      console.error('❌ 에러 상세:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ 
        error: error.message || '예약 수정에 실패했습니다.',
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    // 업데이트 후 실제 저장된 값 확인
    if (data) {
      console.log('✅ 업데이트 후 실제 저장된 status:', data.status);
      if (updates.status && data.status !== updates.status) {
        console.error('⚠️ 경고: 요청한 status와 저장된 status가 다릅니다!', {
          requested: updates.status,
          saved: data.status
        });
      }
    }

    // Comment: cancellation_reason이 있으면 별도로 업데이트 시도 (컬럼이 있을 경우)
    if (cancellationReason !== undefined && data) {
      const { data: updateData, error: updateError } = await supabase
        .from('bookings')
        .update({ cancellation_reason: cancellationReason })
        .eq('id', id)
        .select()
        .single();
      
      if (!updateError && updateData) {
        data = updateData;
        console.log('✅ cancellation_reason 업데이트 성공');
      } else if (updateError) {
        // Comment: cancellation_reason 컬럼이 없어도 메인 업데이트는 성공했으므로 경고만 로깅
        console.warn('⚠️ cancellation_reason 업데이트 실패 (컬럼이 없을 수 있음):', updateError.message);
      }
    }

    console.log('✅ Supabase 업데이트 성공:', data);
    console.log('📋 업데이트된 예약 상태:', data?.status);
    console.log('📋 전체 업데이트된 데이터:', JSON.stringify(data, null, 2));
    return NextResponse.json({ booking: data }, { status: 200 });
  } catch (error) {
    console.error('Error in appointment PATCH route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// Comment: Delete a single booking
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: '유효하지 않은 예약 ID 입니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) {
      console.error('Error deleting booking:', error);
      return NextResponse.json({ error: '예약 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in appointment DELETE route:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}


