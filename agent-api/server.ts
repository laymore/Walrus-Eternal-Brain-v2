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
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize the Brain
const brain = new WalrusEternalBrain({
  delegateKeyHex: process.env.VITE_MEMWAL_DELEGATE_KEY || "",
  accountId: process.env.VITE_MEMWAL_ACCOUNT_ID || "",
  serverUrl: process.env.VITE_MEMWAL_SERVER_URL || "",
  currentProjectId: "local-agentic-api"
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', brain: 'WalrusEternalBrain Online' });
});

// Endpoint to retrieve context from Eternal Library
app.get('/api/context', async (req, res) => {
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
  try {
    const result = await brain.consolidateAndCleanSession();
    res.json({ success: true, message: result });
  } catch (err: any) {
    console.error("Error consolidating session:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🧠 Eternal Agent API Gateway running at http://localhost:${PORT}`);
  console.log(`- GET /api/context?q=keyword`);
  console.log(`- POST /api/trace { "trace": "..." }`);
  console.log(`- POST /api/consolidate`);
});
