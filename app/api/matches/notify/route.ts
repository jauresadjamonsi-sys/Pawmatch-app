import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/matches/notify
 * Sends a push notification + in-app notification when a mutual match
 * ("Coup de Truffe") happens, or when a new pending match is created.
 *
 * Body: { recipientUserId, title, body, url }
 *
 * Auth: the caller must be authenticated (the user who triggered the match).
 * Uses service role internally to look up the recipient's push subscriptions
 * and to insert the in-app notification (bypasses RLS).
 */
export async function POST(req: Request) {
  try {
    // Verify the caller is authenticated
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { recipientUserId, title, body, url } = await req.json();

    if (!recipientUserId || !title || !body) {
      return NextResponse.json(
        { error: "recipientUserId, title et body requis" },
        { status: 400 }
      );
    }

    // Prevent sending notifications to yourself
    if (recipientUserId === user.id) {
      return NextResponse.json({ error: "Impossible de se notifier soi-meme" }, { status: 400 });
    }

    // Use service role to bypass RLS for reading subscriptions and writing notifications
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const notifUrl = url || "/matches";

    // 1. Create in-app notification
    let inAppCreated = false;
    try {
      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: recipientUserId,
        type: "match",
        title,
        body,
        link: notifUrl,
        read: false,
      });
      inAppCreated = true;
    } catch (err) {
      console.error(
        "[Match Notify] Failed to create in-app notification for user",
        recipientUserId,
        err
      );
    }

    // 2. Send push notification via web-push
    let pushSent = 0;

    if (
      process.env.VAPID_EMAIL &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ) {
      try {
        const webpush = await import("web-push");
        webpush.default.setVapidDetails(
          process.env.VAPID_EMAIL,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", recipientUserId);

        if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title,
            body,
            url: notifUrl,
          });

          for (const sub of subs) {
            try {
              await webpush.default.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload
              );
              pushSent++;
            } catch (err: any) {
              // Clean up expired/unsubscribed endpoints
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
        console.error(
          "[Match Notify] Failed to send push to user",
          recipientUserId,
          err
        );
      }
    }

    console.log(
      `[Match Notify] user=${user.id} -> recipient=${recipientUserId} | push=${pushSent}, in_app=${inAppCreated}`
    );

    return NextResponse.json({
      push_sent: pushSent,
      in_app_created: inAppCreated,
    });
  } catch (err: any) {
    console.error("[Match Notify] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
