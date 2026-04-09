import { createClient } from "@/lib/supabase/server";
import { addCoins } from "@/lib/services/pawcoins";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reviews?user_id=xxx — Fetch reviews for a user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const userId = request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id requis" }, { status: 400 });
  }

  // Fetch reviews with reviewer profile info
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, reviewer_id, reviewed_user_id, match_id, rating, comment, created_at, profiles:reviewer_id(full_name, avatar_url)")
    .eq("reviewed_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate average rating
  const ratings = (reviews || []).map((r) => r.rating);
  const averageRating = ratings.length > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
    : 0;

  return NextResponse.json({
    reviews: reviews || [],
    averageRating,
    reviewCount: ratings.length,
  });
}

// POST /api/reviews — Submit a review after a meetup
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const body = await request.json();
  const { reviewed_user_id, match_id, rating, comment } = body;

  // Validate required fields
  if (!reviewed_user_id || !match_id || !rating) {
    return NextResponse.json({ error: "Champs requis: reviewed_user_id, match_id, rating" }, { status: 400 });
  }

  // Validate rating range
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "La note doit etre entre 1 et 5" }, { status: 400 });
  }

  // Validate comment length
  if (comment && typeof comment === "string" && comment.length > 300) {
    return NextResponse.json({ error: "Le commentaire ne doit pas depasser 300 caracteres" }, { status: 400 });
  }

  // Prevent self-review
  if (reviewed_user_id === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas vous auto-evaluer" }, { status: 400 });
  }

  // Check if already reviewed this match
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("reviewer_id", user.id)
    .eq("match_id", match_id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Vous avez deja laisse un avis pour cette rencontre" }, { status: 409 });
  }

  // Insert the review
  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      reviewer_id: user.id,
      reviewed_user_id,
      match_id,
      rating: Math.round(rating),
      comment: comment?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Award +5 PawCoins for leaving a review
  await addCoins(supabase, user.id, 5, "review_posted", "Avis laisse apres rencontre", review.id);

  return NextResponse.json({ success: true, review_id: review.id });
}
