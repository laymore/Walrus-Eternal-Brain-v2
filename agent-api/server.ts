import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WalrusEternalBrain } from 'eternal-agent-brain-core';

// Setup basic environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Restrict CORS to an allow-list instead of opening the gateway to every
// origin. Configure via API_ALLOWED_ORIGINS (comma-separated); non-browser
// callers (no Origin header, e.g. curl / IDE tools) are always allowed.
const ALLOWED_ORIGINS = (process.env.API_ALLOWED_ORIGINS ||
  "http://localhost:5173,http://localhost:5174")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());

const PORT = process.env.PORT || 3001;

const DEFAULT_SESSION_ID = "local-agentic-api";
const brainCache = new Map<string, WalrusEternalBrain>();

function getBrain(sessionId: string): WalrusEternalBrain {
  if (brainCache.has(sessionId)) return brainCache.get(sessionId)!;
  const brain = new WalrusEternalBrain({
    delegateKeyHex: process.env.VITE_MEMWAL_DELEGATE_KEY || "",
    accountId: process.env.VITE_MEMWAL_ACCOUNT_ID || "",
    serverUrl: process.env.VITE_MEMWAL_SERVER_URL || "",
    currentProjectId: sessionId
  });
  brainCache.set(sessionId, brain);
  return brain;
}

// Simple Mutex Map to prevent concurrent consolidation per session
const consolidationMutex = new Map<string, boolean>();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', brain: 'WalrusEternalBrain Online' });
});

// Endpoint to retrieve context from Eternal Library
app.get('/api/context', async (req, res) => {
  const sessionId = (req.headers['x-session-id'] as string) || DEFAULT_SESSION_ID;
  const brain = getBrain(sessionId);
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  try {
    const contextStr = await brain.retrieveOptimizedContext(query);
    res.json({ context: contextStr });
  } catch (err: any) {
    console.error("Error retrieving context:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to record execution trace to Thinking Brain
app.post('/api/trace', async (req, res) => {
  const sessionId = (req.headers['x-session-id'] as string) || DEFAULT_SESSION_ID;
  const brain = getBrain(sessionId);
  const { trace } = req.body;
  if (!trace) {
    return res.status(400).json({ error: "Missing 'trace' in request body" });
  }

  try {
    await brain.recordExecutionTrace(trace);
    res.json({ success: true, message: "Execution trace recorded successfully to Walrus Thinking Brain." });
  } catch (err: any) {
    console.error("Error recording trace:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to force consolidation
app.post('/api/consolidate', async (req, res) => {
  const sessionId = (req.headers['x-session-id'] as string) || DEFAULT_SESSION_ID;
  const brain = getBrain(sessionId);
  
  if (consolidationMutex.get(sessionId)) {
    return res.status(429).json({ error: "Consolidation is already running for this session." });
  }

  consolidationMutex.set(sessionId, true);
  try {
    const result = await brain.consolidateAndCleanSession();
    res.json({ success: true, message: result });
  } catch (err: any) {
    console.error("Error consolidating session:", err);
    res.status(500).json({ error: err.message });
  } finally {
    consolidationMutex.set(sessionId, false);
  }
});

app.listen(PORT, () => {
  console.log(`🧠 Eternal Agent API Gateway running at http://localhost:${PORT}`);
  console.log(`- GET /api/context?q=keyword`);
  console.log(`- POST /api/trace { "trace": "..." }`);
  console.log(`- POST /api/consolidate`);
});
