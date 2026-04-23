import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { buildPhoneVariants, isValidAuMobilePhone } from "@/lib/data";
import { cleanupExpiredPendingBookings } from "@/lib/pending-bookings";
import {
  assertPublicBookingSlotAvailable,
  resolveBookingDurationMinutes,
} from "@/lib/server-booking-availability";

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
      durationMinutes: durationMinutesBody,
    } = body;

    const useEmbedded = embedded === true;

    if (!shopId || !day || !timeLabel || !depositAmount || !serviceName) {
      return NextResponse.json(
        { error: "Missing required fields for Stripe checkout session." },
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

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const returnOrSuccessUrl = new URL("/booking/confirmed", origin);
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
      payment_intent_data: {
        metadata: {
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
          ...(customerId == null && customerName && customerPhone
            ? {
                customer_name: String(customerName).trim(),
                customer_phone: String(customerPhone).trim(),
              }
            : {}),
        },
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
