"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/data/queries";
import { todayInBerlin } from "@/lib/engine/dates";
import { WELCOME_SEEN_COOKIE } from "@/lib/engine/welcome";

/**
 * "Los geht's": heute nicht mehr zeigen. Mit Haken "Nicht mehr anzeigen" nie wieder
 * (profiles.onboarded_at), bis Felix es auf der Streak-Seite wieder einschaltet.
 */
export async function closeWelcome(formData: FormData): Promise<void> {
  const v = await requireStudent();
  (await cookies()).set(WELCOME_SEEN_COOKIE, todayInBerlin(), { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  if (formData.get("never") === "on" && !v.profile.onboarded_at) {
    const { error } = await v.supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", v.userId);
    if (error) throw new Error(`Einstellung speichern: ${error.message}`);
  }
  redirect("/");
}

/** Streak-Seite: Willkommens-Screen wieder einschalten und gleich zeigen. */
export async function showWelcomeAgain(): Promise<void> {
  const v = await requireStudent();
  const { error } = await v.supabase.from("profiles").update({ onboarded_at: null }).eq("id", v.userId);
  if (error) throw new Error(`Einstellung speichern: ${error.message}`);
  redirect("/willkommen");
}
