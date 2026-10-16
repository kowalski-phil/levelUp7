import { Shield } from "lucide-react";
import { giveUpStreak, rescueStreak } from "@/app/(student)/streak/actions";
import { addDays, type ISODate } from "@/lib/engine/dates";

const weekday = (d: ISODate) => new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long" });

function missedText(days: ISODate[], today: ISODate): string {
  if (days.length === 1 && days[0] === addDays(today, -1)) return "Gestern verpasst.";
  const names = days.map(weekday);
  return `${names.length > 1 ? `${names.slice(0, -1).join(", ")} und ${names.at(-1)}` : names[0]} verpasst.`;
}

/** Verpasste Tage: Felix entscheidet, ob er Joker einsetzt. Steht anstelle der Start-Buttons. */
export function RescueCard({ days, streak, today }: { days: ISODate[]; streak: number; today: ISODate }) {
  const n = days.length;
  return (
    <div className="flex flex-col gap-3 rounded-3xl border-2 border-sky-500/60 bg-sky-500/10 p-5">
      <div className="flex items-center gap-4">
        <Shield className="size-10 shrink-0 fill-sky-400/30 text-sky-400" />
        <div>
          <p className="text-xl font-bold">{missedText(days, today)}</p>
          <p className="text-muted-foreground">
            Setz {n === 1 ? "einen Joker" : `${n} Joker`} ein, dann bleibt dein Streak bei {streak} {streak === 1 ? "Tag" : "Tagen"}.
          </p>
        </div>
      </div>
      <form action={rescueStreak}>
        <button className="h-14 w-full rounded-2xl bg-sky-500 text-lg font-bold text-white active:scale-[0.99]">
          {n === 1 ? "Joker einsetzen" : `${n} Joker einsetzen`}
        </button>
      </form>
      <form action={giveUpStreak}>
        <button className="h-12 w-full text-muted-foreground">Nein, neu anfangen</button>
      </form>
    </div>
  );
}
