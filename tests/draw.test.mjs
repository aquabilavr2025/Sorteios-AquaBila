import test from "node:test";
import assert from "node:assert/strict";
import {
  DrawConflictError, effectiveStatus, filterHistory,
  prepareDraw, removeExpiredDraws, startDraw, toPublicDraw, validateTicketRange,
} from "../src/lib/draw.ts";

const initial = () => ({ currentDraw: null, history: [] });
const id = "dd64ad19-1676-4675-92ae-87cb40d8414a";
const now = Date.parse("2026-11-07T15:30:00Z");
const config = { id, name: "  Sorteio de Natal  ", minTicket: 1, maxTicket: 600 };

test("validates inclusive ticket ranges and the maximum width", () => {
  assert.doesNotThrow(() => validateTicketRange(1, 10000));
  assert.doesNotThrow(() => validateTicketRange(100000, 109999));
  assert.throws(() => validateTicketRange(0, 10));
  assert.throws(() => validateTicketRange(9, 8));
  assert.throws(() => validateTicketRange(1, 10001));
  assert.throws(() => validateTicketRange(1.5, 10));
});

test("preparing a draw creates a WAITING state and is idempotent", () => {
  const state = prepareDraw(initial(), config, now);
  assert.equal(state.currentDraw.name, "Sorteio de Natal");
  assert.equal(state.currentDraw.status, "WAITING");
  assert.equal(state.currentDraw.winningNumber, null);
  assert.deepEqual(prepareDraw(state, config, now), state);
});

test("starting stores one immutable winner and history result atomically", () => {
  const waiting = prepareDraw(initial(), config, now);
  const started = startDraw(waiting, id, now, (min, max) => {
    assert.equal(min, 1);
    assert.equal(max, 601); // exclusive upper bound
    return 347;
  });
  assert.equal(started.currentDraw.status, "SPINNING");
  assert.equal(started.currentDraw.winningNumber, 347);
  assert.equal(started.history.length, 1);
  assert.equal(started.history[0].winningNumber, 347);
  assert.equal(started.history[0].completedAt, "2026-11-07T15:30:05.000Z");
  // Persistence cleanup runs immediately after start, before completedAt.
  // It MUST keep the pending result in the private JSON.
  assert.equal(removeExpiredDraws(started, now).history.length, 1);
  const retried = startDraw(started, id, now + 2_000, () => 100);
  assert.deepEqual(retried, started);
  assert.equal(retried.history.length, 1);
});

test("only reveals the winner to the public after 5 seconds", () => {
  const started = startDraw(prepareDraw(initial(), config, now), id, now, () => 600);
  assert.equal(effectiveStatus(started.currentDraw, now + 4_999), "SPINNING");
  assert.equal(toPublicDraw(started.currentDraw, now + 4_999).winningNumber, null);
  assert.equal(effectiveStatus(started.currentDraw, now + 5_000), "COMPLETED");
  assert.equal(toPublicDraw(started.currentDraw, now + 5_000).winningNumber, 600);
  assert.equal(filterHistory(started.history, now + 4_999).length, 0);
  assert.equal(filterHistory(started.history, now + 5_000).length, 1);
});

test("cannot replace a running draw, can prepare another after completion", () => {
  const started = startDraw(prepareDraw(initial(), config, now), id, now, () => 3);
  const next = { ...config, id: "afe659c2-7a1f-4e0e-a3c1-411642a6a841", name: "Novo Sorteio" };
  assert.throws(() => prepareDraw(started, next, now + 4_999), DrawConflictError);
  assert.equal(prepareDraw(started, next, now + 5_000).currentDraw.name, "Novo Sorteio");
  assert.throws(() => startDraw(started, next.id, now + 5000), DrawConflictError);
});

test("filters history older than 14 days on reads and removes on writes", () => {
  const past = now - 15 * 24 * 60 * 60_000;
  const old = startDraw(prepareDraw(initial(), config, past), id, past, () => 1);
  const cleaned = removeExpiredDraws(old, now);
  assert.equal(cleaned.history.length, 0);
  assert.equal(old.history.length, 1);
  assert.equal(filterHistory(old.history, now).length, 0);
});

test("prevents invalid or non-integer winning numbers from being persisted", () => {
  const waiting = prepareDraw(initial(), config, now);
  assert.throws(() => startDraw(waiting, id, now, () => 601));
  assert.throws(() => startDraw(waiting, id, now, () => NaN));
});
