import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/auth/admin";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * PATCH /api/admin/verification
 * Body: { profile_id, status: "approved" | "rejected", note?: string }
 */
export async function PATCH(req: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    const isAdmin =
      profile?.role === "admin" ||
      isAdminEmail(user.email || "");

    if (!isAdmin) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { profile_id, status, note } = await req.json();

    if (!profile_id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "profile_id et status (approved|rejected) requis" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const db = getServiceClient();

    const { data, error } = await db
      .from("profiles")
      .update({
        verification_status: status,
        verification_reviewed_at: new Date().toISOString(),
        ...(note ? { verification_note: note } : {}),
      })
      .eq("id", profile_id)
      .select("id, full_name, verification_status")
      .single();

    if (error) {
      console.error("[Admin Verification] Update error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(
      `[Admin Verification] ${user.email} ${status} profile ${profile_id} (${data?.full_name})`
    );

    return NextResponse.json({ success: true, profile: data });
  } catch (err: any) {
    console.error("[Admin Verification] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/verification?status=submitted
 * Returns profiles filtered by verification status
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    const isAdmin =
      profile?.role === "admin" ||
      isAdminEmail(user.email || "");

    if (!isAdmin) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "submitted";

    const db = getServiceClient();

    let query = db
      .from("profiles")
      .select(
        "id, full_name, email, avatar_url, verification_photo_url, verification_status, verification_note, verification_submitted_at, verification_reviewed_at"
      )
      .order("verification_submitted_at", {
        ascending: false,
        nullsFirst: false,
      });

    if (status !== "all") {
      query = query.eq("verification_status", status);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
