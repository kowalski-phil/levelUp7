// Lädt Struktur und Aufgaben aus content/ (nur Node: Seed- und Prüfskripte).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentItem, SubjectCode } from "./types";

export interface Structure {
  subjects: { code: SubjectCode; name: string; color: string }[];
  units: {
    code: string;
    subject: SubjectCode;
    title: string;
    hours: number;
    /** Reihenfolge im Unterricht, wenn sie vom Lehrplan abweicht. Fehlt sie, gilt die Reihenfolge in dieser Datei. */
    schedule_order?: number;
    skills: { code: string; title: string; description: string }[];
  }[];
}

export const SUBJECT_DIRS: Record<SubjectCode, string> = { E: "englisch", F: "franzoesisch" };

export function loadStructure(root: string): Structure {
  return JSON.parse(readFileSync(join(root, "content", "structure.json"), "utf8"));
}

export interface ContentFile {
  path: string;
  unitCode: string;
  items: ContentItem[];
}

export function loadContentFiles(root: string): ContentFile[] {
  const out: ContentFile[] = [];
  for (const dir of Object.values(SUBJECT_DIRS)) {
    const full = join(root, "content", dir);
    let files: string[] = [];
    try {
      files = readdirSync(full).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const f of files) {
      const path = join(full, f);
      out.push({ path, unitCode: f.replace(/\.json$/, ""), items: JSON.parse(readFileSync(path, "utf8")) });
    }
  }
  return out;
}
