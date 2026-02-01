import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateBookingAfterDepositPaid, getOrCreateCustomerByNameAndPhone } from "@/lib/data";

export const runtime = "nodejs";

// Comment: Reuse Stripe instance per container (serverless)
let stripeInstance: Stripe | null = null;
function getStripe(secretKey: string): Stripe {
  if (!stripeInstance) stripeInstance = new Stripe(secretKey, { apiVersion: "2026-01-28.clover" });
  return stripeInstance;
}

const ok = () => NextResponse.json({ received: true }, { status: 200 });

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!webhookSecret || !stripeSecretKey) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBuffer = await request.arrayBuffer();
    const body = Buffer.from(rawBuffer).toString("utf-8");
    event = getStripe(stripeSecretKey).webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return ok();
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const bookingIdRaw = paymentIntent.metadata?.booking_id;
  if (!bookingIdRaw) {
    console.warn("Stripe webhook: payment_intent.succeeded missing metadata.booking_id");
    return ok();
  }
  const bookingId = parseInt(bookingIdRaw, 10);
  if (Number.isNaN(bookingId)) {
    console.warn("Stripe webhook: invalid metadata.booking_id", bookingIdRaw);
    return ok();
  }

  const depositPaidDollars = Math.round((paymentIntent.amount ?? 0) / 100);
  const { customer_name: customerName, customer_phone: customerPhone } = paymentIntent.metadata ?? {};

  let customerId: number | undefined;
  if (customerName && customerPhone) {
    try {
      customerId = await getOrCreateCustomerByNameAndPhone(customerName, customerPhone);
    } catch (createErr) {
      console.error("Stripe webhook: get/create customer failed", createErr);
      return NextResponse.json({ error: "Failed to create customer." }, { status: 500 });
    }
  }

  try {
    await updateBookingAfterDepositPaid(bookingId, depositPaidDollars, customerId);
  } catch (updateErr) {
    console.error("Stripe webhook: update booking failed", updateErr);
    return NextResponse.json({ error: "Failed to update booking." }, { status: 500 });
  }

  return ok();
}
