import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/data/queries";
import { getOrCreateDailySession } from "@/lib/data/sessions";

// "Heute starten": Tagessession holen oder anlegen, dann dorthin.
export default async function DailySessionPage() {
  const v = await requireStudent();
  const session = await getOrCreateDailySession(v);
  if (session.finished_at) redirect(`/fertig/${session.id}`);
  if (!session.planned_item_ids.length) redirect("/");
  redirect(`/session/${session.id}`);
}
