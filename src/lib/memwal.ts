import { MemWal } from "@mysten-incubation/memwal";
import { notify } from "./toast";

const ACCOUNT_ID = import.meta.env.VITE_MEMWAL_ACCOUNT_ID;
const DELEGATE_KEY = import.meta.env.VITE_MEMWAL_DELEGATE_KEY;
const SERVER_URL = import.meta.env.DEV
  ? (typeof window !== "undefined"
      ? `${window.location.origin}/walrus-relayer`
      : import.meta.env.VITE_MEMWAL_SERVER_URL)
  : import.meta.env.VITE_MEMWAL_SERVER_URL;

export const DEV_WALLET = (import.meta.env.VITE_DEV_WALLET_ADDRESS ?? "").toLowerCase();

if (!ACCOUNT_ID || !DELEGATE_KEY || !SERVER_URL) {
  console.warn(
    "[memwal] Missing env. Run scripts/setup-account.mjs and fill .env: " +
      "VITE_MEMWAL_ACCOUNT_ID, VITE_MEMWAL_DELEGATE_KEY, VITE_MEMWAL_SERVER_URL.",
  );
}

function clientFor(namespace: string) {
  return MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace,
  });
}

function reportErr(scope: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[memwal:${scope}]`, err);
  notify("error", `${scope}: ${msg}`);
}

// Canonical message-to-sign for forum posts. Anyone (verifier) can rebuild it
// from the on-storage fields, so any tampered field invalidates the signature.
export function canonicalForumMessage(p: {
  postId: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  timestamp: number;
}): string {
  return [
    "WALRUS_FORUM_POST_V1",
    p.postId,
    p.author,
    String(p.timestamp),
    JSON.stringify(p.tags ?? []),
    p.title,
    p.content,
  ].join("\n");
}

export function canonicalChatMessage(p: {
  author: string;
  content: string;
  timestamp: number;
}): string {
  return [
    "WALRUS_FORUM_CHAT_V1",
    p.author,
    String(p.timestamp),
    p.content,
  ].join("\n");
}

export function canonicalModerationMessage(p: {
  targetBlobId: string;
  action: "HIDE" | "UNHIDE";
  timestamp: number;
}): string {
  return [
    "WALRUS_FORUM_MOD_V1",
    p.action,
    p.targetBlobId,
    String(p.timestamp),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// NS_01: Lobby Chat
// ---------------------------------------------------------------------------
const chatClient = clientFor("NS_01_lobby_chat");

export type ChatMessage = {
  author: string;
  content: string;
  timestamp: number;
  signature?: string;
  blobId?: string;
};

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  try {
    const res = await chatClient.recall({ query: "message", limit: 20 });
    return res.results
      .map((r: { text: string, blob_id: string }) => {
        try { 
          const msg = JSON.parse(r.text) as ChatMessage;
          msg.blobId = r.blob_id;
          return msg;
        } catch { return null; }
      })
      .filter((x): x is ChatMessage => !!x)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    reportErr("fetchChatMessages", err);
    return [];
  }
}

export async function publishChatMessage(
  author: string,
  content: string,
  timestamp: number,
  signature: string,
) {
  const payload = JSON.stringify({ author, content, timestamp, signature });
  const job = await chatClient.remember(payload);
  await chatClient.waitForRememberJob(job.job_id);
}

// ---------------------------------------------------------------------------
// NS_02: Forum Posts
// ---------------------------------------------------------------------------
const forumClient = clientFor("NS_02_forum_posts");

export type ForumPostRaw = {
  type?: string;
  postId: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  timestamp: number;
  signature?: string;
};

export type ForumPostHydrated = ForumPostRaw & {
  id: string;
  blobId: string;
  date: string;
  similarity: number;
};

export async function fetchForumPosts(q: string = ""): Promise<ForumPostHydrated[]> {
  try {
    const res = await forumClient.recall({
      query: q || "post",
      limit: 10,
      maxDistance: q ? 0.9 : 0.85,
    });
    return res.results
      .map((post: { text: string; blob_id: string; distance: number }) => {
        try {
          const d = JSON.parse(post.text) as ForumPostRaw;
          if (d.type && d.type !== "FORUM_POST") return null;
          return {
            ...d,
            id: d.postId,
            blobId: post.blob_id,
            date: new Date(d.timestamp).toLocaleString(),
            similarity: 1 - post.distance,
            tags: d.tags ?? [],
          } as ForumPostHydrated;
        } catch { return null; }
      })
      .filter((p): p is ForumPostHydrated => !!p && !!p.postId);
  } catch (err) {
    reportErr("fetchForumPosts", err);
    return [];
  }
}

export async function publishForumPost(
  post: ForumPostRaw,
): Promise<string> {
  const payload = JSON.stringify({ type: "FORUM_POST", ...post });
  const job = await forumClient.remember(payload);
  const result = await forumClient.waitForRememberJob(job.job_id);
  return result.blob_id;
}

// ─── NS_02: News Items ─────────────────────────────────
export type NewsItem = {
  type: 'news';
  text: string;
  timestamp: number;
  source: 'twitter' | 'manual';
  source_url?: string;
  source_handle?: string;
};

export async function fetchNewsItems(limit: number = 50): Promise<NewsItem[]> {
  try {
    const res = await forumClient.recall({ query: 'type:news', limit });
    return res.results
      .map((r: { text: string; blob_id: string }) => {
        try {
          const parsed = JSON.parse(r.text);
          if (parsed.type === 'news') return parsed as NewsItem;
          return null;
        } catch { return null; }
      })
      .filter((x): x is NewsItem => !!x)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    reportErr('fetchNewsItems', err);
    return [];
  }
}

export async function publishNewsItem(item: NewsItem): Promise<string> {
  const payload = JSON.stringify(item);
  const job = await forumClient.remember(payload);
  const result = await forumClient.waitForRememberJob(job.job_id);
  return result.blob_id;
}

// Re-export forumClient as newsClient for NS_02_NewsFeed
const newsClient = forumClient;
export { forumClient, newsClient };

// ---------------------------------------------------------------------------
// NS_03: File Vault
// ---------------------------------------------------------------------------
const vaultClient = clientFor("NS_03_file_vault");

export type FileEntry = {
  type?: string;
  fileName: string;
  fileSize: number;
  blobId: string;
  uploader: string;
  description: string;
  timestamp: number;
};

export async function fetchFileMetadata(): Promise<FileEntry[]> {
  try {
    const res = await vaultClient.recall({ query: "file", limit: 20 });
    return res.results
      .map((r: { text: string }) => {
        try { return JSON.parse(r.text) as FileEntry; } catch { return null; }
      })
      .filter((x): x is FileEntry => !!x && !!x.fileName);
  } catch (err) {
    reportErr("fetchFileMetadata", err);
    return [];
  }
}

export async function publishFileMetadata(entry: FileEntry) {
  const payload = JSON.stringify({ type: "FILE_ATTACHMENT", ...entry });
  const job = await vaultClient.remember(payload);
  await vaultClient.waitForRememberJob(job.job_id);
}

// ---------------------------------------------------------------------------
// NS_04: Prediction Ledger
// ---------------------------------------------------------------------------
const predictionClient = clientFor("NS_04_prediction_ledger");

export type Prediction = {
  id?: string;
  author: string;
  match: string;
  prediction: string;
  confidence: number;
  timestamp: number;
  signature?: string;
};

export async function fetchPredictions(): Promise<Prediction[]> {
  try {
    const res = await predictionClient.recall({ query: "PREDICTION match", limit: 50 });
    return res.results
      .map((r: { text: string }) => {
        try { return JSON.parse(r.text) as Prediction; } catch { return null; }
      })
      .filter((x): x is Prediction => !!x && !!x.match)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    reportErr("fetchPredictions", err);
    return [];
  }
}

export function canonicalPrediction(p: Omit<Prediction, 'id' | 'signature'>) {
  return `PREDICTION:${p.author}:${p.match}:${p.prediction}:${p.confidence}:${p.timestamp}`;
}

export async function publishPrediction(p: Omit<Prediction, 'id'>) {
  const payload = JSON.stringify(p);
  const job = await predictionClient.remember(payload);
  await predictionClient.waitForRememberJob(job.job_id);
}

// ---------------------------------------------------------------------------
// Match Results (Admin Only)
// ---------------------------------------------------------------------------
const matchResultClient = clientFor("NS_04_match_results");

export type MatchResult = {
  matchId: string;
  winner: string;
  admin: string;
  timestamp: number;
  signature: string;
};

export async function fetchMatchResults(): Promise<MatchResult[]> {
  try {
    const res = await matchResultClient.recall({ query: "result match", limit: 50 });
    return res.results
      .map((r: { text: string }) => {
        try { return JSON.parse(r.text) as MatchResult; } catch { return null; }
      })
      .filter((x): x is MatchResult => !!x);
  } catch (err) {
    reportErr("fetchMatchResults", err);
    return [];
  }
}

export function canonicalMatchResult(p: { matchId: string; winner: string; timestamp: number }): string {
  return `MATCH_RESULT:${p.matchId}:${p.winner}:${p.timestamp}`;
}

export async function publishMatchResult(entry: MatchResult) {
  const payload = JSON.stringify(entry);
  const job = await matchResultClient.remember(payload);
  await matchResultClient.waitForRememberJob(job.job_id);
}

// ---------------------------------------------------------------------------
// Dynamic Events (Admin Only Creation)
// ---------------------------------------------------------------------------
const eventClient = clientFor("NS_04_events");

export type MatchNode = {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
  winner?: string;
  nextMatchId?: string;
  nextMatchSlot?: 'A' | 'B';
  draw?: boolean;
  drawLabel?: string;
};

export type EventConfig = {
  eventId: string;
  title: string;
  type: 'bracket' | 'list';
  matches: Record<string, MatchNode>;
  admin: string;
  timestamp: number;
  signature: string;
};

export async function fetchEvents(): Promise<EventConfig[]> {
  try {
    const res = await eventClient.recall({ query: "World Cup event type", limit: 20 });
    return res.results
      .map((r: { text: string }) => {
        try { return JSON.parse(r.text) as EventConfig; } catch { return null; }
      })
      .filter((x): x is EventConfig => !!x);
  } catch (err) {
    reportErr("fetchEvents", err);
    return [];
  }
}

export function canonicalEventConfig(p: { eventId: string; title: string; type: string; timestamp: number }): string {
  return `EVENT_CONFIG:${p.eventId}:${p.title}:${p.type}:${p.timestamp}`;
}

export async function publishEventConfig(entry: EventConfig) {
  const payload = JSON.stringify(entry);
  const job = await eventClient.remember(payload);
  await eventClient.waitForRememberJob(job.job_id);
}

// ---------------------------------------------------------------------------
// NS_05: Reputational Profiles — DERIVED client-side from on-chain predictions
// + resolved match winners (no separate namespace needed; nothing to "publish").
// ---------------------------------------------------------------------------

export type ReputationProfile = {
  author: string;
  total: number;        // predictions made
  resolved: number;     // predictions whose match has a winner on-chain
  correct: number;      // resolved predictions that were right
  accuracy: number;     // correct / resolved   (0..1)
  avgConfidence: number;// 0..1
  calibration: number;  // avgConfidence - accuracy ; >0 = overconfident
  driftScore: number;   // 0..1 ; how erratic confidence is (stdev, normalized)
  score: number;        // 0..100 reputation
  lastActive: number;
};

// Collect winners from all events' resolved matches.
export function collectWinners(events: EventConfig[]): string[] {
  const winners: string[] = [];
  for (const e of events) {
    for (const m of Object.values(e.matches)) {
      if (m.winner) winners.push(m.winner);
    }
  }
  return winners;
}

/**
 * Build per-author reputation purely from data we already trust on-chain:
 *  - predictions (NS_04) — signed by each author
 *  - resolved winners (from admin-signed events)
 * A prediction is "resolved" when its match string contains a known winner
 * (match titles carry both team names, so a loss is still detectable);
 * it is "correct" when the pick equals that winner.
 */
export function computeReputation(
  predictions: Prediction[],
  events: EventConfig[],
): ReputationProfile[] {
  const winners = collectWinners(events);
  const byAuthor = new Map<string, Prediction[]>();
  for (const p of predictions) {
    if (!p.author) continue;
    (byAuthor.get(p.author) ?? byAuthor.set(p.author, []).get(p.author)!).push(p);
  }

  const profiles: ReputationProfile[] = [];
  for (const [author, preds] of byAuthor) {
    let resolved = 0;
    let correct = 0;
    const confidences = preds.map(p => Math.max(0, Math.min(100, p.confidence)) / 100);

    for (const p of preds) {
      const winner = winners.find(w => p.match.includes(w));
      if (winner) {
        resolved++;
        if (p.prediction === winner) correct++;
      }
    }

    const total = preds.length;
    const accuracy = resolved > 0 ? correct / resolved : 0;
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / total;

    // stdev of confidence → "drift": someone who swings 50%↔100% is erratic
    const mean = avgConfidence;
    const variance = confidences.reduce((a, c) => a + (c - mean) ** 2, 0) / total;
    const driftScore = Math.min(1, Math.sqrt(variance) * 2);

    const calibration = avgConfidence - accuracy;

    // Reputation: reward accuracy, give a small volume bonus, penalise
    // overconfidence (positive calibration gap). Bounded 0..100.
    let score = accuracy * 80;
    score += Math.min(20, resolved * 2);            // volume, capped
    score -= Math.max(0, calibration) * 40;         // overconfidence penalty
    score = Math.max(0, Math.min(100, Math.round(score)));

    profiles.push({
      author, total, resolved, correct, accuracy, avgConfidence,
      calibration, driftScore, score,
      lastActive: Math.max(...preds.map(p => p.timestamp)),
    });
  }

  // Highest reputation first; unresolved-only authors sink toward the bottom.
  return profiles.sort((a, b) => b.score - a.score || b.resolved - a.resolved);
}

// ---------------------------------------------------------------------------
// NS_07: Moderation (admin-only writes, public reads, signed by DEV_WALLET)
// ---------------------------------------------------------------------------
const modClient = clientFor("NS_07_moderation");

export type ModEntry = {
  type: "MOD_HIDE" | "MOD_UNHIDE";
  targetBlobId: string;
  reason?: string;
  admin: string;
  timestamp: number;
  signature: string;
};

let cachedModEntries: ModEntry[] | null = null;
let lastModFetch = 0;

export async function fetchModerationEntries(): Promise<ModEntry[]> {
  if (cachedModEntries && Date.now() - lastModFetch < 15000) {
    return cachedModEntries;
  }
  try {
    const res = await modClient.recall({ query: "moderation", limit: 15 });
    const entries = res.results
      .map((r: { text: string }) => {
        try { return JSON.parse(r.text) as ModEntry; } catch { return null; }
      })
      .filter((x): x is ModEntry => !!x);
    cachedModEntries = entries;
    lastModFetch = Date.now();
    return entries;
  } catch (err) {
    reportErr("fetchModerationEntries", err);
    return cachedModEntries || [];
  }
}

export async function publishModerationEntry(entry: ModEntry) {
  const payload = JSON.stringify(entry);
  const job = await modClient.remember(payload);
  await modClient.waitForRememberJob(job.job_id);
}
