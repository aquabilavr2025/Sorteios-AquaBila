import { NextResponse } from "next/server";
import { DrawConflictError } from "@/lib/draw";
import { GitHubStorageError } from "@/lib/github";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export function jsonError(error: unknown): NextResponse {
  if (error instanceof DrawConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409, headers: NO_STORE_HEADERS });
  }
  if (error instanceof GitHubStorageError) {
    return NextResponse.json({ error: error.message }, { status: error.httpStatus, headers: NO_STORE_HEADERS });
  }
  if (error instanceof Error && /^(O intervalo|Indica um nome|Falha na geração)/.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE_HEADERS });
  }
  console.error("Unexpected server error:", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "Ocorreu um erro inesperado. Tenta novamente." }, { status: 500, headers: NO_STORE_HEADERS });
}

export const UNAUTHORIZED = () => NextResponse.json(
  { error: "A tua sessão expirou. Inicia sessão novamente." },
  { status: 401, headers: NO_STORE_HEADERS },
);
export const FORBIDDEN = () => NextResponse.json(
  { error: "Pedido não autorizado." },
  { status: 403, headers: NO_STORE_HEADERS },
);
