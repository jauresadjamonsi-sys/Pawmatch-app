import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "jaures.adjamonsi@gmail.com").split(",").map(e => e.trim().toLowerCase());

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
      ADMIN_EMAILS.includes((user.email || "").toLowerCase());

    if (!isAdmin) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const { report_id, action } = body;

    if (!report_id || !action) {
      return NextResponse.json({ error: "report_id et action requis" }, { status: 400 });
    }

    const db = getServiceClient();

    if (action === "resolved") {
      const { error } = await db
        .from("reports")
        .update({ status: "resolved" })
        .eq("id", report_id);

      if (error) {
        console.error("Update report error:", error);
        return NextResponse.json({ error: "Erreur lors de la mise a jour" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin reports error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
