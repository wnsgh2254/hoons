import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  updateBookingAfterDepositPaid,
  getOrCreateCustomerByNameAndPhone,
  createPublicBooking,
} from "@/lib/data";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Comment: Reuse Stripe instance per container (serverless)
let stripeInstance: Stripe | null = null;
function getStripe(secretKey: string): Stripe {
  if (!stripeInstance) stripeInstance = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });
  return stripeInstance;
}

const ok = () => NextResponse.json({ received: true }, { status: 200 });

export async function POST(request: NextRequest) {
  const webhookSecretPrimary = process.env.STRIPE_WEBHOOK_SECRET2?.trim();
  const webhookSecretFallback = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if ((!webhookSecretPrimary && !webhookSecretFallback) || !stripeSecretKey) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET2/STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not set.");
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
    const webhookSecrets = [webhookSecretPrimary, webhookSecretFallback].filter((v): v is string => !!v);
    let verifiedEvent: Stripe.Event | null = null;
    let lastError: unknown = null;

    for (const secret of webhookSecrets) {
      try {
        verifiedEvent = getStripe(stripeSecretKey).webhooks.constructEvent(body, signature, secret);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!verifiedEvent) {
      throw lastError ?? new Error("No webhook secret could verify this event.");
    }
    event = verifiedEvent;
  } catch (err: unknown) {
    console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return ok();
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const metadata = paymentIntent.metadata ?? {};
  let bookingId: number | null = null;
  const bookingIdRaw = metadata.booking_id;
  if (bookingIdRaw) {
    const parsed = parseInt(bookingIdRaw, 10);
    if (!Number.isNaN(parsed)) bookingId = parsed;
  }

  if (!bookingId) {
    // Idempotency: if we already created/updated a booking for this PI, reuse it.
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .maybeSingle();
    if (existing?.id) {
      bookingId = Number(existing.id);
    }
  }

  // Comment: Stripe amount is in cents; store exact paid amount in dollars (no integer rounding).
  const depositPaidDollars = Number(((paymentIntent.amount ?? 0) / 100).toFixed(2));
  const { customer_name: customerName, customer_phone: customerPhone } = metadata ?? {};

  let customerId: number | undefined;
  if (metadata.customer_id) {
    const parsedCustomerId = parseInt(metadata.customer_id, 10);
    if (!Number.isNaN(parsedCustomerId)) customerId = parsedCustomerId;
  }

  if (customerId == null && customerName && customerPhone) {
    try {
      customerId = await getOrCreateCustomerByNameAndPhone(customerName, customerPhone);
    } catch (createErr) {
      console.error("Stripe webhook: get/create customer failed", createErr);
      return NextResponse.json({ error: "Failed to create customer." }, { status: 500 });
    }
  }

  if (!bookingId) {
    const shopId = parseInt(metadata.shop_id || "", 10);
    const day = parseInt(metadata.day || "", 10);
    const timeLabel = metadata.time_label;
    if (!shopId || !day || !timeLabel) {
      console.warn("Stripe webhook: missing booking metadata to create booking", metadata);
      return ok();
    }

    try {
      const created = await createPublicBooking({
        shopId,
        designerId: metadata.designer_id ? Number(metadata.designer_id) : null,
        serviceId: metadata.service_id ? Number(metadata.service_id) : null,
        day,
        timeLabel,
        totalAmount: metadata.total_amount ? Number(metadata.total_amount) : null,
        depositAmount: depositPaidDollars,
        fullDate: metadata.full_date || undefined,
        customerId,
        customServiceName: metadata.service_name || null,
        customServiceDuration: metadata.duration_minutes ? Number(metadata.duration_minutes) : null,
        status: "confirmed",
      });
      bookingId = Number(created.id);
    } catch (createErr) {
      console.error("Stripe webhook: create booking failed", createErr);
      return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
    }
  }
  if (!bookingId) {
    console.warn("Stripe webhook: booking id missing after processing");
    return ok();
  }

  try {
    await updateBookingAfterDepositPaid(
      bookingId,
      depositPaidDollars,
      customerId,
      paymentIntent.id,
    );
  } catch (updateErr) {
    console.error("Stripe webhook: update booking failed", updateErr);
    return NextResponse.json({ error: "Failed to update booking." }, { status: 500 });
  }

  // Comment: Send booking confirmation SMS through Supabase Edge Function
  try {
    await invokeBookingConfirmationEdge(bookingId);
  } catch (err) {
    console.error("Stripe webhook: SMS confirmation error:", err);
  }

  return ok();
}

// Comment: Trigger Supabase Edge Function that handles booking confirmation SMS
async function invokeBookingConfirmationEdge(bookingId: number) {
  const projectUrl = process.env.SUPABASE_URL?.trim() || "https://akzipcsakzuqpknkrjnb.supabase.co";
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY for Edge Function invoke.");
  }

  const res = await fetch(`${projectUrl}/functions/v1/booking-confirmation-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`booking-confirmation-sms failed (${res.status}): ${text}`);
  }

  console.log(`Stripe webhook: booking-confirmation-sms ok for booking ${bookingId}: ${text}`);
}
