import type { ContentItem } from "@/lib/content/types";
import type { AnswerResult } from "@/lib/engine/grading";

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
  kind: "daily" | "bonus";
  items: PlayerItem[];
  answered: Record<string, AnswerResult>;
  /** Nur lokale Vorschau: nichts speichern. */
  preview?: boolean;
}
