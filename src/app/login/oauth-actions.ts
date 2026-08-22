"use server";

import { signIn } from "@/auth";

export async function loginWithLine() {
  await signIn("line", { redirectTo: "/" });
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}
