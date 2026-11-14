import Link from "next/link";
import { Waves } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg" aria-label="AquaBila Sorteios — página inicial">
      <span className="flex size-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-teal-300 to-teal-500 text-slate-900 shadow-[0_10px_24px_-13px_#1eead0]">
        <Waves size={23} strokeWidth={2.6} aria-hidden="true" />
      </span>
      <span className={cn("flex flex-col leading-none", light ? "text-white" : "text-ocean-950")}>
        <strong className="text-[21px] font-extrabold tracking-[-.055em]">AquaBila<span className="text-teal-400">.</span></strong>
        {!compact && <span className={cn("mt-1.5 text-[9px] font-bold uppercase tracking-[.35em]", light ? "text-slate-300" : "text-slate-500")}>Sorteios</span>}
      </span>
    </Link>
  );
}
