import { createClient } from "@/lib/supabase/server";
import { addCoins } from "@/lib/services/pawcoins";
import { NextRequest, NextResponse } from "next/server";

// GET /api/marketplace — fetch listings with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const category = request.nextUrl.searchParams.get("category");
  const search = request.nextUrl.searchParams.get("search");

  let query = supabase
    .from("marketplace_listings")
    .select("*, profiles:user_id(full_name, avatar_url)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data: listings, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ listings: [], error: error.message });
  }

  return NextResponse.json({ listings: listings || [] });
}

// POST /api/marketplace — create a new listing
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const category = (formData.get("category") as string) || "accessoires";
  const price = parseFloat((formData.get("price") as string) || "0");
  const condition = (formData.get("condition") as string) || "occasion";
  const photo = formData.get("photo") as File | null;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  // Get user profile for canton
  const { data: profile } = await supabase
    .from("profiles")
    .select("canton")
    .eq("id", user.id)
    .single();

  let photo_url: string | null = null;

  // Upload photo to Supabase Storage if provided
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const filePath = `marketplace/${user.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, buffer, {
        contentType: photo.type,
        upsert: false,
      });

    if (!uploadError) {
      const { data: publicUrl } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);
      photo_url = publicUrl.publicUrl;
    }
  }

  // Insert listing
  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      price: condition === "don" ? 0 : price,
      condition,
      photo_url,
      canton: profile?.canton || null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Award +5 PawCoins for first listing
  let coins_earned = 0;
  const { data: existingListings } = await supabase
    .from("marketplace_listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // count will be 1 if this is the first listing (since we just inserted)
  const count = (existingListings as any)?.length ?? 0;
  if (count <= 1) {
    const result = await addCoins(
      supabase,
      user.id,
      5,
      "marketplace_listing",
      "Premiere annonce marketplace",
      listing.id
    );
    if (!result.error) coins_earned = 5;
  }

  return NextResponse.json({ listing, coins_earned });
}
