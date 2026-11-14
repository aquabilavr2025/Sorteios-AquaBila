"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, CircleAlert, LockKeyhole, RadioTower, ShieldCheck, Ticket, Waves } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DrawWheel } from "@/components/draw/DrawWheel";
import { DrawStatus } from "@/components/draw/DrawStatus";
import { DrawHistory } from "@/components/draw/DrawHistory";
import { useDrawFeed, useDrawHistory } from "@/components/draw/useDrawFeed";
import { formatTicket } from "@/lib/utils";

export function PublicHome() {
  const { draw, loading, error, clockOffsetMs } = useDrawFeed();
  const { history, loading: historyLoading, error: historyError } = useDrawHistory(
    draw?.status === "COMPLETED" ? draw.id : null,
  );

  return (
    <div className="min-h-screen">
      <div className="ocean-hero text-white">
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-40 pt-6 sm:px-8 md:pb-44">
          <header className="flex items-center justify-between gap-3">
            <Brand light />
            <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegação principal">
              <a href="https://www.aquabilavr.com/" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:text-white sm:inline-flex">Visitar loja <ArrowUpRight size={15} /></a>
              <Button variant="dark" size="sm" asChild><Link href="/admin"><LockKeyhole size={14} /> <span className="hidden sm:inline">Administração</span><span className="sm:hidden">Admin</span></Link></Button>
            </nav>
          </header>
          <div className="relative flex flex-col items-start justify-between gap-8 pt-14 md:flex-row md:items-center md:pt-20">
            <div className="max-w-2xl">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-teal-200"><span className="size-1.5 rounded-full bg-teal-300" /> A tua sorte começa aqui</span>
              <h1 className="max-w-xl text-[clamp(39px,6vw,66px)] font-black leading-[1.08] tracking-[-.06em]">Um mundo de<br /><span className="bg-gradient-to-r from-teal-300 via-cyan-200 to-sky-300 bg-clip-text text-transparent">boas surpresas.</span></h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-slate-300 md:text-lg">Acompanha os sorteios AquaBila em direto, vê a roda girar e descobre se a sorte está do teu lado.</p>
            </div>
            <div className="float-glow hidden w-52 shrink-0 rounded-[26px] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur-md lg:block">
              <div className="mb-6 flex size-11 items-center justify-center rounded-2xl border border-teal-200/20 bg-teal-300/10 text-teal-300"><RadioTower size={23} /></div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-slate-400">Sorteios em direto</p>
              <p className="mt-2 text-lg font-bold text-white">A emoção de cada número.</p>
              <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-medium text-teal-300"><span className="size-1.5 rounded-full bg-teal-300" /> Atualização automática</div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto -mt-28 max-w-6xl px-5 pb-20 sm:px-8">
        {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="mt-0.5 shrink-0" size={18} /><p>{error}{draw ? " A apresentar a última informação disponível." : ""}</p></div>}

        <Card className="overflow-hidden !rounded-[30px] shadow-[0_24px_80px_-32px_rgba(3,39,56,.22)]">
          <div className="grid lg:grid-cols-[1.12fr_.88fr]">
            <div className="flex flex-col items-center px-5 pb-10 pt-9 sm:px-10 sm:pt-11 lg:border-r lg:border-slate-100">
              <div className="mb-10 flex w-full items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-600"><span className={`size-2 rounded-full ${draw?.status === "SPINNING" ? "bg-amber-400 animate-pulse" : draw?.status === "COMPLETED" ? "bg-teal-500" : "bg-slate-400"}`} /> {draw?.status === "SPINNING" ? "Em direto" : draw?.status === "COMPLETED" ? "Concluído" : "Próximo sorteio"}</span>
                <span className="flex items-center gap-1 text-xs font-medium text-slate-400"><ShieldCheck size={14} /> Sorteio seguro</span>
              </div>
              <DrawWheel draw={draw} clockOffsetMs={clockOffsetMs} />
              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400"><Waves size={15} className="text-teal-400" /> O teu universo de sorte</div>
            </div>
            <div className="flex flex-col justify-center bg-gradient-to-b from-white to-slate-50/50 px-6 py-9 sm:px-10 sm:py-12">
              <div className="mb-8">
                <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-teal-600">Sorteio atual</p>
                {loading ? (
                  <div className="space-y-3"><div className="skeleton-line h-8 w-full rounded-lg" /><div className="skeleton-line h-8 w-2/3 rounded-lg" /></div>
                ) : (
                  <h2 className="text-[clamp(25px,3.2vw,34px)] font-black leading-[1.2] tracking-[-.04em] text-ocean-950">{draw?.name || "A próxima oportunidade está a chegar"}</h2>
                )}
                <p className="mt-4 text-sm leading-relaxed text-slate-500">{draw ? "Cada ticket é uma nova possibilidade. Mantém-te atento à roda!" : "Fica atento aos próximos sorteios e prepara o teu número da sorte."}</p>
              </div>
              <div className="mb-7 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Ticket size={23} /></span>
                <span><span className="block text-xs font-medium text-slate-400">Tickets participantes</span><strong className="mt-0.5 block text-lg font-extrabold tracking-tight text-ocean-950">{draw ? `${formatTicket(draw.minTicket)} a ${formatTicket(draw.maxTicket)}` : "Por anunciar"}</strong></span>
              </div>
              <DrawStatus draw={draw} />
              <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-slate-400"><CalendarClock size={14} className="shrink-0" /> A página atualiza automaticamente. Não precisas de fazer nada.</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { number: "01", title: "Acompanha", text: "Vê o sorteio em tempo real." },
            { number: "02", title: "Descobre", text: "Espera pelo número vencedor." },
            { number: "03", title: "Confirma", text: "Consulta o resultado no histórico." },
          ].map((item) => (
            <div key={item.number} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-black text-teal-600">{item.number}</span>
              <div><h3 className="text-sm font-bold text-ocean-950">{item.title}</h3><p className="mt-0.5 text-xs text-slate-500">{item.text}</p></div>
            </div>
          ))}
        </div>

        <DrawHistory history={history} loading={historyLoading} error={historyError} />
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-[26px] bg-ocean-950 p-7 text-white sm:flex-row sm:items-center sm:p-9">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-teal-300">AquaBila</p><h2 className="text-xl font-black tracking-tight">A paixão pela aquariofilia não pára aqui.</h2><p className="mt-2 text-sm text-slate-300">Explora tudo o que temos para o teu aquário.</p></div>
          <Button asChild size="lg" className="shrink-0"><a href="https://www.aquabilavr.com/" target="_blank" rel="noopener noreferrer">Visitar a loja <ArrowRight size={17} /></a></Button>
        </div>
      </main>
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-slate-500 sm:flex-row sm:px-8"><span>© {new Date().getFullYear()} AquaBila. O teu universo submerso.</span><span>Feito com 💚 para a comunidade AquaBila.</span></div>
      </footer>
    </div>
  );
}
