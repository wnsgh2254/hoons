import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { createPublicBooking } from "@/lib/data";

// Comment: Helper to normalize AU phone numbers (same as create-checkout-session)
function buildPhoneVariants(phoneRaw: string | undefined | null) {
  if (!phoneRaw) return { local: null as string | null, e164: null as string | null };
  const digitsOnly = phoneRaw.replace(/[^0-9+]/g, "");
  if (digitsOnly.startsWith("+61")) {
    const withoutCountry = digitsOnly.slice(3);
    const local =
      withoutCountry.length === 9 && !withoutCountry.startsWith("0")
        ? `0${withoutCountry}`
        : digitsOnly;
    return { local, e164: digitsOnly };
  }
  if (!digitsOnly.startsWith("+") && digitsOnly.startsWith("61")) {
    const e164 = `+${digitsOnly}`;
    const withoutCountry = digitsOnly.slice(2);
    const local =
      withoutCountry.length === 9 && !withoutCountry.startsWith("0")
        ? `0${withoutCountry}`
        : e164;
    return { local, e164 };
  }
  if (digitsOnly.startsWith("0") && digitsOnly.length >= 9) {
    const local = digitsOnly;
    const e164 = `+61${digitsOnly.slice(1)}`;
    return { local, e164 };
  }
  return { local: digitsOnly, e164: null as string | null };
}

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
    } = body;

    if (!shopId || !day || !timeLabel || !depositAmount || !serviceName) {
      return NextResponse.json(
        { error: "Missing required fields for payment intent." },
        { status: 400 },
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe secret key is not configured on the server." },
        { status: 500 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    });

    let customerId: number | null = null;

    if (customerPhone && customerName) {
      const { local, e164 } = buildPhoneVariants(customerPhone);

      if (existingCustomerId) {
        const { data: existingById } = await supabase
          .from("customers")
          .select("id")
          .eq("id", existingCustomerId)
          .maybeSingle();
        if (existingById?.id) {
          customerId = existingById.id;
        }
      }

      if (!customerId) {
        const orFilterParts: string[] = [];
        if (local) orFilterParts.push(`phone.eq.${local}`);
        if (e164) orFilterParts.push(`phone.eq.${e164}`);
        const { data: existingByPhone } = await supabase
          .from("customers")
          .select("id, name, phone")
          .or(orFilterParts.join(","))
          .limit(1)
          .maybeSingle();
        if (existingByPhone?.id) {
          customerId = existingByPhone.id;
        }
      }

      if (!customerId) {
        const { local } = buildPhoneVariants(customerPhone);
        const { data: createdCustomer } = await supabase
          .from("customers")
          .insert({
            name: String(customerName).trim(),
            phone: local,
          })
          .select("id")
          .single();
        if (createdCustomer?.id) {
          customerId = createdCustomer.id;
        }
      }
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
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: "Failed to create payment intent." },
        { status: 500 },
      );
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
