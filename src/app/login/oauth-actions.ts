"use server";

import { signIn } from "@/auth";

export async function loginWithLine(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  await signIn("line", { redirectTo: callbackUrl });
}

export async function loginWithGoogle(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  await signIn("google", { redirectTo: callbackUrl });
}
