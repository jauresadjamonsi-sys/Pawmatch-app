/**
 * Centralized admin email check.
 *
 * Server-side: reads ADMIN_EMAILS from process.env
 * Client-side: reads NEXT_PUBLIC_ADMIN_EMAILS from process.env
 *
 * Set ADMIN_EMAILS (and optionally NEXT_PUBLIC_ADMIN_EMAILS for the client)
 * as a comma-separated list of email addresses in your .env file.
 */

const raw =
  typeof window === "undefined"
    ? process.env.ADMIN_EMAILS || ""
    : process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";

export const ADMIN_EMAILS: string[] = raw
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
