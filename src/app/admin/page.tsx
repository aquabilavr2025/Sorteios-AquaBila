import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { isAuthenticated } from "@/lib/auth";

export const metadata: Metadata = { title: "Administração", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAuthenticated();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><Brand /><Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-teal-600" href="/"><ArrowLeft size={16} /> Voltar aos sorteios</Link></div>
      </header>
      {authenticated ? <AdminDashboard /> : (
        <main className="flex flex-col items-center px-5 pb-20 pt-14 sm:pt-20">
          <div className="mb-7 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500"><ShieldCheck size={14} className="text-teal-500" /> Espaço seguro AquaBila</div>
          <LoginForm />
        </main>
      )}
    </div>
  );
}
