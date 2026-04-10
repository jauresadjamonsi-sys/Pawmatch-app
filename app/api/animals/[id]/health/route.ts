import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — Fetch all health records for an animal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { id: animalId } = await params;

    // Optional type filter from query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let query = supabase
      .from("animal_health_records")
      .select("*")
      .eq("animal_id", animalId)
      .order("date", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Health GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ records: data || [] });
  } catch (e: any) {
    console.error("[Health GET]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — Create a new health record
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { id: animalId } = await params;
    const body = await request.json();

    const { type, title, description, date, next_due, value, unit, status } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Type et titre requis" }, { status: 400 });
    }

    const validTypes = ["vaccine", "vet_visit", "medication", "weight", "allergy", "note"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("animal_health_records")
      .insert({
        animal_id: animalId,
        user_id: user.id,
        type,
        title,
        description: description || null,
        date: date || new Date().toISOString().split("T")[0],
        next_due: next_due || null,
        value: value || null,
        unit: unit || null,
        status: status || "active",
      })
      .select()
      .single();

    if (error) {
      console.error("[Health POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ record: data }, { status: 201 });
  } catch (e: any) {
    console.error("[Health POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — Update a health record
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    await params; // consume params even if unused for this endpoint
    const body = await request.json();
    const { recordId, ...updates } = body;

    if (!recordId) {
      return NextResponse.json({ error: "recordId requis" }, { status: 400 });
    }

    // Only allow updating own records (RLS enforces this too)
    const { data, error } = await supabase
      .from("animal_health_records")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[Health PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ record: data });
  } catch (e: any) {
    console.error("[Health PATCH]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — Delete a health record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    await params;
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId");

    if (!recordId) {
      return NextResponse.json({ error: "recordId requis" }, { status: 400 });
    }

    const { error } = await supabase
      .from("animal_health_records")
      .delete()
      .eq("id", recordId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Health DELETE]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[Health DELETE]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
