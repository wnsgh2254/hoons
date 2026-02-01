import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateBookingAfterDepositPaid, getOrCreateCustomerByNameAndPhone } from "@/lib/data";

// Comment: Stripe webhook – do not parse body before verify; use raw text
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error("Stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set.");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 },
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-01-28.clover",
  });

  let event: Stripe.Event;

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header." },
        { status: 400 },
      );
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json(
      { error: "Webhook signature verification failed." },
      { status: 400 },
    );
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingIdRaw = paymentIntent.metadata?.booking_id;
    if (!bookingIdRaw) {
      console.warn("Stripe webhook: payment_intent.succeeded missing metadata.booking_id");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const bookingId = parseInt(bookingIdRaw, 10);
    if (Number.isNaN(bookingId)) {
      console.warn("Stripe webhook: invalid metadata.booking_id", bookingIdRaw);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Comment: amount is in cents (AUD)
    const amountCents = paymentIntent.amount ?? 0;
    const depositPaidDollars = Math.round(amountCents) / 100;

    const customerName = paymentIntent.metadata?.customer_name;
    const customerPhone = paymentIntent.metadata?.customer_phone;
    let customerId: number | undefined;
    if (customerName && customerPhone) {
      try {
        customerId = await getOrCreateCustomerByNameAndPhone(customerName, customerPhone);
      } catch (createErr) {
        console.error("Stripe webhook: failed to get/create customer after deposit paid", createErr);
        return NextResponse.json(
          { error: "Failed to create customer." },
          { status: 500 },
        );
      }
    }

    try {
      await updateBookingAfterDepositPaid(bookingId, depositPaidDollars, customerId);
    } catch (updateErr) {
      console.error("Stripe webhook: failed to update booking after deposit paid", updateErr);
      return NextResponse.json(
        { error: "Failed to update booking." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
