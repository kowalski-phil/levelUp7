import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Erneuert die Supabase-Session bei jedem Request und schickt Nicht-Eingeloggte zum Login.
export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development" && request.nextUrl.pathname.startsWith("/vorschau")) return NextResponse.next();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims;
  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!loggedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (loggedIn && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // api/: Cron-Routen prüfen selbst per CRON_SECRET und dürfen nicht zum Login umgeleitet werden.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api/|.*\\.(?:png|svg|ico|webp)$).*)"],
};
