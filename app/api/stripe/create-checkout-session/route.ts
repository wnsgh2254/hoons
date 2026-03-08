import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { createPublicBooking, buildPhoneVariants } from "@/lib/data";

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
      embedded,
    } = body;

    const useEmbedded = embedded === true;

    if (!shopId || !day || !timeLabel || !depositAmount || !serviceName) {
      return NextResponse.json(
        { error: "Missing required fields for Stripe checkout session." },
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

    // Comment: Resolve or create customer in Supabase (same behavior as appointment route)
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

    // Comment: Create a pending booking record (same helper as public booking API)
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
      customServiceDuration: null,
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const returnOrSuccessUrl = new URL("/booking/confirmed", origin);
    returnOrSuccessUrl.searchParams.set("booking_id", String(booking.id));
    returnOrSuccessUrl.searchParams.set("shop", shopName || "");
    returnOrSuccessUrl.searchParams.set("designer", designerName || "");
    returnOrSuccessUrl.searchParams.set("service", serviceName || "");
    returnOrSuccessUrl.searchParams.set("date", formattedDateLabel || "");
    returnOrSuccessUrl.searchParams.set("time", timeLabel);
    returnOrSuccessUrl.searchParams.set(
      "deposit",
      typeof depositAmount === "number" ? depositAmount.toFixed(2) : "0.00",
    );

    const cancelUrl = new URL("/booking", origin);
    cancelUrl.searchParams.set("canceled", "1");

    const amountInCents =
      typeof depositAmount === "number"
        ? Math.round(depositAmount * 100)
        : 0;

    if (!amountInCents || amountInCents <= 0) {
      return NextResponse.json(
        { error: "Invalid deposit amount for Stripe payment." },
        { status: 400 },
      );
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: amountInCents,
            product_data: {
              name: `Deposit for ${serviceName}`,
              description: `${shopName || "HAEYOOM"} • ${designerName || ""} • ${
                formattedDateLabel || fullDate || ""
              } ${timeLabel}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: String(booking.id),
        deposit_amount: amountInCents.toString(),
      },
    };

    if (useEmbedded) {
      sessionParams.ui_mode = "embedded";
      sessionParams.return_url = returnOrSuccessUrl.toString();
    } else {
      sessionParams.success_url = returnOrSuccessUrl.toString();
      sessionParams.cancel_url = cancelUrl.toString();
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (useEmbedded && session.client_secret) {
      return NextResponse.json(
        { client_secret: session.client_secret },
        { status: 200 },
      );
    }
    return NextResponse.json({ url: session.url ?? null }, { status: 200 });
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to create Stripe checkout session. Please try again.",
      },
      { status: 500 },
    );
  }
}

