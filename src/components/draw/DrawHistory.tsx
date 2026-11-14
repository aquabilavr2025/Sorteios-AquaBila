"use client";

import { CalendarDays, History, Ticket, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDatePortugal, formatTicket } from "@/lib/utils";
import type { DrawResult } from "@/types/draw";

export function DrawHistory({ history, loading, error, compact = false }: {
  history: DrawResult[];
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "" : "mt-12 md:mt-16"} aria-label="Histórico dos sorteios">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {!compact && <span className="text-xs font-bold uppercase tracking-[.25em] text-teal-600">Os últimos vencedores</span>}
          <h2 className={`flex items-center gap-3 font-black tracking-tight text-ocean-950 ${compact ? "text-xl" : "mt-2 text-2xl md:text-[29px]"}`}>
            <History size={compact ? 20 : 26} className="text-teal-500" /> Histórico de sorteios
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">Últimos 14 dias</span>
      </div>
      <Card className="overflow-hidden !rounded-[24px]">
        {loading ? (
          <div className="space-y-4 p-6" aria-label="A carregar histórico">{[1,2,3].map((item) => <div key={item} className="skeleton-line h-14 rounded-xl" />)}</div>
        ) : error && !history.length ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">{error}</div>
        ) : !history.length ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><CalendarDays size={25} /></div>
            <strong className="text-slate-700">Ainda não existem resultados</strong>
            <span className="mt-1 text-sm text-slate-500">Os números vencedores irão aparecer aqui.</span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-nowrap sm:px-7">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-amber-50 text-amber-500"><Trophy size={20} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-bold text-ocean-950 sm:text-base">{item.name}</strong>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><CalendarDays size={13} /> {formatDatePortugal(item.completedAt)} <span className="text-slate-300">·</span> <Ticket size={13} /> {formatTicket(item.minTicket)} a {formatTicket(item.maxTicket)}</span>
                </span>
                <span className="ml-auto shrink-0 rounded-xl bg-teal-50 px-4 py-2 text-lg font-black tabular-nums tracking-tight text-teal-700">#{formatTicket(item.winningNumber)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
