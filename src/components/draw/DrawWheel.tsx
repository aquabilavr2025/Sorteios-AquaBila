"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleCheck, Sparkles, Waves } from "lucide-react";
import type { PublicDraw } from "@/types/draw";
import { SPIN_DURATION_MS } from "@/types/draw";
import { formatTicket } from "@/lib/utils";

function pseudoNumber(seed: string, step: number, min: number, max: number): number {
  let value = (2166136261 ^ step) >>> 0;
  for (let i = 0; i < seed.length; i++) {
    value = Math.imul(value ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  value ^= value >>> 15;
  value = Math.imul(value, 2246822519) >>> 0;
  return min + (value % (max - min + 1));
}

export function DrawWheel({ draw, clockOffsetMs = 0, compact = false }: {
  draw: PublicDraw | null;
  clockOffsetMs?: number;
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const discRef = useRef<HTMLDivElement>(null);
  const [numberOnWheel, setNumberOnWheel] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(Date.now());
  const status = draw?.status;
  const startAt = draw?.startedAt;
  const id = draw?.id;
  const min = draw?.minTicket;
  const max = draw?.maxTicket;

  useEffect(() => {
    if (status !== "SPINNING" || !startAt || !id || min === undefined || max === undefined) {
      if (discRef.current) discRef.current.style.transform = "rotate(0deg)";
      return;
    }
    if (reducedMotion) {
      // No scripted rotation or rapidly changing numbers for reduced motion.
      if (discRef.current) discRef.current.style.transform = "rotate(0deg)";
      return;
    }
    let frame = 0;
    let lastStep = -1;
    function animate() {
      const elapsed = Date.now() + clockOffsetMs - Date.parse(startAt!);
      const p = Math.max(0, Math.min(1, elapsed / SPIN_DURATION_MS));
      // Integral of a smooth velocity curve: exact phase for every viewer.
      const eased = p - Math.sin(Math.PI * 2 * p) / (Math.PI * 2);
      if (discRef.current) {
        discRef.current.style.transform = `rotate(${(eased * 9 * 360).toFixed(3)}deg)`;
      }
      const step = Math.floor(elapsed / 95);
      if (step !== lastStep) {
        setNumberOnWheel(pseudoNumber(id!, step, min!, max!));
        setProgress(p);
        lastStep = step;
      }
      if (p < 1) frame = window.requestAnimationFrame(animate);
    }
    animate();
    return () => window.cancelAnimationFrame(frame);
  }, [status, startAt, id, min, max, clockOffsetMs, reducedMotion]);

  useEffect(() => {
    if (status !== "SPINNING") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [status]);

  const liveElapsed = startAt ? now + clockOffsetMs - Date.parse(startAt) : 0;
  const spinFinishedLocally = status === "SPINNING" && liveElapsed >= SPIN_DURATION_MS;
  const complete = status === "COMPLETED";
  const waiting = !draw || status === "WAITING";
  const centerText = complete && draw?.winningNumber != null
    ? formatTicket(draw.winningNumber)
    : spinFinishedLocally || (status === "SPINNING" && reducedMotion)
      ? "···"
      : status === "SPINNING" && numberOnWheel !== null
        ? formatTicket(numberOnWheel)
        : "?";

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className={`relative flex aspect-square items-center justify-center ${compact ? "w-[min(100%,270px)]" : "w-[min(100%,360px)]"}`}>
        <div className="pointer-events-none absolute inset-[-8%] rounded-full bg-[radial-gradient(circle,rgba(32,209,187,.12)_0%,transparent_70%)]" />
        <div className="absolute inset-0 rounded-full border border-teal-100 bg-teal-50/55 p-[7px] shadow-[0_5px_40px_-20px_rgba(4,113,116,.2)]">
          <div ref={discRef} className={`wheel-disc relative h-full w-full rounded-full ${waiting && !reducedMotion ? "waiting-breathe" : ""}`} />
        </div>
        <div className="absolute -top-1.5 z-30 wheel-pointer" aria-hidden="true" />
        <div className={`absolute z-10 flex aspect-square w-[54%] flex-col items-center justify-center rounded-full border-[7px] border-white bg-white text-center shadow-[0_7px_45px_rgba(2,36,61,.22)] ${compact ? "gap-1" : "gap-2"}`}>
          <span className="flex size-9 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            {complete ? <CircleCheck size={21} /> : <Waves size={21} />}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[.23em] text-slate-400">
            {complete ? "Vencedor" : status === "SPINNING" ? "A sortear" : "Boa sorte!"}
          </span>
          <AnimatePresence mode="wait">
            <motion.strong
              key={complete ? `winner-${centerText}` : status === "SPINNING" ? "spinning" : "waiting"}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.08 }}
              className={`font-black tabular-nums tracking-[-.06em] ${compact ? "text-[38px]" : "text-[clamp(40px,7vw,56px)]"} ${complete ? "text-teal-600" : "text-ocean-900"}`}
            >{centerText}</motion.strong>
          </AnimatePresence>
          {complete && <Sparkles size={15} className="text-amber-400" aria-hidden="true" />}
        </div>
        {complete && !reducedMotion && (
          <motion.div
            key={`glow-${id}`}
            initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 0.65, scale: 1.05 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-full border-4 border-teal-300/60"
          />
        )}
      </div>
      {status === "SPINNING" && (
        <div className="mt-7 w-[min(100%,280px)]">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500"><span>{spinFinishedLocally ? "A confirmar resultado..." : "A roda está a girar"}</span><span>{Math.min(100,Math.round(progress * 100))}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div style={{ width: `${progress * 100}%` }} className="h-full rounded-full bg-teal-500 transition-[width] duration-100" /></div>
        </div>
      )}
    </div>
  );
}
