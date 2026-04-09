import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/contests — fetch active contest entries with vote counts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all contest entries joined with animal data
  const { data: entries, error } = await supabase
    .from("contest_entries")
    .select(
      "id, animal_id, photo_url, vote_count, created_at, animal:animals(id, name, breed, canton, photo_url)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { entries: [], error: error.message },
      { status: 500 }
    );
  }

  // Check which entries the current user has voted for
  let votedIds = new Set<string>();
  if (user && entries && entries.length > 0) {
    const entryIds = entries.map((e: any) => e.id);
    const { data: votes } = await supabase
      .from("contest_votes")
      .select("entry_id")
      .eq("user_id", user.id)
      .in("entry_id", entryIds);

    votedIds = new Set((votes || []).map((v: any) => v.entry_id));
  }

  const enriched = (entries || []).map((e: any) => ({
    ...e,
    has_voted: votedIds.has(e.id),
  }));

  return NextResponse.json({ entries: enriched });
}

// POST /api/contests — submit a new contest entry
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non authentifie" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const animalId = formData.get("animal_id") as string;
  const photo = formData.get("photo") as File | null;

  if (!animalId) {
    return NextResponse.json(
      { error: "animal_id requis" },
      { status: 400 }
    );
  }

  // Verify the animal belongs to the user
  const { data: animal } = await supabase
    .from("animals")
    .select("id, created_by")
    .eq("id", animalId)
    .single();

  if (!animal || animal.created_by !== user.id) {
    return NextResponse.json(
      { error: "Animal non trouve ou non autorise" },
      { status: 403 }
    );
  }

  // Check if animal already has an entry
  const { data: existing } = await supabase
    .from("contest_entries")
    .select("id")
    .eq("animal_id", animalId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Cet animal participe deja au concours" },
      { status: 409 }
    );
  }

  // Upload photo to Supabase storage
  let photoUrl = "";
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const fileName = `contest/${user.id}/${animalId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(fileName, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Erreur upload photo: " + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(fileName);

    photoUrl = publicUrl;
  } else {
    // Use the animal's existing photo as fallback
    const { data: animalData } = await supabase
      .from("animals")
      .select("photo_url")
      .eq("id", animalId)
      .single();

    photoUrl = animalData?.photo_url || "";
  }

  if (!photoUrl) {
    return NextResponse.json(
      { error: "Photo requise" },
      { status: 400 }
    );
  }

  // Insert contest entry
  const { data: entry, error: insertError } = await supabase
    .from("contest_entries")
    .insert({
      animal_id: animalId,
      photo_url: photoUrl,
      vote_count: 0,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry });
}
