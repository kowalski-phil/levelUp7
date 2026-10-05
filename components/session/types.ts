import type { ContentItem } from "@/lib/content/types";
import type { AttemptState } from "@/lib/engine/grading";
import type { SessionKind } from "@/lib/supabase/types";

/** Eine Aufgabe, wie der Server sie an die Session-UI übergibt. */
export interface PlayerItem {
  id: string;
  item: ContentItem;
  subjectCode: string;
  subjectName: string;
  subjectColor: string;
  skillTitle: string;
}

export interface PlayerProps {
  sessionId: string;
  kind: SessionKind;
  /** Zusatz im Kopf, z. B. "Fokus Englisch". */
  label?: string;
  labelColor?: string;
  items: PlayerItem[];
  /** Gespeicherter Stand je Aufgabe (erste Antwort, gelöst, Versuche). */
  answered: Record<string, AttemptState>;
  /** Nur lokale Vorschau: nichts speichern. */
  preview?: boolean;
}
