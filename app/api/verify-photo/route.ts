import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { addCoins } from "@/lib/services/pawcoins";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("photo") as File;
  if (!file) return NextResponse.json({ error: "Photo requise" }, { status: 400 });

  // Upload to storage
  const ext = file.name.split(".").pop();
  const path = `verifications/${user.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("verifications")
    .upload(path, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Mark profile as verified
  await supabase.from("profiles").update({
    verified_photo: true,
    verified_at: new Date().toISOString(),
  }).eq("id", user.id);

  // Award PawCoins
  await addCoins(supabase, user.id, 15, "challenge_completed", "Verification photo completee").catch(() => {});

  return NextResponse.json({ verified: true, message: "Photo verifiee ! +15 PawCoins" });
}
