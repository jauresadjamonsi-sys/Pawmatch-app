import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Notification type templates
const NOTIFICATION_TEMPLATES: Record<
  string,
  { emoji: string; title: string; body: string; type: string; link?: string }
> = {
  match_new: {
    emoji: "🐾",
    title: "Nouveau match possible !",
    body: "Un compagnon compatible a été trouvé pour {animal_name}. Allez voir !",
    type: "match",
    link: "/flairer",
  },
  match_accepted: {
    emoji: "🎉",
    title: "Coup de truffe !",
    body: "{animal_name} et {other_name} se sont mutuellement choisis !",
    type: "match",
    link: "/matches",
  },
  message_new: {
    emoji: "💬",
    title: "Nouveau message",
    body: "{sender_name} vous a envoyé un message.",
    type: "message",
    link: "/matches/{match_id}",
  },
  event_reminder: {
    emoji: "📅",
    title: "Événement bientôt !",
    body: "N'oubliez pas : {event_title} a lieu {event_time}.",
    type: "event",
    link: "/events",
  },
  streak_warning: {
    emoji: "🔥",
    title: "Votre série est en danger !",
    body: "Connectez-vous aujourd'hui pour maintenir votre série de {streak_count} jours.",
    type: "system",
    link: "/feed",
  },
  achievement: {
    emoji: "🏆",
    title: "Succès débloqué !",
    body: "Félicitations ! Vous avez obtenu le badge {badge_name}.",
    type: "system",
    link: "/profile/stats",
  },
};

function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, key) => vars[key] || `{${key}}`
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // This endpoint can be called server-to-server with service role key,
  // or by authenticated users for certain notification types.
  const body = await req.json();
  const { user_id, template_key, variables = {} } = body;

  if (!user_id || !template_key) {
    return NextResponse.json(
      { error: "user_id and template_key are required" },
      { status: 400 }
    );
  }

  const template = NOTIFICATION_TEMPLATES[template_key];
  if (!template) {
    return NextResponse.json(
      {
        error: `Unknown template_key: ${template_key}. Valid keys: ${Object.keys(NOTIFICATION_TEMPLATES).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Use service role client for creating notifications (avoids RLS issues)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify user exists
  const { data: profile, error: profileErr } = await serviceSupabase
    .from("profiles")
    .select("id")
    .eq("id", user_id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Build notification from template
  const vars = variables as Record<string, string>;
  const title = `${template.emoji} ${interpolate(template.title, vars)}`;
  const notifBody = interpolate(template.body, vars);
  const link = template.link
    ? interpolate(template.link, vars)
    : null;

  const { data, error } = await serviceSupabase
    .from("notifications")
    .insert({
      user_id,
      type: template.type,
      title,
      body: notifBody,
      link,
      read: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.all === true) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .in("id", body.ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Provide { ids: string[] } or { all: true }" },
    { status: 400 }
  );
}
