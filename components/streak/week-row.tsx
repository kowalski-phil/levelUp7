import { Flame, Shield } from "lucide-react";
import type { WeekDay } from "@/lib/engine/streak";
import { cn } from "@/lib/utils";

const TITLE: Record<WeekDay["status"], string> = {
  done: "geschafft",
  saved: "von einem Joker gerettet",
  today: "heute noch offen",
  missed: "verpasst",
  future: "kommt noch",
  before: "",
};

/** Mo bis So: Flamme = geschafft, Schild = Joker hat gerettet, gestrichelte Flamme = heute offen. */
export function WeekRow({ week, size = "sm" }: { week: WeekDay[]; size?: "sm" | "lg" }) {
  const icon = size === "lg" ? "size-8" : "size-5";
  return (
    <ol className="grid grid-cols-7 gap-1 text-center">
      {week.map((d) => (
        <li key={d.date} title={TITLE[d.status]} className="flex flex-col items-center gap-1">
          <span className={cn("text-xs", d.status === "today" ? "font-bold text-orange-400" : "text-muted-foreground")}>
            {d.label}
          </span>
          <span className={cn("grid place-items-center", size === "lg" ? "size-10" : "size-7")}>
            {d.status === "done" ? <Flame className={cn(icon, "fill-orange-400 text-orange-500")} /> : null}
            {d.status === "saved" ? <Shield className={cn(icon, "fill-sky-400/30 text-sky-400")} /> : null}
            {d.status === "today" ? <Flame className={cn(icon, "text-orange-400/70")} strokeDasharray="3 2" /> : null}
            {d.status === "missed" ? <span className="size-2 rounded-full bg-muted-foreground/60" /> : null}
            {d.status === "future" || d.status === "before" ? <span className="size-2 rounded-full bg-muted" /> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
