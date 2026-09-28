import { savePushSubscription } from "@/app/(student)/push-actions";

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Meldet dieses Gerät für die Erinnerungen an (nur mit Benachrichtigungs-Erlaubnis und Service Worker,
 * also als installierte Web-App im Produktivbetrieb). Mehrfach aufrufbar, speichert nur, was fehlt.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || process.env.NODE_ENV !== "production") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
    return true;
  } catch {
    return false;
  }
}
