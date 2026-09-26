import type { ContentItem } from "@/lib/content/types";
import type { AnswerResult } from "@/lib/engine/grading";
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
  /** Zusatz im Kopf, z. B. "Fokus BwR". */
  label?: string;
  labelColor?: string;
  items: PlayerItem[];
  answered: Record<string, AnswerResult>;
  /** Nur lokale Vorschau: nichts speichern. */
  preview?: boolean;
}
