import { checkMatchLimit } from "@/lib/services/limits";
import { SupabaseClient } from "@supabase/supabase-js";
import type { MatchRow, MatchWithAnimals } from "@/lib/types";

export type { MatchRow, MatchWithAnimals };

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
  mutualMatch?: boolean;
};

// ═══ Push + in-app notification helper (fire-and-forget) ═══
// Uses /api/matches/notify which runs with service role to notify OTHER users.
// Errors are caught and logged — never breaks the match flow.
async function sendMatchNotification(recipientUserId: string, title: string, body: string, url: string) {
  try {
    fetch("/api/matches/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientUserId, title, body, url }),
    }).catch((err) => {
      console.error("[Match Notify] Erreur envoi notification:", err);
    });
  } catch (err) {
    console.error("[Match Notify] Erreur envoi notification:", err);
  }
}

export async function sendMatchWithLimit(
  supabase: any,
  senderAnimalId: string,
  receiverAnimalId: string,
  senderUserId: string,
  receiverUserId: string,
  subscription: string
) {
  const limit = await checkMatchLimit(supabase, senderUserId, subscription);
  if (!limit.allowed) return { data: null, error: limit.error, mutualMatch: false };
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
    if (!receiverUserId || receiverUserId === "NONE") {
      return { data: null, error: "Cet animal n'a pas de propriétaire identifié.", mutualMatch: false };
    }

    // Récupérer les noms des animaux pour les notifications
    const { data: senderAnimal } = await supabase
      .from("animals").select("name").eq("id", senderAnimalId).single();
    const { data: receiverAnimal } = await supabase
      .from("animals").select("name").eq("id", receiverAnimalId).single();
    const senderName = senderAnimal?.name || "Un animal";
    const receiverName = receiverAnimal?.name || "ton animal";

    // Vérifier si j'ai déjà liké cet animal
    const { data: alreadySent } = await supabase
      .from("matches")
      .select("id")
      .eq("sender_animal_id", senderAnimalId)
      .eq("receiver_animal_id", receiverAnimalId)
      .maybeSingle();

    if (alreadySent) {
      return { data: null, error: "Tu as déjà flairé ce compagnon.", mutualMatch: false };
    }

    // Vérifier si l'autre a déjà liké mon animal (match inverse = match mutuel !)
    const { data: reverseMatch } = await supabase
      .from("matches")
      .select("id, status")
      .eq("sender_animal_id", receiverAnimalId)
      .eq("receiver_animal_id", senderAnimalId)
      .eq("status", "pending")
      .maybeSingle();

    if (reverseMatch) {
      // MATCH MUTUEL — on accepte les deux côtés automatiquement
      await supabase
        .from("matches")
        .update({ status: "accepted" })
        .eq("id", reverseMatch.id);

      const { data, error } = await supabase
        .from("matches")
        .insert({
          sender_animal_id: senderAnimalId,
          receiver_animal_id: receiverAnimalId,
          sender_user_id: senderUserId,
          receiver_user_id: receiverUserId,
          status: "accepted",
        })
        .select()
        .single();

      if (error) return { data: null, error: "Erreur: " + error.message, mutualMatch: false };

      // ═══ NOTIFICATION MATCH MUTUEL — notifier l'autre propriétaire ═══
      // Fire-and-forget: push + in-app notification via /api/matches/notify
      sendMatchNotification(
        receiverUserId,
        "🐾 Coup de Truffe !",
        `${senderName} veut te rencontrer !`,
        "/matches"
      );

      return { data, error: null, mutualMatch: true };
    }

    // Pas de match inverse — on enregistre silencieusement en pending
    const { data, error } = await supabase
      .from("matches")
      .insert({
        sender_animal_id: senderAnimalId,
        receiver_animal_id: receiverAnimalId,
        sender_user_id: senderUserId,
        receiver_user_id: receiverUserId,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { data: null, error: "Erreur: " + error.message, mutualMatch: false };

    // ═══ NOTIFICATION MATCH PENDING — le propriétaire de l'animal flairé ═══
    sendMatchNotification(
      receiverUserId,
      "🐾 Nouveau flairage !",
      `${senderName} a flairé ${receiverName} ! Va voir son profil.`,
      "/matches"
    );

    return { data, error: null, mutualMatch: false };

  } catch {
    return { data: null, error: "Erreur inattendue.", mutualMatch: false };
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

    if (error) return { data: null, error: "Erreur: " + error.message };
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
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { data: null, error: "Erreur: " + error.message };
    return { data: data as MatchWithAnimals[], error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}
