import { supabase } from '@/lib/supabase';
import { calculatePolicyRefundAmount } from '@/lib/cancellation-policy';
import { refundStripeDepositForBooking } from '@/lib/refund-stripe-deposit';
import { isCancelledBookingStatus } from '@/lib/booking-status';

export type CancelBookingResult =
  | { ok: true; booking: any; alreadyCancelled: boolean }
  | { ok: false; status: number; error: string };

// Comment: Shared by both the admin cancel route and the customer self-cancel route, so the two
// stay in lockstep — same soft-cancel status, same cancellation-policy refund calculation.
export async function cancelBookingWithPolicyRefund(params: {
  bookingId: number;
  cancellationReason?: string | null;
  applyRefund: boolean;
  cancelledStatus?: string;
}): Promise<CancelBookingResult> {
  const { bookingId, cancellationReason, applyRefund, cancelledStatus = 'CANCELLED' } = params;

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { ok: false, status: 404, error: '예약을 찾을 수 없습니다.' };
  }

  if (isCancelledBookingStatus(booking.status)) {
    return { ok: true, booking, alreadyCancelled: true };
  }

  const updates: Record<string, any> = { status: cancelledStatus };

  if (applyRefund) {
    const depositPaid = Math.max(0, Number(booking.deposit_paid) || 0);
    const alreadyRefunded = booking.deposit_refunded_at != null;
    const policyRefund = calculatePolicyRefundAmount(
      depositPaid,
      typeof booking.booking_date === 'string' ? booking.booking_date : null,
    );

    if (!alreadyRefunded && depositPaid > 0) {
      const result = await refundStripeDepositForBooking({
        bookingId,
        stripePaymentIntentId: booking.stripe_payment_intent_id,
        depositPaidAud: depositPaid,
        refundAmountAud: policyRefund.refundAmountAud,
      });

      if (!result.ok) {
        return {
          ok: false,
          status: 502,
          error: result.error || 'Stripe 환불에 실패했습니다. 예약은 취소되지 않았습니다.',
        };
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
            customer_id: booking.customer_id || null,
            shop_id: booking.shop_id || null,
            total_amount: refundedAmountAud,
            point_deduction: 0,
            cash_amount: 0,
            card_amount: refundedAmountAud,
            bank_transfer_amount: 0,
            memo: `Booking #${bookingId} deposit refund (${Math.round(policyRefund.refundRate * 100)}%)`,
            refund_date: new Date().toISOString().split('T')[0],
            refund_time: new Date().toTimeString().slice(0, 5),
          })
          .select('id')
          .single();

        if (refundHeaderError) {
          console.error('Failed to create deposit refund header:', refundHeaderError);
        } else if (refundHeader?.id) {
          const { error: refundItemError } = await supabase.from('refund_items').insert({
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

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    return { ok: false, status: 500, error: updateError.message || '예약 취소에 실패했습니다.' };
  }

  let finalBooking = updated;

  // Comment: cancellation_reason은 선택적 컬럼이라 별도 업데이트 시도 — 컬럼이 없어도 메인 취소는 성공해야 함.
  if (cancellationReason !== undefined) {
    const { data: reasonUpdated, error: reasonError } = await supabase
      .from('bookings')
      .update({ cancellation_reason: cancellationReason })
      .eq('id', bookingId)
      .select()
      .single();

    if (!reasonError && reasonUpdated) {
      finalBooking = reasonUpdated;
    } else if (reasonError) {
      console.warn('[booking-cancellation] cancellation_reason update failed:', reasonError.message);
    }
  }

  return { ok: true, booking: finalBooking, alreadyCancelled: false };
}
