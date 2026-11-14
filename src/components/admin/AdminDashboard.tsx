"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, ExternalLink, LoaderCircle, LogOut, Play, Plus, Radio, ShieldCheck, Ticket, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DrawWheel } from "@/components/draw/DrawWheel";
import { DrawStatus } from "@/components/draw/DrawStatus";
import { DrawHistory } from "@/components/draw/DrawHistory";
import { useDrawFeed, useDrawHistory } from "@/components/draw/useDrawFeed";
import { MAX_ELIGIBLE_TICKETS } from "@/types/draw";
import { formatTicket } from "@/lib/utils";

interface Draft { name: string; minTicket: string; maxTicket: string }

async function postJson(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data: { error?: string } = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}

export function AdminDashboard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ name: "", minTicket: "1", maxTicket: "600" });
  const prepareId = useRef<string | null>(null);
  const [busy, setBusy] = useState<"prepare" | "start" | "logout" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { draw, loading, error: readError, clockOffsetMs, refresh } = useDrawFeed();
  const { history, error: historyError, loading: historyLoading, refresh: refreshHistory } = useDrawHistory(draw?.status === "COMPLETED" ? draw.id : null);

  const isSpinning = draw?.status === "SPINNING";
  const canStart = draw?.status === "WAITING";

  function changeField(field: keyof Draft, value: string) {
    prepareId.current = null;
    setDraft((previous) => ({ ...previous, [field]: value }));
  }

  async function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || isSpinning) return;
    setError(null); setMessage(null); setBusy("prepare");
    if (!prepareId.current) prepareId.current = crypto.randomUUID();
    try {
      await postJson("/api/admin/draw/prepare", {
        id: prepareId.current, name: draft.name.trim(), minTicket: Number(draft.minTicket), maxTicket: Number(draft.maxTicket),
      });
      prepareId.current = null;
      setMessage("Sorteio preparado! Já está visível para os participantes.");
      await refresh();
      await refreshHistory();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível preparar o sorteio."); }
    finally { setBusy(null); }
  }

  async function start() {
    if (busy || !draw || !canStart) return;
    setError(null); setMessage(null); setBusy("start");
    try {
      await postJson("/api/admin/draw/start", { drawId: draw.id });
      setMessage("Sorteio iniciado. O resultado foi guardado com segurança.");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o sorteio."); }
    finally { setBusy(null); }
  }

  async function logout() {
    setBusy("logout");
    try { await postJson("/api/admin/logout"); router.refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível terminar a sessão."); setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-9 sm:px-8">
      <div className="mb-9 flex flex-wrap items-center justify-between gap-5">
        <div><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-teal-600"><ShieldCheck size={14} /> Área privada</span><h1 className="mt-2 text-3xl font-black tracking-[-.05em] text-ocean-950 sm:text-4xl">Painel de sorteios<span className="text-teal-500">.</span></h1><p className="mt-2 text-sm text-slate-500">Prepara, inicia e acompanha cada sorteio.</p></div>
        <div className="flex items-center gap-2"><Button asChild variant="outline" size="sm"><a href="/" target="_blank" rel="noreferrer">Página pública <ExternalLink size={15} /></a></Button><Button variant="ghost" size="sm" onClick={() => void logout()} disabled={Boolean(busy)}><LogOut size={16} /> Sair</Button></div>
      </div>
      {(error || readError) && <div role="alert" className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><CircleAlert size={18} className="mt-0.5 shrink-0" /> {error || readError}</div>}
      {message && <div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-700"><CheckCircle2 size={18} /> {message}</div>}
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-6">
          <Card className="!rounded-[26px] p-6 sm:p-8">
            <div className="mb-7 flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Plus size={22} /></div><div><h2 className="text-xl font-extrabold tracking-tight text-ocean-950">Preparar novo sorteio</h2><p className="mt-1 text-sm text-slate-500">Define o nome e os tickets participantes.</p></div></div>
            <form className="space-y-5" onSubmit={prepare}>
              <div className="space-y-2"><Label htmlFor="draw-name">Nome do sorteio</Label><Input id="draw-name" required maxLength={100} placeholder="Ex.: Sorteio AquaBila de Natal" value={draft.name} onChange={(event) => changeField("name", event.target.value)} disabled={Boolean(isSpinning || busy)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="min-ticket">Ticket inicial</Label><Input id="min-ticket" type="number" min={1} max={2_000_000_000} step={1} required value={draft.minTicket} onChange={(event) => changeField("minTicket", event.target.value)} disabled={Boolean(isSpinning || busy)} /></div>
                <div className="space-y-2"><Label htmlFor="max-ticket">Ticket final</Label><Input id="max-ticket" type="number" min={1} max={2_000_000_000} step={1} required value={draft.maxTicket} onChange={(event) => changeField("maxTicket", event.target.value)} disabled={Boolean(isSpinning || busy)} /></div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500"><Ticket size={16} className="mt-0.5 shrink-0 text-teal-500" /> Podes incluir até {formatTicket(MAX_ELIGIBLE_TICKETS)} tickets por sorteio. Ambos os limites são incluídos.</div>
              <Button type="submit" variant="outline" size="lg" disabled={Boolean(isSpinning || busy)} className="w-full">{busy === "prepare" ? <LoaderCircle size={17} className="animate-spin" /> : <ClipboardCheck size={17} />} {busy === "prepare" ? "A preparar..." : "Preparar Sorteio"}</Button>
              {isSpinning && <p className="text-center text-xs text-amber-700">Aguarda pelo fim do sorteio em curso para preparar outro.</p>}
            </form>
          </Card>
          <Card className="!rounded-[26px] bg-ocean-950 p-6 text-white sm:p-8">
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-teal-300"><Radio size={15} /> Controlo do sorteio</div>
            <h2 className="text-xl font-extrabold tracking-tight">Pronto para tentar a sorte?</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">O resultado é escolhido e guardado no servidor antes de a roda começar a girar.</p>
            <div className="my-5 rounded-xl border border-white/10 bg-white/[.05] px-4 py-4">
              <p className="text-xs text-slate-400">Sorteio preparado</p><p className="mt-1 truncate text-base font-bold">{draw?.name || "Nenhum sorteio preparado"}</p>
              {draw && <p className="mt-1 text-xs text-slate-400">Tickets {formatTicket(draw.minTicket)} a {formatTicket(draw.maxTicket)}</p>}
            </div>
            <Button size="lg" disabled={!canStart || Boolean(busy) || loading} onClick={() => void start()} className="w-full !bg-teal-400 !text-ocean-950 hover:!bg-teal-300">{busy === "start" ? <LoaderCircle size={18} className="animate-spin" /> : <Play size={19} fill="currentColor" />} {busy === "start" ? "A iniciar..." : isSpinning ? "Sorteio em curso" : draw?.status === "COMPLETED" ? "Prepara o próximo sorteio" : "Iniciar Sorteio"} <ArrowRight size={17} /></Button>
          </Card>
        </div>
        <div>
          <Card className="!rounded-[26px] p-6 sm:p-8">
            <div className="mb-8 flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ocean-950"><Trophy size={20} className="text-teal-500" /> Vista em direto</h2><p className="mt-1 text-sm text-slate-500">O mesmo que os participantes estão a ver.</p></div><span className={`size-2.5 rounded-full ${isSpinning ? "animate-pulse bg-amber-500" : "bg-teal-400"}`} /></div>
            <div className="mb-7 flex items-center justify-center"><DrawWheel compact draw={draw} clockOffsetMs={clockOffsetMs} /></div>
            <DrawStatus draw={draw} />
          </Card>
        </div>
      </div>
      <div className="mt-9"><DrawHistory history={history} loading={historyLoading} error={historyError} compact /></div>
    </div>
  );
}
