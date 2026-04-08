import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/stories/notify
 * After a story is published, notify all matched users via push + in-app notification.
 *
 * Body: { story_id, animal_id, animal_name, media_type, user_id }
 */
export async function POST(req: Request) {
  try {
    // Auth: only the story poster can trigger their own notifications
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { story_id, animal_id, animal_name, media_type } = await req.json();

    if (!animal_name) {
      return NextResponse.json({ error: "animal_name requis" }, { status: 400 });
    }

    // Use service role to bypass RLS for querying matches + sending notifications
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get poster's profile name
    const { data: posterProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const posterName =
      posterProfile?.full_name ||
      posterProfile?.email?.split("@")[0] ||
      "Quelqu'un";

    // Get all matched user IDs (accepted matches where poster is sender OR receiver)
    const { data: matches } = await supabase
      .from("matches")
      .select("sender_user_id, receiver_user_id")
      .eq("status", "accepted")
      .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ notified: 0, reason: "no_matches" });
    }

    // Collect unique matched user IDs (exclude the poster)
    const matchedUserIds = new Set<string>();
    for (const m of matches) {
      if (m.sender_user_id !== user.id) matchedUserIds.add(m.sender_user_id);
      if (m.receiver_user_id !== user.id) matchedUserIds.add(m.receiver_user_id);
    }

    if (matchedUserIds.size === 0) {
      return NextResponse.json({ notified: 0, reason: "no_other_users" });
    }

    const mediaLabel = media_type === "video" ? "une video" : "une photo";
    const notifTitle = `📸 Nouvelle story de ${posterName}`;
    const notifBody = `${posterName} vient de poster ${mediaLabel} de ${animal_name} !`;
    const notifUrl = "/stories";

    // Prepare web-push
    let webpush: typeof import("web-push") | null = null;
    if (
      process.env.VAPID_EMAIL &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ) {
      webpush = await import("web-push");
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    let pushSent = 0;
    let inAppCreated = 0;

    for (const targetUserId of matchedUserIds) {
      // 1. Create in-app notification
      try {
        await supabase.from("notifications").insert({
          id: crypto.randomUUID(),
          user_id: targetUserId,
          type: "event",
          title: notifTitle,
          body: notifBody,
          link: notifUrl,
          read: false,
        });
        inAppCreated++;
      } catch (err) {
        console.error("[Story Notify] Failed to create in-app notification for user", targetUserId, err);
      }

      // 2. Send push notification
      if (webpush) {
        try {
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", targetUserId);

          if (subs && subs.length > 0) {
            const payload = JSON.stringify({
              title: notifTitle,
              body: notifBody,
              url: notifUrl,
            });

            for (const sub of subs) {
              try {
                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  payload
                );
                pushSent++;
              } catch (err: any) {
                // Clean up expired subscriptions
                if (err.statusCode === 410) {
                  await supabase
                    .from("push_subscriptions")
                    .delete()
                    .eq("endpoint", sub.endpoint);
                }
              }
            }
          }
        } catch (err) {
          console.error("[Story Notify] Failed to send push notifications to user", targetUserId, err);
        }
      }
    }

    console.log(
      `[Story Notify] ${posterName} posted story → ${matchedUserIds.size} matched users, ${pushSent} push sent, ${inAppCreated} in-app created`
    );

    return NextResponse.json({
      notified: matchedUserIds.size,
      push_sent: pushSent,
      in_app_created: inAppCreated,
    });
  } catch (err: any) {
    console.error("[Story Notify] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
