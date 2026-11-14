"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawResponse, HistoryResponse } from "@/types/draw";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { error?: unknown }).error;
    throw new Error(typeof message === "string" ? message : "Não foi possível carregar os sorteios.");
  }
  return data as T;
}

export function useDrawFeed() {
  const [data, setData] = useState<DrawResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const mounted = useRef(false);
  const lastDraw = useRef<DrawResponse["currentDraw"]>(null);
  const hasSyncedClock = useRef(false);

  const refresh = useCallback(async () => {
    const started = Date.now();
    const payload = await getJson<DrawResponse>("/api/draw");
    if (!mounted.current) return;
    // Approximate the server clock using half of the network round-trip.
    if (!hasSyncedClock.current) {
      setClockOffsetMs(Date.parse(payload.serverNow) + (Date.now() - started) / 2 - Date.now());
      hasSyncedClock.current = true;
    }
    setData(payload);
    lastDraw.current = payload.currentDraw;
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    async function poll() {
      try { await refresh(); }
      catch (caught) {
        if (stopped) return;
        setError(caught instanceof Error ? caught.message : "Ligação temporariamente indisponível.");
        setLoading(false);
      }
      if (stopped) return;
      const draw = lastDraw.current;
      const delay = !draw ? 6_000 : draw.status === "WAITING" ? 1_500 : draw.status === "SPINNING" ? 700 : 6_000;
      timer = setTimeout(poll, delay);
    }
    void poll();
    return () => { stopped = true; mounted.current = false; if (timer) clearTimeout(timer); };
  }, [refresh]);

  return { draw: data?.currentDraw || null, loading, error, clockOffsetMs, refresh };
}

export function useDrawHistory(refreshKey?: string | null) {
  const [data, setData] = useState<HistoryResponse>({ history: [], serverNow: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await getJson<HistoryResponse>("/api/draw/history");
      setData(result);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O histórico está indisponível.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => { if (refreshKey) void refresh(); }, [refreshKey, refresh]);
  return { history: data.history, error, loading, refresh };
}
