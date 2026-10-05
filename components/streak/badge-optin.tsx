"use client";

import { BellRing, Check } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ensurePushSubscription } from "@/components/push/subscribe";

type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void> };
type State = "unsupported" | "default" | "granted" | "denied";

/**
 * Einmalige Erlaubnis für Benachrichtigungen: Erinnerungen per Push und, wo das Gerät es kann (iPhone, Desktop), der Streak als Zahl auf dem App-Icon.
 * Android-Chrome kennt kein App-Badge (setAppBadge), Push geht dort trotzdem.
 * Ist die Erlaubnis da, wird das Gerät bei jedem Aufruf still fürs Push-Abo angemeldet (falls es noch fehlt).
 * variant "home": nur der Knopf, solange noch nicht gefragt wurde. "streak": mit Status und Hinweis bei Ablehnung.
 */
const subscribe = () => () => {};
function readPermission(): State {
  const nav = navigator as BadgeNavigator;
  if (typeof Notification === "undefined" || !("serviceWorker" in nav) || typeof PushManager === "undefined") return "unsupported";
  return Notification.permission as State;
}

const hasBadge = () => typeof navigator !== "undefined" && !!(navigator as BadgeNavigator).setAppBadge;

export function BadgeOptIn({ count, variant = "streak" }: { count: number; variant?: "home" | "streak" }) {
  const initial = useSyncExternalStore(subscribe, readPermission, () => "unsupported" as State);
  const [asked, setState] = useState<State | null>(null);
  const state = asked ?? initial;

  useEffect(() => {
    if (state === "granted") void ensurePushSubscription();
  }, [state]);

  if (state === "unsupported") return null;

  if (state === "granted") {
    if (variant === "home") return null;
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-green-400" />
        {hasBadge() ? "Erinnerungen sind an, dein Streak steht auf dem App-Icon." : "Erinnerungen sind an."}
      </p>
    );
  }

  if (state === "denied") {
    if (variant === "home") return null;
    return (
      <p className="text-sm text-muted-foreground">
        Für Erinnerungen: in den Einstellungen des Handys bei LevelUp7 Mitteilungen bzw. Benachrichtigungen erlauben.
      </p>
    );
  }

  const ask = async () => {
    const result = await Notification.requestPermission();
    setState(result as State);
    if (result === "granted" && count > 0) await (navigator as BadgeNavigator).setAppBadge?.(count).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={ask}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-orange-400/70 px-4 font-bold text-orange-300"
      >
        <BellRing className="size-5" />
        Erinnerungen einschalten
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Nachmittags eine Erinnerung, abends noch eine, falls du noch nicht gelernt hast.
      </p>
    </div>
  );
}
