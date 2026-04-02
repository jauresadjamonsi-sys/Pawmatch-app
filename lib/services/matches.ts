import { checkMatchLimit } from "@/lib/services/limits";
import { SupabaseClient } from "@supabase/supabase-js";

export type MatchRow = {
  id: string;
  sender_animal_id: string;
  receiver_animal_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
};

export type MatchWithAnimals = MatchRow & {
  sender_animal: { id: string; name: string; species: string; breed: string | null; photo_url: string | null };
  receiver_animal: { id: string; name: string; species: string; breed: string | null; photo_url: string | null };
  sender_profile: { id: string; full_name: string | null; email: string };
  receiver_profile: { id: string; full_name: string | null; email: string };
};

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};


export async function sendMatchWithLimit(
  supabase: any,
  senderAnimalId: string,
  receiverAnimalId: string,
  senderUserId: string,
  receiverUserId: string,
  subscription: string
) {
  const limit = await checkMatchLimit(supabase, senderUserId, subscription);
  if (!limit.allowed) return { data: null, error: limit.error };
  return sendMatch(supabase, senderAnimalId, receiverAnimalId, senderUserId, receiverUserId);
}

export async function sendMatch(
  supabase: SupabaseClient,
  senderAnimalId: string,
  receiverAnimalId: string,
  senderUserId: string,
  receiverUserId: string
): Promise<ServiceResult<MatchRow>> {
  try {
    const { data: existing } = await supabase
      .from("matches")
      .select("id, status")
      .or(
        `and(sender_animal_id.eq.${senderAnimalId},receiver_animal_id.eq.${receiverAnimalId}),and(sender_animal_id.eq.${receiverAnimalId},receiver_animal_id.eq.${senderAnimalId})`
      )
      .maybeSingle();

    if (!receiverUserId || receiverUserId === "NONE") {
      return { data: null, error: "Cet animal n'a pas de propriétaire identifié." };
    }

    if (existing) {
      return { data: null, error: "Une demande existe déjà entre ces deux compagnons." };
    }

    const { data, error } = await supabase
      .from("matches")
      .insert({
        sender_animal_id: senderAnimalId,
        receiver_animal_id: receiverAnimalId,
        sender_user_id: senderUserId,
        receiver_user_id: receiverUserId,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: "Erreur: " + error.message };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}

export async function respondToMatch(
  supabase: SupabaseClient,
  matchId: string,
  response: "accepted" | "rejected"
): Promise<ServiceResult<MatchRow>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .update({ status: response })
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      return { data: null, error: "Erreur: " + error.message };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}

export async function getMyMatches(
  supabase: SupabaseClient,
  userId: string
): Promise<ServiceResult<MatchWithAnimals[]>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        sender_animal:sender_animal_id(id, name, species, breed, photo_url),
        receiver_animal:receiver_animal_id(id, name, species, breed, photo_url),
        sender_profile:sender_user_id(id, full_name, email),
        receiver_profile:receiver_user_id(id, full_name, email)
      `)
      .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: "Erreur: " + error.message };
    }

    return { data: data as MatchWithAnimals[], error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}

