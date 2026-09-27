"use client";

import { useEffect } from "react";

type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/**
 * Setzt den Streak als Zahl aufs App-Icon (iOS ab 16.4, nur als Web-App auf dem Home-Bildschirm).
 * Sichtbar wird die Zahl erst, wenn Benachrichtigungen erlaubt sind. Ohne Unterstützung passiert nichts.
 */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    if (!nav.setAppBadge) return;
    const run = count > 0 ? nav.setAppBadge(count) : (nav.clearAppBadge?.() ?? nav.setAppBadge(0));
    run.catch(() => {});
  }, [count]);
  return null;
}
