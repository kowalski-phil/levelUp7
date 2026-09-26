// Zeilentypen der Tabellen aus supabase/migrations (nur die Spalten, die die App liest).
import type { ItemType } from "@/lib/content/types";
import type { Result } from "@/lib/engine/sm2";

export type Role = "student" | "parent";

export interface ProfileRow {
  id: string;
  role: Role;
  family_id: string | null;
  display_name: string;
  onboarded_at: string | null;
}

export interface FamilyRow {
  id: string;
  student_id: string | null;
  parent_id: string | null;
  school_year_start: string;
  exam_date: string;
}

export interface ItemRow {
  id: string;
  code: string;
  type: ItemType;
  difficulty: number;
  stem: string;
  payload: unknown;
  solution: unknown;
  explanation: string;
  hint: string | null;
  skill_id: string;
}

export interface ItemStateRow {
  student_id: string;
  item_id: string;
  ease: number;
  interval_days: number;
  due_date: string;
  reps: number;
  lapses: number;
  last_result: Result | null;
}

export type SessionKind = "daily" | "bonus" | "focus";

export interface SessionRow {
  id: string;
  student_id: string;
  date: string;
  kind: SessionKind;
  exam_id: string | null;
  planned_item_ids: string[];
  started_at: string;
  finished_at: string | null;
  duration_sec: number | null;
  correct: number;
  total: number;
  xp: number;
  summary: SessionSummary | null;
}

export interface SessionSummary {
  streak: number;
  streakCounted: boolean;
  jokerEarned: boolean;
  jokersUsed: number;
  rewards: { label: string; amountEur: number }[];
}

export interface StreakRow {
  student_id: string;
  current: number;
  longest: number;
  jokers: number;
  last_completed_date: string | null;
}

export interface RewardsConfigRow {
  family_id: string;
  weekly_streak_bonus_eur: number;
  milestones: { days: number; eur: number; label: string }[];
  exam_day_eur: number;
}

export interface LedgerRow {
  id: string;
  student_id: string;
  type: string;
  label: string;
  amount_eur: number;
  earned_at: string;
  paid_at: string | null;
}

export interface ExamRow {
  id: string;
  student_id: string;
  subject_id: string;
  exam_date: string;
  number: number;
  skill_ids: string[];
  created_at: string;
  updated_at: string;
}
