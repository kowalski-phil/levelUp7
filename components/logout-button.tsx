"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/(auth)/login/actions";

/** Abmelden mit Rückfrage, damit ein versehentliches Tippen nicht ausloggt. */
export function LogoutButton({ className = "" }: { className?: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`flex h-12 items-center justify-center gap-2 px-2 text-sm text-muted-foreground ${className}`}
      >
        <LogOut className="size-4" />
        Abmelden
      </button>
    );
  }

  return (
    <form action={signOut} className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">Abmelden?</span>
      <button className="h-12 rounded-xl border-2 border-border px-4 text-sm font-semibold">Ja</button>
      <button type="button" onClick={() => setConfirming(false)} className="h-12 px-3 text-sm text-muted-foreground">
        Nein
      </button>
    </form>
  );
}
