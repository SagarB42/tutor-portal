import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Resend transactional email client.
 *
 * Returns a singleton if `RESEND_API_KEY` is configured, otherwise `null`.
 * Callers should treat `null` as "email sending is disabled" — typically
 * surfaced to the UI as a setup hint rather than thrown as an error.
 */
let _client: Resend | null | undefined;
export function getResend(): Resend | null {
  if (_client !== undefined) return _client;
  _client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  return _client;
}

export type OrgSenderConfig = {
  organization_name: string | null;
  business_name: string | null;
  reply_to_email: string | null;
  sender_from_email: string | null;
  sender_domain_status: "pending" | "verified" | "failed" | null;
};

export type ResolvedSender = {
  /** Full From header e.g. `"Sarah's Tutoring" <noreply@tutorportal.app>`. */
  from: string;
  /** Reply-To address (parents reply here). */
  replyTo: string | undefined;
  /** Bare email used as From — handy for storing on the draft row. */
  fromEmail: string;
  /** True when the org has a verified custom domain configured. */
  isCustomDomain: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build the From + Reply-To header pair given an organisation's sender
 * configuration. Falls back to the shared sandbox sender when no custom
 * domain is verified.
 *
 * Display name precedence: business_name → organization name → "Tutor Portal".
 * Reply-To precedence: explicit reply_to_email → user's auth email.
 */
export function resolveSender(
  org: OrgSenderConfig,
  fallbackReplyTo?: string | null,
): ResolvedSender {
  const displayName =
    (org.business_name?.trim() || org.organization_name?.trim() || "Tutor Portal").replace(
      /[\\<>"]/g,
      "",
    );

  const verified =
    org.sender_domain_status === "verified" &&
    !!org.sender_from_email &&
    EMAIL_RE.test(org.sender_from_email);

  const fromEmail = verified ? org.sender_from_email! : env.EMAIL_FROM_FALLBACK;
  const from = `${displayName} <${fromEmail}>`;

  const replyToCandidate =
    org.reply_to_email && EMAIL_RE.test(org.reply_to_email)
      ? org.reply_to_email
      : fallbackReplyTo && EMAIL_RE.test(fallbackReplyTo)
        ? fallbackReplyTo
        : undefined;

  return {
    from,
    replyTo: replyToCandidate,
    fromEmail,
    isCustomDomain: verified,
  };
}

/**
 * Convert plain-text email body to a minimal HTML representation so it
 * renders nicely in modern mail clients while preserving line breaks.
 */
export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Wrap each paragraph (split on blank lines) and convert single newlines to <br>.
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 1em 0;line-height:1.5">${p.replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;font-size:14px">${paragraphs}</body></html>`;
}
