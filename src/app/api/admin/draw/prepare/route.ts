import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isRequestAuthenticated, isSameOriginMutation } from "@/lib/auth";
import { jsonError, FORBIDDEN, NO_STORE_HEADERS, UNAUTHORIZED } from "@/lib/api";
import { prepareDraw, toPublicDraw } from "@/lib/draw";
import { updateDrawState } from "@/lib/github";
import { MAX_ELIGIBLE_TICKETS } from "@/types/draw";

export const runtime = "nodejs";
const schema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  minTicket: z.number().int().positive().max(2_000_000_000),
  maxTicket: z.number().int().positive().max(2_000_000_000),
}).refine((input) => input.maxTicket >= input.minTicket &&
  input.maxTicket - input.minTicket + 1 <= MAX_ELIGIBLE_TICKETS, {
  message: `O intervalo deve conter entre 1 e ${MAX_ELIGIBLE_TICKETS} tickets.`,
});

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return FORBIDDEN();
  if (!isRequestAuthenticated(request)) return UNAUTHORIZED();
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || "Dados inválidos." }, { status: 400, headers: NO_STORE_HEADERS });
  try {
    const state = await updateDrawState((state) => prepareDraw(state, body.data), `Prepare draw ${body.data.id}`);
    return NextResponse.json({ currentDraw: toPublicDraw(state.currentDraw) }, { headers: NO_STORE_HEADERS });
  } catch (error) { return jsonError(error); }
}
