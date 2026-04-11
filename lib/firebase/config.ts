/**
 * Firebase Cloud Messaging (FCM) configuration for PawBand.
 *
 * This module provides a lightweight FCM integration using the browser's
 * native Push API -- no firebase npm package required. It works alongside
 * the existing VAPID-based web-push setup.
 *
 * -----------------------------------------------------------------
 * HOW IT WORKS
 * -----------------------------------------------------------------
 * FCM on the web is built on top of the standard Web Push protocol.
 * When you create a Firebase project and generate a "web push certificate"
 * (also called the VAPID key), Firebase gives you a key pair that the
 * browser's PushManager understands natively.
 *
 * The flow:
 *   1. The service worker registers with the browser.
 *   2. We call pushManager.subscribe() with the FCM VAPID public key.
 *   3. The browser returns a PushSubscription whose endpoint is an
 *      FCM URL (https://fcm.googleapis.com/fcm/send/...).
 *   4. We send that subscription to our server.
 *   5. The server can use either:
 *      a) The standard `web-push` library (current setup) -- works with
 *         any Push API endpoint including FCM.
 *      b) The FCM HTTP v1 API for richer features (topics, analytics).
 *
 * -----------------------------------------------------------------
 * SETUP REQUIRED IN FIREBASE CONSOLE
 * -----------------------------------------------------------------
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use an existing one).
 * 3. Go to Project Settings > General and copy the config values.
 * 4. Go to Project Settings > Cloud Messaging.
 * 5. Under "Web configuration", generate a Web Push certificate
 *    (this is your VAPID key pair for FCM).
 * 6. Copy the key pair value -- this is NEXT_PUBLIC_FIREBASE_VAPID_KEY.
 * 7. For server-side sending via FCM HTTP v1 API:
 *    - Go to Project Settings > Service accounts
 *    - Generate a new private key (JSON)
 *    - Store the JSON securely and set FIREBASE_SERVICE_ACCOUNT_KEY env var.
 * 8. Fill in all NEXT_PUBLIC_FIREBASE_* env vars in .env.local.
 *
 * -----------------------------------------------------------------
 * IMPORTANT NOTES
 * -----------------------------------------------------------------
 * - The existing VAPID web-push setup will continue to work.
 * - FCM simply provides the VAPID key pair and an FCM endpoint.
 * - The `web-push` npm package can send to FCM endpoints without changes.
 * - No firebase npm packages are needed for this integration.
 */

// Firebase project configuration -- loaded from environment variables.
// These are safe to expose client-side (they are project identifiers, not secrets).
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * The VAPID public key from Firebase Cloud Messaging.
 * This is the "Web Push certificate" key pair value from:
 * Firebase Console > Project Settings > Cloud Messaging > Web configuration.
 *
 * When set, the push subscription flow will use this key instead of
 * the self-generated VAPID key (NEXT_PUBLIC_VAPID_PUBLIC_KEY).
 */
export const FCM_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Determine which VAPID key to use for push subscriptions.
 * Prefers the Firebase VAPID key if available, falls back to the
 * self-generated one.
 */
export function getVapidPublicKey(): string | undefined {
  return FCM_VAPID_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

/**
 * Check if Firebase Cloud Messaging is configured.
 * Returns true when the minimum required Firebase env vars are set.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    FCM_VAPID_KEY
  );
}

/**
 * Get the FCM sender ID for the service worker.
 * The service worker needs this to filter incoming FCM messages.
 */
export function getMessagingSenderId(): string | undefined {
  return firebaseConfig.messagingSenderId;
}
