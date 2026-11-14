import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isRequestAuthenticated, isSameOriginMutation } from "@/lib/auth";
import { jsonError, FORBIDDEN, NO_STORE_HEADERS, UNAUTHORIZED } from "@/lib/api";
import { startDraw, toPublicDraw } from "@/lib/draw";
import { updateDrawState } from "@/lib/github";

export const runtime = "nodejs";
const schema = z.object({ drawId: z.uuid() });

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return FORBIDDEN();
  if (!isRequestAuthenticated(request)) return UNAUTHORIZED();
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Identificador do sorteio inválido." }, { status: 400, headers: NO_STORE_HEADERS });
  try {
    const state = await updateDrawState((state) => startDraw(state, body.data.drawId), `Start draw ${body.data.drawId}`);
    return NextResponse.json({ currentDraw: toPublicDraw(state.currentDraw) }, { headers: NO_STORE_HEADERS });
  } catch (error) { return jsonError(error); }
}
