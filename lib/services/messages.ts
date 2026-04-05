import { checkMessageLimit } from "@/lib/services/limits";
import { SupabaseClient } from "@supabase/supabase-js";

export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
};

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export async function sendMessage(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  content: string
): Promise<ServiceResult<MessageRow>> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { data: null, error: "Le message ne peut pas être vide." };
  }
  if (trimmed.length > 2000) {
    return { data: null, error: "Le message ne peut pas dépasser 2000 caractères." };
  }

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content: trimmed,
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

export async function getMessages(
  supabase: SupabaseClient,
  matchId: string
): Promise<ServiceResult<MessageRow[]>> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: "Erreur: " + error.message };
    }

    return { data: data || [], error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}

export async function markAsRead(
  supabase: SupabaseClient,
  matchId: string,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .neq("sender_id", userId)
      .is("read_at", null);
  } catch {
    // Silencieux
  }
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { count } = await supabase
      .from("messages")
      .select("*, matches!inner(*)", { count: "exact", head: true })
      .neq("sender_id", userId)
      .is("read_at", null)
      .or(
        `matches.sender_user_id.eq.${userId},matches.receiver_user_id.eq.${userId}`
      );

    return count || 0;
  } catch {
    return 0;
  }
}


export async function sendMessageWithLimit(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  content: string,
  subscription: string
) {
  const limit = await checkMessageLimit(supabase, senderId, subscription);
  if (!limit.allowed) return { data: null, error: limit.error };
  return sendMessage(supabase, matchId, senderId, content);
}

export async function sendImageMessage(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  imageUrl: string,
  subscription: string
): Promise<ServiceResult<MessageRow>> {
  const limit = await checkMessageLimit(supabase, senderId, subscription);
  if (!limit.allowed) return { data: null, error: limit.error };

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content: "📷 Photo",
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) return { data: null, error: "Erreur: " + error.message };
    return { data, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}
