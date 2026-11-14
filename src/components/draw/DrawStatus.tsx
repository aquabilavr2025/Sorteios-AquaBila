"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Hourglass, Radio, Sparkles, Trophy } from "lucide-react";
import type { PublicDraw } from "@/types/draw";
import { formatDatePortugal, formatTicket } from "@/lib/utils";

export function DrawStatus({ draw }: { draw: PublicDraw | null }) {
  const reducedMotion = useReducedMotion();
  const status = draw?.status || "EMPTY";
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${draw?.id || "no-draw"}-${status}`}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        className="w-full"
        aria-live="polite"
      >
        {status === "EMPTY" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <Hourglass className="mx-auto mb-3 text-slate-400" size={24} />
            <h3 className="font-bold text-slate-800">Novos sorteios em breve</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Volta em breve para descobrir o próximo desafio AquaBila.</p>
          </div>
        )}
        {status === "WAITING" && (
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-5 py-5 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
              <span className="size-2 animate-pulse rounded-full bg-teal-400" /> EM PREPARAÇÃO
            </span>
            <h3 className="font-bold text-ocean-950">Está quase a começar!</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">A aguardar pelo início do sorteio... Boa sorte a todos!</p>
          </div>
        )}
        {status === "SPINNING" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200"><Radio size={13} /> AO VIVO</span>
            <h3 className="font-bold text-amber-900">O sorteio está a decorrer!</h3>
            <p className="mt-2 text-sm text-amber-800/80">A roda está a escolher o número vencedor.</p>
          </div>
        )}
        {status === "COMPLETED" && draw?.winningNumber != null && (
          <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 px-5 py-6 text-center">
            <div className="absolute -right-6 -top-8 size-28 rounded-full bg-teal-200/30 blur-2xl" />
            <span className="relative mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100"><CheckCircle2 size={13} /> SORTEIO CONCLUÍDO</span>
            <div className="relative mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-500"><Trophy size={26} /></div>
            <p className="relative text-xs font-bold uppercase tracking-[.18em] text-slate-500">Número vencedor</p>
            <motion.p initial={reducedMotion ? false : { scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 18 }} className="relative my-2 text-[clamp(40px,6vw,54px)] font-black tracking-[-.075em] text-ocean-950">#{formatTicket(draw.winningNumber)}</motion.p>
            <p className="relative flex items-center justify-center gap-1 text-xs text-slate-500"><Sparkles size={12} className="text-amber-500" /> {draw.completedAt ? formatDatePortugal(draw.completedAt) : ""}</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
