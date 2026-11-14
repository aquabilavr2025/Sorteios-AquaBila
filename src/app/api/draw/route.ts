import { NextResponse } from "next/server";
import { getDrawState } from "@/lib/github";
import { toPublicDraw } from "@/lib/draw";
import { jsonError, NO_STORE_HEADERS } from "@/lib/api";
import { SPIN_DURATION_MS, type DrawResponse } from "@/types/draw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getDrawState();
    const now = Date.now();
    const payload: DrawResponse = {
      currentDraw: toPublicDraw(state.currentDraw, now),
      durationMs: SPIN_DURATION_MS,
      serverNow: new Date(now).toISOString(),
    };
    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (error) { return jsonError(error); }
}
