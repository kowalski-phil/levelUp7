"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">E-Mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          className="h-14 rounded-xl border-2 border-border bg-card px-4 text-lg outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Passwort</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-14 rounded-xl border-2 border-border bg-card px-4 text-lg outline-none focus:border-primary"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        disabled={pending}
        className="mt-2 h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Einen Moment …" : "Einloggen"}
      </button>
      <p className="text-center text-xs text-muted-foreground">Du bleibst eingeloggt. Das musst du nur einmal machen.</p>
    </form>
  );
}
