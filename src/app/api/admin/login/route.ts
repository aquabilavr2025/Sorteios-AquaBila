import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  isSameOriginMutation,
  mayAttemptLogin,
  recordLoginAttempt,
  sessionCookieSettings,
  verifyCredentials,
} from "@/lib/auth";
import { FORBIDDEN, NO_STORE_HEADERS } from "@/lib/api";

export const runtime = "nodejs";
const schema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(512) });

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return FORBIDDEN();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!mayAttemptLogin(ip)) {
    return NextResponse.json({ error: "Demasiadas tentativas. Volta a tentar dentro de alguns minutos." }, {
      status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": "60" },
    });
  }

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Preenche o utilizador e a palavra-passe." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  let valid = false;
  try {
    valid = verifyCredentials(data.username, data.password);
  } catch {
    return NextResponse.json({ error: "O administrador ainda não está configurado no servidor." }, { status: 503, headers: NO_STORE_HEADERS });
  }
  recordLoginAttempt(ip, valid);
  if (!valid) {
    return NextResponse.json({ error: "Credenciais incorretas." }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let token: string;
  try { token = createSessionToken(); }
  catch { return NextResponse.json({ error: "Configura SESSION_SECRET para iniciar sessão." }, { status: 503, headers: NO_STORE_HEADERS }); }
  const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  response.cookies.set(sessionCookieSettings.name, token, sessionCookieSettings.options);
  return response;
}
