"use server";

import { signIn } from "@/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function loginWithLine(formData: FormData) {
  const callbackUrl = safeRedirectPath(formData.get("callbackUrl"));
  await signIn("line", { redirectTo: callbackUrl });
}

export async function loginWithGoogle(formData: FormData) {
  const callbackUrl = safeRedirectPath(formData.get("callbackUrl"));
  await signIn("google", { redirectTo: callbackUrl });
}
