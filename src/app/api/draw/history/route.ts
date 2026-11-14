import { NextResponse } from "next/server";
import { getDrawState } from "@/lib/github";
import { filterHistory } from "@/lib/draw";
import { jsonError, NO_STORE_HEADERS } from "@/lib/api";
import type { HistoryResponse } from "@/types/draw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getDrawState();
    const now = Date.now();
    const payload: HistoryResponse = {
      history: filterHistory(state.history, now),
      serverNow: new Date(now).toISOString(),
    };
    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (error) { return jsonError(error); }
}
