import { renderAppIcon } from "@/components/app-icon";

const SIZES = new Set([192, 512]);

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const n = Number(size.replace(/\.png$/, ""));
  if (!SIZES.has(n)) return new Response("Not found", { status: 404 });
  return renderAppIcon(n);
}
