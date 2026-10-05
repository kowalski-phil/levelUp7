import { Flame } from "lucide-react";
import { BadgeOptIn } from "@/components/streak/badge-optin";
import { requireStudent } from "@/lib/data/queries";
import { closeWelcome } from "./actions";

// Willkommens-Screen (PLAN.md Abschnitt 7): fünf Sätze, Erinnerungen, los. Kommt beim ersten Öffnen jedes Tages,
// bis "Nicht mehr anzeigen" angehakt ist. Auf der Streak-Seite lässt er sich wieder einschalten.
export default async function WillkommenPage() {
  const v = await requireStudent();

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6">
      <Flame className="size-14 fill-orange-400 text-orange-500" aria-hidden />
      <h1 className="text-3xl leading-tight font-extrabold">Hi {v.profile.display_name}, willkommen bei LevelUp7.</h1>

      <div className="flex flex-col gap-4 text-lg leading-relaxed text-foreground/90">
        <p>
          Vokabeln und Grammatik sitzen nur, wenn man sie oft übt, nicht erst am Abend vor der Schulaufgabe.
          Deshalb gibt es hier jeden Tag ein paar Minuten Englisch und Französisch, abgestimmt auf eure Schulbücher.
        </p>
        <p>Was noch nicht sitzt, kommt öfter wieder, was sitzt, seltener.</p>
        <p>Jeder Tag verlängert deinen Streak, und für alle 30 Tage am Stück gibt es 10 €.</p>
        <p>
          Planen musst du nichts: Tipp jeden Tag auf <span className="font-semibold">&bdquo;Heute starten&ldquo;</span>, den Rest
          erledigt die App.
        </p>
      </div>

      <BadgeOptIn count={0} variant="home" />

      <form action={closeWelcome} className="mt-auto flex flex-col gap-2">
        <label className="flex min-h-12 items-center gap-3 text-muted-foreground">
          <input type="checkbox" name="never" defaultChecked={!!v.profile.onboarded_at} className="size-5 accent-primary" />
          Nicht mehr anzeigen
        </label>
        <button className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground active:scale-[0.99]">
          Los geht&apos;s
        </button>
      </form>
    </div>
  );
}
