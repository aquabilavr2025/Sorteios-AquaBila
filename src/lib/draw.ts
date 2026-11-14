import { randomInt } from "node:crypto";
import {
  HISTORY_DAYS,
  MAX_ELIGIBLE_TICKETS,
  SPIN_DURATION_MS,
  type DrawResult,
  type DrawState,
  type PublicDraw,
  type StoredDraw,
} from "../types/draw.ts";

export class DrawConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrawConflictError";
  }
}

export function validateTicketRange(minTicket: number, maxTicket: number): void {
  if (
    !Number.isSafeInteger(minTicket) ||
    !Number.isSafeInteger(maxTicket) ||
    minTicket < 1 ||
    maxTicket < minTicket ||
    maxTicket - minTicket + 1 > MAX_ELIGIBLE_TICKETS
  ) {
    throw new Error(`O intervalo tem de conter entre 1 e ${MAX_ELIGIBLE_TICKETS} tickets positivos.`);
  }
}

export function effectiveStatus(draw: StoredDraw, now = Date.now()): PublicDraw["status"] {
  if (draw.status === "WAITING") return "WAITING";
  if (!draw.completedAt) throw new Error("Sorteio iniciado sem data de conclusão.");
  return now >= Date.parse(draw.completedAt) ? "COMPLETED" : "SPINNING";
}

export function toPublicDraw(draw: StoredDraw | null, now = Date.now()): PublicDraw | null {
  if (!draw) return null;
  const status = effectiveStatus(draw, now);
  return {
    ...draw,
    status,
    // A file in the private repository contains the winner from the moment of the start.
    // The public endpoint must not disclose it until the animation has finished.
    winningNumber: status === "COMPLETED" ? draw.winningNumber : null,
  };
}

export function filterHistory(history: DrawResult[], now = Date.now()): DrawResult[] {
  const cutoff = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  return history
    .filter((item) => {
      const date = Date.parse(item.completedAt);
      return Number.isFinite(date) && date >= cutoff && date <= now;
    })
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
}

export function removeExpiredDraws(state: DrawState, now = Date.now()): DrawState {
  const cutoff = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  // Retain results with a future completedAt: they were committed at START,
  // and would be silently lost if normal public-history filtering were used.
  return {
    ...state,
    history: state.history.filter((item) => {
      const finishedAt = Date.parse(item.completedAt);
      return Number.isFinite(finishedAt) && finishedAt >= cutoff;
    }),
  };
}

export function prepareDraw(
  state: DrawState,
  config: { id: string; name: string; minTicket: number; maxTicket: number },
  now = Date.now(),
): DrawState {
  const name = config.name.trim();
  if (!name || name.length > 100) throw new Error("Indica um nome com até 100 caracteres.");
  validateTicketRange(config.minTicket, config.maxTicket);

  if (state.currentDraw?.id === config.id) {
    // Retries using the same idempotency key never create a different draw.
    if (
      state.currentDraw.name !== name ||
      state.currentDraw.minTicket !== config.minTicket ||
      state.currentDraw.maxTicket !== config.maxTicket
    ) {
      throw new DrawConflictError("Esta referência já pertence a outro sorteio.");
    }
    return state;
  }

  if (state.currentDraw && effectiveStatus(state.currentDraw, now) === "SPINNING") {
    throw new DrawConflictError("Existe um sorteio em curso. Aguarda pela sua conclusão.");
  }

  return {
    currentDraw: {
      id: config.id,
      name,
      minTicket: config.minTicket,
      maxTicket: config.maxTicket,
      status: "WAITING",
      winningNumber: null,
      startedAt: null,
      completedAt: null,
    },
    history: filterHistory(state.history, now),
  };
}

export function startDraw(
  state: DrawState,
  drawId: string,
  now = Date.now(),
  selectWinner: (min: number, maxExclusive: number) => number = randomInt,
): DrawState {
  const current = state.currentDraw;
  if (!current) throw new DrawConflictError("Prepara primeiro um sorteio.");
  if (current.id !== drawId) throw new DrawConflictError("O sorteio foi substituído. Atualiza a página.");

  // An already started draw is immutable even when the request is retried.
  if (current.status === "SPINNING") return state;

  validateTicketRange(current.minTicket, current.maxTicket);
  const winner = selectWinner(current.minTicket, current.maxTicket + 1);
  if (!Number.isInteger(winner) || winner < current.minTicket || winner > current.maxTicket) {
    throw new Error("Falha na geração segura do número vencedor.");
  }

  const startedAt = new Date(now).toISOString();
  const completedAt = new Date(now + SPIN_DURATION_MS).toISOString();
  const started: StoredDraw = {
    ...current,
    status: "SPINNING",
    winningNumber: winner,
    startedAt,
    completedAt,
  };

  // Commit the result and the history in the SAME Github write.
  // The future completedAt prevents it being displayed before the end.
  const result: DrawResult = {
    id: started.id,
    name: started.name,
    minTicket: started.minTicket,
    maxTicket: started.maxTicket,
    winningNumber: winner,
    startedAt,
    completedAt,
  };
  const oldHistory = filterHistory(state.history, now)
    .filter((item) => item.id !== result.id);
  return { currentDraw: started, history: [result, ...oldHistory] };
}
