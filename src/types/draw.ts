export const SPIN_DURATION_MS = 5_000;
export const MAX_ELIGIBLE_TICKETS = 10_000;
export const HISTORY_DAYS = 14;

export type StoredStatus = "WAITING" | "SPINNING";
export type PublicStatus = "WAITING" | "SPINNING" | "COMPLETED";

export interface StoredDraw {
  id: string;
  name: string;
  minTicket: number;
  maxTicket: number;
  status: StoredStatus;
  winningNumber: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DrawResult {
  id: string;
  name: string;
  minTicket: number;
  maxTicket: number;
  winningNumber: number;
  startedAt: string;
  completedAt: string;
}

export interface DrawState {
  currentDraw: StoredDraw | null;
  history: DrawResult[];
}

export interface PublicDraw extends Omit<StoredDraw, "status"> {
  status: PublicStatus;
}

export interface DrawResponse {
  currentDraw: PublicDraw | null;
  serverNow: string;
  durationMs: number;
}

export interface HistoryResponse {
  history: DrawResult[];
  serverNow: string;
}
