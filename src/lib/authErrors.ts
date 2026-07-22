export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead, or reset your password.",
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/weak-password": "Please choose a password with at least 6 characters.",
    "auth/user-not-found": "No account found with that email. Check the address or sign up.",
    "auth/wrong-password": "Incorrect password. Try again or reset your password.",
    "auth/invalid-credential": "Email or password is incorrect. Try again or reset your password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  if (map[code]) return map[code];
  const msg = (err as { message?: string })?.message || "";
  return msg.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?/, "") || "Something went wrong. Please try again.";
}

export function isEmailInUse(err: unknown): boolean {
  return (err as { code?: string })?.code === "auth/email-already-in-use";
}
