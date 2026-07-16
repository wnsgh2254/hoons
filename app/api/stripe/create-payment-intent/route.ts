import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { getCustomerIdByNameAndPhone, isValidAuMobilePhone, createPublicBooking } from "@/lib/data";
import { cleanupExpiredPendingBookings } from "@/lib/pending-bookings";
import {
  assertPublicBookingSlotAvailable,
  resolveBookingDurationMinutes,
} from "@/lib/server-booking-availability";
import { isPublicBookingDateAllowed } from "@/lib/utils/appointment-utils";

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

    if (!customerName || !String(customerName).trim() || !customerPhone || !String(customerPhone).trim()) {
      return NextResponse.json(
        { error: "Customer name and mobile number are required." },
        { status: 400 },
      );
    }

    if (!isValidAuMobilePhone(customerPhone)) {
      return NextResponse.json(
        { error: "Mobile number must start with 04 and be 10 digits." },
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

    if (!isPublicBookingDateAllowed(dateStr)) {
      return NextResponse.json(
        { error: "Appointment date must be within the allowed booking window." },
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
    if (!customerId && customerName && customerPhone) {
      customerId = await getCustomerIdByNameAndPhone(customerName, customerPhone);
    }

    // Comment: Hold the slot for the duration of checkout — without this, a second checkout
    // (or an admin booking) created before the Payment Element completes could pass the
    // same slotCheck above and end up double-booked once both are confirmed.
    let pendingBookingId: number | null = null;
    try {
      const pendingBooking = await createPublicBooking({
        shopId: Number(shopId),
        designerId: designerId != null ? Number(designerId) : null,
        serviceId: serviceId != null ? Number(serviceId) : null,
        day: Number(day),
        timeLabel: String(timeLabel),
        totalAmount: typeof totalAmount === "number" ? totalAmount : null,
        depositAmount: null,
        fullDate: dateStr,
        customerId,
        customServiceName: serviceName || null,
        customServiceDuration: durationMinutes,
        status: "pending",
      });
      pendingBookingId = Number(pendingBooking.id);
    } catch (holdErr) {
      console.error("Error holding booking slot before payment intent:", holdErr);
      return NextResponse.json(
        { error: "Failed to reserve the selected time slot. Please try again." },
        { status: 500 },
      );
    }

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
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
      excluded_payment_method_types: ["klarna", "zip"],
      payment_method_options: {
        card: { request_three_d_secure: "automatic" },
      },
      metadata: {
        booking_id: String(pendingBookingId),
        deposit_amount: amountInCents.toString(),
        shop_id: String(shopId),
        designer_id: designerId != null ? String(designerId) : "",
        service_id: serviceId != null ? String(serviceId) : "",
        day: String(day),
        full_date: String(fullDate || ""),
        total_amount: typeof totalAmount === "number" ? String(totalAmount) : "",
        duration_minutes: String(durationMinutes),
        service_name: String(serviceName),
        shop_name: String(shopName || "HAEYOOM"),
        designer_name: String(designerName || ""),
        formatted_date: String(formattedDateLabel || fullDate || ""),
        time_label: String(timeLabel),
        ...(customerId != null ? { customer_id: String(customerId) } : {}),
        // Comment: For new customers; webhook creates customer and sets booking.customer_id after deposit paid
        ...(customerId == null && customerName && customerPhone
          ? { customer_name: String(customerName).trim(), customer_phone: String(customerPhone).trim() }
          : {}),
      },
      });
    } catch (stripeErr) {
      // Comment: Release the held slot immediately instead of waiting out the pending TTL.
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", pendingBookingId);
      throw stripeErr;
    }

    if (!paymentIntent.client_secret) {
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", pendingBookingId);
      return NextResponse.json(
        { error: "Failed to create payment intent." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        client_secret: paymentIntent.client_secret,
        bookingId: pendingBookingId,
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
