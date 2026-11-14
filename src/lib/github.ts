import { revalidateTag } from "next/cache";
import { z } from "zod";
import { DrawConflictError, removeExpiredDraws } from "@/lib/draw";
import type { DrawState } from "@/types/draw";

const isoDate = z.iso.datetime({ offset: true });
const waitingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  minTicket: z.number().int().positive(),
  maxTicket: z.number().int().positive(),
  status: z.literal("WAITING"),
  winningNumber: z.null(),
  startedAt: z.null(),
  completedAt: z.null(),
});
const spinningSchema = waitingSchema.extend({
  status: z.literal("SPINNING"),
  winningNumber: z.number().int().positive(),
  startedAt: isoDate,
  completedAt: isoDate,
});
const resultSchema = spinningSchema.omit({ status: true });
const drawStateSchema = z.object({
  currentDraw: z.union([waitingSchema, spinningSchema]).nullable(),
  history: z.array(resultSchema),
});

interface GitHubFile {
  sha: string;
  content: string;
  encoding: string;
}

export class GitHubStorageError extends Error {
  constructor(message: string, readonly httpStatus = 502) {
    super(message);
    this.name = "GitHubStorageError";
  }
}

class GitHubWriteConflictError extends Error {}

function getConfig() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_DATA_FILE } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new GitHubStorageError("O armazenamento GitHub ainda não está configurado.", 503);
  }
  const path = (GITHUB_DATA_FILE || "draws.json").split("/").map(encodeURIComponent).join("/");
  const owner = encodeURIComponent(GITHUB_OWNER);
  const repo = encodeURIComponent(GITHUB_REPO);
  return {
    token: GITHUB_TOKEN,
    branch: GITHUB_BRANCH || "main",
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  };
}

function headers(token: string): HeadersInit {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "AquaBila-Sorteios",
  };
}

async function readGithubFile(fresh: boolean): Promise<{ state: DrawState; sha: string }> {
  const cfg = getConfig();
  let response: Response;
  try {
    response = await fetch(`${cfg.url}?ref=${encodeURIComponent(cfg.branch)}`, {
      headers: headers(cfg.token),
      ...(fresh
        ? { cache: "no-store" as const }
        : { next: { revalidate: 2, tags: ["aquabila-draw-state"] } }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new GitHubStorageError("Não foi possível comunicar com o GitHub. Tenta novamente.");
  }
  if (response.status === 404) {
    throw new GitHubStorageError("Repositório ou draws.json não encontrado. Confirma a configuração e as permissões.", 503);
  }
  if (response.status === 401 || response.status === 403) {
    throw new GitHubStorageError("Não foi possível autenticar no armazenamento. Confirma o token e os respetivos acessos.", 503);
  }
  if (!response.ok) throw new GitHubStorageError("O GitHub não conseguiu devolver os dados.");

  try {
    const file = await response.json() as GitHubFile;
    if (file.encoding !== "base64" || !file.sha || !file.content) throw new Error("Invalid response");
    const parsed: unknown = JSON.parse(Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8"));
    const state = drawStateSchema.parse(parsed);
    return { state, sha: file.sha };
  } catch {
    throw new GitHubStorageError("O ficheiro draws.json contém dados inválidos.", 503);
  }
}

export async function getDrawState(fresh = false): Promise<DrawState> {
  const { state } = await readGithubFile(fresh);
  return state;
}

async function writeGithubFile(state: DrawState, sha: string, message: string): Promise<void> {
  const cfg = getConfig();
  let response: Response;
  try {
    response = await fetch(cfg.url, {
      method: "PUT",
      headers: { ...headers(cfg.token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: Buffer.from(JSON.stringify(state, null, 2) + "\n").toString("base64"),
        sha,
        branch: cfg.branch,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // An HTTP timeout can happen after Github committed. Callers should
    // retry with the SAME idempotency key, not invent a new one.
    throw new GitHubStorageError("Não foi possível confirmar a gravação. Atualiza antes de repetir a operação.");
  }
  if (response.status === 409) throw new GitHubWriteConflictError();
  if (!response.ok) throw new GitHubStorageError("Não foi possível guardar o sorteio no GitHub. Confirma as permissões de escrita.");
  // Keep public reads fresh. Admin reads are always no-store.
  revalidateTag("aquabila-draw-state", { expire: 0 });
}

// Each retry reads a NEW SHA and re-evaluates the action against the new
// state. This is essential on Vercel because memory locks are not shared.
export async function updateDrawState(
  change: (state: DrawState) => DrawState,
  message: string,
): Promise<DrawState> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { state, sha } = await readGithubFile(true);
    const updated = removeExpiredDraws(change(state));
    if (JSON.stringify(state) === JSON.stringify(updated)) return state;
    try {
      await writeGithubFile(updated, sha, message);
      return updated;
    } catch (error) {
      if (error instanceof GitHubWriteConflictError) continue;
      throw error;
    }
  }
  throw new DrawConflictError("O ficheiro mudou durante a operação. Tenta novamente.");
}
