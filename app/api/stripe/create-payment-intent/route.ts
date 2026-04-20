import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { createPublicBooking, getCustomerIdByPhone } from "@/lib/data";
import { cleanupExpiredPendingBookings } from "@/lib/pending-bookings";
import {
  assertPublicBookingSlotAvailable,
  resolveBookingDurationMinutes,
} from "@/lib/server-booking-availability";

// Comment: Create PaymentIntent for in-page Payment Element (Salon de Jessie style)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      shopId,
      designerId,
      serviceId,
      day,
      timeLabel,
      totalAmount,
      depositAmount,
      fullDate,
      customerName,
      customerPhone,
      existingCustomerId,
      serviceName,
      shopName,
      designerName,
      formattedDateLabel,
      durationMinutes: durationMinutesBody,
    } = body;

    if (!shopId || !day || !timeLabel || !depositAmount || !serviceName) {
      return NextResponse.json(
        { error: "Missing required fields for payment intent." },
        { status: 400 },
      );
    }

    const dateStr = typeof fullDate === "string" ? fullDate : null;
    if (!dateStr) {
      return NextResponse.json(
        { error: "Missing appointment date." },
        { status: 400 },
      );
    }

    const durationMinutes = await resolveBookingDurationMinutes(supabase, {
      durationMinutes:
        typeof durationMinutesBody === "number" ? durationMinutesBody : null,
      serviceId: serviceId != null ? Number(serviceId) : null,
    });

    await cleanupExpiredPendingBookings(supabase, {
      date: dateStr,
      shopId: Number(shopId),
      designerId: designerId != null ? Number(designerId) : null,
    });

    const slotCheck = await assertPublicBookingSlotAvailable(supabase, {
      designerId: designerId != null ? Number(designerId) : null,
      shopId: Number(shopId),
      date: dateStr,
      timeLabel: String(timeLabel),
      durationMinutes,
    });
    if (!slotCheck.ok) {
      return NextResponse.json({ error: slotCheck.message }, { status: 409 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe secret key is not configured on the server." },
        { status: 500 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });

    // Comment: Only look up existing customer; new customer is created in webhook after deposit is paid
    let customerId: number | null = null;
    if (existingCustomerId) {
      const { data: existingById } = await supabase
        .from("customers")
        .select("id")
        .eq("id", existingCustomerId)
        .maybeSingle();
      if (existingById?.id) customerId = existingById.id;
    }
    if (!customerId && customerPhone) {
      customerId = await getCustomerIdByPhone(customerPhone);
    }

    const booking = await createPublicBooking({
      shopId: Number(shopId),
      designerId: designerId != null ? Number(designerId) : null,
      serviceId: serviceId != null ? Number(serviceId) : null,
      day: Number(day),
      timeLabel,
      totalAmount: typeof totalAmount === "number" ? totalAmount : null,
      depositAmount: typeof depositAmount === "number" ? depositAmount : null,
      fullDate: typeof fullDate === "string" ? fullDate : undefined,
      customerId: customerId,
      customServiceName: serviceName,
      customServiceDuration: durationMinutes > 0 ? durationMinutes : null,
    });

    const amountInCents =
      typeof depositAmount === "number"
        ? Math.round(depositAmount * 100)
        : 0;

    if (!amountInCents || amountInCents <= 0) {
      return NextResponse.json(
        { error: "Invalid deposit amount for payment." },
        { status: 400 },
      );
    }

    // Comment: Card + Google Pay (Wallets). Exclude Zip, Klarna. Requires: 1) Dashboard → Payment methods → Wallets ON, 2) Register domain at dashboard.stripe.com/settings/payment_method_domains
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
      excluded_payment_method_types: ["klarna", "zip"],
      payment_method_options: {
        card: { request_three_d_secure: "automatic" },
      },
      metadata: {
        booking_id: String(booking.id),
        deposit_amount: amountInCents.toString(),
        service_name: String(serviceName),
        shop_name: String(shopName || "HAEYOOM"),
        designer_name: String(designerName || ""),
        formatted_date: String(formattedDateLabel || fullDate || ""),
        time_label: String(timeLabel),
        // Comment: For new customers; webhook creates customer and sets booking.customer_id after deposit paid
        ...(customerId == null && customerName && customerPhone
          ? { customer_name: String(customerName).trim(), customer_phone: String(customerPhone).trim() }
          : {}),
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: "Failed to create payment intent." },
        { status: 500 },
      );
    }

    // Comment: Persist PI id for admin cancel refunds (webhook also sets this on success)
    const { error: piUpdateError } = await supabase
      .from("bookings")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking.id);
    if (piUpdateError) {
      console.warn("Could not save stripe_payment_intent_id on booking:", piUpdateError.message);
    }

    return NextResponse.json(
      {
        client_secret: paymentIntent.client_secret,
        booking_id: booking.id,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to create payment intent. Please try again.",
      },
      { status: 500 },
    );
  }
}
