import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe secret key is not configured.");
  }
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export type RefundDepositResult =
  | { ok: true; refundId: string; refundedAmountAud: number }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

/**
 * Refund the card deposit PaymentIntent for a booking.
 * Uses stored stripe_payment_intent_id when present; otherwise Stripe metadata search by booking_id.
 */
export async function refundStripeDepositForBooking(params: {
  bookingId: number;
  stripePaymentIntentId: string | null | undefined;
  depositPaidAud: number;
  refundAmountAud?: number | null;
}): Promise<RefundDepositResult> {
  const { bookingId, depositPaidAud } = params;
  if (!Number.isFinite(depositPaidAud) || depositPaidAud <= 0) {
    return { ok: true, skipped: true, reason: "No deposit was recorded as paid." };
  }

  const stripe = getStripe();
  let piId = params.stripePaymentIntentId?.trim() || null;

  if (!piId) {
    try {
      const search = await stripe.paymentIntents.search({
        query: `metadata['booking_id']:'${bookingId}'`,
        limit: 10,
      });
      const succeeded = search.data
        .filter((pi) => pi.status === "succeeded")
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
      if (succeeded.length === 0) {
        return {
          ok: false,
          error:
            "Stripe에서 이 예약의 결제(PaymentIntent)를 찾지 못했습니다. Stripe 대시보드에서 수동 환불이 필요할 수 있습니다.",
        };
      }
      piId = succeeded[0].id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Stripe search failed.";
      return { ok: false, error: msg };
    }
  }

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load PaymentIntent.";
    return { ok: false, error: msg };
  }

  if (pi.status !== "succeeded") {
    return {
      ok: false,
      error: `카드 예약금이 환불 가능한 상태가 아닙니다 (상태: ${pi.status}).`,
    };
  }

  const received = pi.amount_received ?? 0;
  // Comment: amount_refunded exists on PaymentIntent in Stripe API; SDK types may omit it
  const piWithRefunded = pi as unknown as { amount_refunded?: number };
  const alreadyRefunded =
    typeof piWithRefunded.amount_refunded === "number" ? piWithRefunded.amount_refunded : 0;
  if (alreadyRefunded >= received) {
    return { ok: true, skipped: true, reason: "Deposit was already fully refunded in Stripe." };
  }

  const requestedRefundAud = Math.max(
    0,
    Number(params.refundAmountAud ?? depositPaidAud) || 0,
  );
  if (requestedRefundAud <= 0) {
    return { ok: true, skipped: true, reason: "Policy refund amount is zero." };
  }

  const remainingCents = Math.max(0, received - alreadyRefunded);
  const requestedRefundCents = Math.round(requestedRefundAud * 100);
  const refundCents = Math.min(requestedRefundCents, remainingCents);

  if (refundCents <= 0) {
    return { ok: true, skipped: true, reason: "No refundable deposit remains in Stripe." };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: piId,
      amount: refundCents,
    });
    return { ok: true, refundId: refund.id, refundedAmountAud: refundCents / 100 };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = err?.code ?? "";
    const message = err?.message ?? "";
    if (
      code === "charge_already_refunded" ||
      message.toLowerCase().includes("already been refunded")
    ) {
      return { ok: true, skipped: true, reason: "Already refunded in Stripe." };
    }
    return { ok: false, error: message || "Stripe refund failed." };
  }
}
