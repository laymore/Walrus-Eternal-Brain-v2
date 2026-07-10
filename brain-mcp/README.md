# brain-mcp — one brain, many models

An MCP server that exposes the **Walrus Eternal Brain** to any MCP-capable
model-client (Claude Code, Antigravity, Cursor, Claude Desktop, …). The model
calls the brain as tools — no glue code, language-agnostic. The core library
stays the engine; this is the universal socket.

## Build

```bash
cd eternal-agent-brain/brain-mcp
npm install
npm run build      # → dist/server.js
```

## Division of labor with codebase-memory-mcp (recommended pairing)

Run this server **side-by-side** with [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)
(one-line install; it auto-configures Claude Code, Antigravity, Cursor, and 8 other clients):

> **Ask CBM about the code. Ask the brain about the lessons.**

| Question | Tool to use |
|---|---|
| "Who calls `processOrder`?" / structure, routes, impact of a diff | CBM (`search_graph`, `trace_path`, `detect_changes`, `get_architecture`) |
| "How did we solve this class of problem before?" / gotchas, playbooks | brain (`brain_consult_library`, `brain_read_book`) |
| Start / finish a project | brain (`brain_start_project` / `brain_shelve_project` — pass CBM's `get_architecture` digest into `architecture_digest` so the book carries the real structure summary) |

Memory tiering: your **short-term memory is your own context window**; the
**codebase structure** lives in CBM's local, rebuildable graph (never pushed
on-chain); the **Eternal Library** stores only distilled, precious knowledge —
`brain_remember` enforces this (importance gate, dedup, session budget).

## Tools

| Tool | What it does |
|---|---|
| `brain_recall` | Pull context-optimized memory (Eternal Library + session) for a query — call BEFORE acting to save tokens. |
| `brain_consult_library` | When stuck, pull cross-project TL;DR cards (optionally filtered by `domain`). |
| `brain_read_book` | Pull the FULL text of one book by `book_id` after its TL;DR looks relevant. |
| `brain_remember` | Persist ONE precious insight (importance 1–5; <3 refused, near-duplicates skipped, session budget 20). |
| `brain_consolidate` | Crystallize the session's working memory into durable facts (end-of-session "sleep"). |
| `brain_identity` | Universal Identity in your framework's format + current **librarian rank** (maturity from on-chain metrics). |
| `brain_library` | List the book-neurons (title, version, tags) + synapse count. |
| `brain_start_project` | Open a project namespace + kickoff briefing from the library (accepts `domain`). |
| `brain_shelve_project` | Finish a project: consolidate + shelve as a book (accepts `tl_dr`, `architecture_digest` from CBM, `project_dir` for graph-artifact provenance). |

## Configure a client (example)

`stdio` transport. Point any MCP client at `dist/server.js` and pass the brain
credentials via env. **Do not commit real keys** — the delegate key is write-capable.

```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["C:/Users/admin/Desktop/Walrus Forum/eternal-agent-brain/brain-mcp/dist/server.js"],
      "env": {
        "MEMWAL_ACCOUNT_ID": "0x9c2d53a49a71f4843e6d3eb8c798b25256e02febefa73c29cc20e502db91c452",
        "MEMWAL_DELEGATE_KEY": "<your delegate key>",
        "MEMWAL_SERVER_URL": "https://relayer.memory.walrus.xyz",
        "BRAIN_PROJECT_ID": "my-project",
        "BRAIN_SOURCE_MODEL": "antigravity"
      }
    }
  }
}
```

Set `BRAIN_SOURCE_MODEL` per client (e.g. `antigravity`, `cursor`, `claude-code`)
so remembered traces carry model provenance — every model writes to the **same**
brain, and recall attributes who contributed what.

## Env vars

- `MEMWAL_ACCOUNT_ID` (or `VITE_MEMWAL_ACCOUNT_ID`) — the shared MemWal account.
- `MEMWAL_DELEGATE_KEY` (or `VITE_MEMWAL_DELEGATE_KEY`) — a delegate authorized on that account.
- `MEMWAL_SERVER_URL` — default `https://relayer.memory.walrus.xyz`.
- `BRAIN_PROJECT_ID` — isolates the Thinking Brain per project (default `mcp-session`).
- `BRAIN_SOURCE_MODEL` — provenance tag for `brain_remember`.
