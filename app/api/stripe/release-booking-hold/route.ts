import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Comment: Called when a customer abandons checkout (closes tab / clicks back) so the held
// slot frees up immediately instead of waiting out the pending-booking TTL.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const bookingId = Number(body?.bookingId);
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "Invalid bookingId." }, { status: 400 });
    }

    // Comment: Only flip 'pending' → 'cancelled'. If the webhook already confirmed this
    // booking (payment succeeded right as the tab closed), leave it alone.
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("release-booking-hold update error:", error);
      return NextResponse.json({ error: "Failed to release booking hold." }, { status: 500 });
    }

    return NextResponse.json({ released: Boolean(data) }, { status: 200 });
  } catch (error) {
    console.error("release-booking-hold POST error:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
