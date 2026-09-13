import { logHandled } from "@/components/ui/ErrorReporter";

const SENT_AT = "quizups:verifySentAt";
/** Firebase rate-limits these hard, and signing up already sends one. */
export const RESEND_COOLDOWN_MS = 90000;

export function verifyMailSentAgo(): number {
  try {
    const raw = Number(localStorage.getItem(SENT_AT) || 0);
    return raw ? Date.now() - raw : Infinity;
  } catch (e) {
    return Infinity;
  }
}

export function canResendVerification(): boolean {
  return verifyMailSentAgo() > RESEND_COOLDOWN_MS;
}

export type ResendOutcome = "sent" | "already" | "cooldown" | "failed";

/**
 * Wraps the resend so a rate-limited retry reads as "we already sent it"
 * rather than the button appearing to do nothing at all.
 */
export async function resendVerificationSafely(send: () => Promise<void>): Promise<ResendOutcome> {
  if (!canResendVerification()) return "cooldown";
  try {
    await send();
    return "sent";
  } catch (err: any) {
    const code = String((err && (err.code || err.message)) || "");
    if (code.indexOf("too-many-requests") >= 0) return "already";
    logHandled("resend verification", err);
    return "failed";
  }
}

export function resendMessage(outcome: ResendOutcome, t: (k: string) => string): string {
  if (outcome === "sent") return t("Sent - check your inbox, and your spam folder.");
  if (outcome === "already" || outcome === "cooldown") {
    return t("We already sent one when you signed up - check your inbox and spam folder. You can ask for another in a couple of minutes.");
  }
  return t("We could not send it just now. Please try again shortly.");
}
