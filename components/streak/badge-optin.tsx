"use client";

import { BellRing, Check } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void> };
type State = "unsupported" | "default" | "granted" | "denied";

/** Einmalige Erlaubnis, damit der Streak als Zahl auf dem App-Icon erscheint. */
const subscribe = () => () => {};
function readPermission(): State {
  const nav = navigator as BadgeNavigator;
  if (!nav.setAppBadge || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as State;
}

export function BadgeOptIn({ count }: { count: number }) {
  const initial = useSyncExternalStore(subscribe, readPermission, () => "unsupported" as State);
  const [asked, setState] = useState<State | null>(null);
  const state = asked ?? initial;

  if (state === "unsupported") return null;

  if (state === "granted") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-green-400" />
        Dein Streak steht auf dem App-Icon.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Für den Streak aufs App-Icon: iPhone-Einstellungen, Mitteilungen, LevelUp10, Mitteilungen erlauben.
      </p>
    );
  }

  const ask = async () => {
    const result = await Notification.requestPermission();
    setState(result as State);
    if (result === "granted" && count > 0) await (navigator as BadgeNavigator).setAppBadge?.(count).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={ask}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-orange-400/70 px-4 font-bold text-orange-300"
    >
      <BellRing className="size-5" />
      Streak aufs App-Icon holen
    </button>
  );
}
