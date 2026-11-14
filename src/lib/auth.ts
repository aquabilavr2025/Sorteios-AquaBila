import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "aquabila_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const attempts = new Map<string, { count: number; startedAt: number; blockedUntil: number }>();

function secureEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function getSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw new Error("SESSION_SECRET em falta ou demasiado curto.");
  return value;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !encoded) throw new Error("Credenciais de administrador não configuradas.");
  const [algorithm, salt, expected] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !expected || !/^[0-9a-f]{32}$/i.test(salt) || !/^[0-9a-f]{128}$/i.test(expected)) {
    throw new Error("ADMIN_PASSWORD_HASH inválido.");
  }

  // Always perform the expensive operation, even for unknown usernames.
  const calculated = scryptSync(password, Buffer.from(salt, "hex"), 64);
  const passwordMatches = secureEqual(calculated, Buffer.from(expected, "hex"));
  const userMatches = secureEqual(Buffer.from(username), Buffer.from(expectedUsername));
  return passwordMatches && userMatches;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export function createSessionToken(): string {
  const payload = Buffer.from(JSON.stringify({ role: "admin", exp: Date.now() + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function validateSessionToken(token: string | undefined): boolean {
  if (!token || token.length > 500) return false;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length) return false;
  try {
    if (!secureEqual(Buffer.from(signature), Buffer.from(sign(payload)))) return false;
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data || typeof data !== "object") return false;
    const session = data as { role?: unknown; exp?: unknown };
    return session.role === "admin" && typeof session.exp === "number" && session.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return validateSessionToken(store.get(COOKIE_NAME)?.value);
}

export function isRequestAuthenticated(request: NextRequest): boolean {
  return validateSessionToken(request.cookies.get(COOKIE_NAME)?.value);
}

export const sessionCookieSettings = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  },
};

// Basic best-effort rate limiting, NOT a globally shared distributed lock.
// See README for the limitations of stateless serverless functions.
export function mayAttemptLogin(ip: string): boolean {
  const value = attempts.get(ip);
  if (!value) return true;
  if (Date.now() - value.startedAt > 15 * 60 * 1000) { attempts.delete(ip); return true; }
  return value.blockedUntil <= Date.now();
}

export function recordLoginAttempt(ip: string, success: boolean): void {
  if (success) { attempts.delete(ip); return; }
  const now = Date.now();
  const previous = attempts.get(ip);
  const sameWindow = previous && now - previous.startedAt < 15 * 60 * 1000;
  const count = (sameWindow ? previous.count : 0) + 1;
  attempts.set(ip, {
    count,
    startedAt: sameWindow ? previous.startedAt : now,
    blockedUntil: count >= 5 ? now + Math.min((count - 4) * 60_000, 15 * 60_000) : 0,
  });
  if (attempts.size > 2000) attempts.clear();
}

export function isSameOriginMutation(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  // `Origin` is sent for normal browser POSTs. Direct API calls can lack it.
  if (!origin) return !fetchSite;
  return origin === request.nextUrl.origin;
}
