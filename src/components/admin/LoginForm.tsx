"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, KeyRound, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao iniciar sessão.");
      setPassword("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar sessão.");
    } finally { setLoading(false); }
  }

  return (
    <Card className="mx-auto w-full max-w-[460px] !rounded-[28px] p-7 sm:p-9">
      <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><LockKeyhole size={28} /></div>
      <p className="text-xs font-bold uppercase tracking-[.22em] text-teal-600">Acesso reservado</p>
      <h1 className="mt-2 text-[31px] font-black tracking-[-.05em] text-ocean-950">Bem-vindo de volta.</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">Entra com as tuas credenciais para gerir os sorteios AquaBila.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2"><Label htmlFor="username">Utilizador</Label><div className="relative"><UserRound size={18} className="pointer-events-none absolute left-4 top-3.5 text-slate-400" /><Input id="username" autoComplete="username" required maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} className="pl-11" placeholder="O teu utilizador" /></div></div>
        <div className="space-y-2"><Label htmlFor="password">Palavra-passe</Label><div className="relative"><KeyRound size={18} className="pointer-events-none absolute left-4 top-3.5 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="pl-11" placeholder="A tua palavra-passe" /></div></div>
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? "A entrar..." : "Entrar na administração"} <ArrowRight size={17} /></Button>
      </form>
      <p className="mt-7 text-center text-xs text-slate-400">Área exclusiva para o administrador AquaBila.</p>
    </Card>
  );
}
