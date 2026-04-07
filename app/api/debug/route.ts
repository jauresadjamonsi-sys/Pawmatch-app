import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // 1. Get auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated", authError: authError?.message });
    }

    // 2. Query profile with admin client
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .single();

    // 3. Query animals with admin client
    const { data: animals, error: animalsError } = await admin
      .from("animals")
      .select("id, name, created_by")
      .eq("created_by", user.id);

    // 4. Check env vars
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    return NextResponse.json({
      auth_user_id: user.id,
      auth_email: user.email,
      hasServiceKey,
      hasUrl,
      profile: profile || null,
      profileError: profileError?.message || null,
      animals: animals || [],
      animalsError: animalsError?.message || null,
    });
  } catch (e: any) {
    return NextResponse.json({ crash: e.message });
  }
}
