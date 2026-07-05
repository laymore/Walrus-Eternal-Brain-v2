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

## Tools

| Tool | What it does |
|---|---|
| `brain_recall` | Pull context-optimized memory (Eternal Library + session) for a query — call BEFORE acting to save tokens. |
| `brain_consult_library` | When stuck, pull cross-project reference "books" (distilled reusable knowledge). |
| `brain_remember` | Record a working trace / fix into the Thinking Brain (tagged with `BRAIN_SOURCE_MODEL`). |
| `brain_consolidate` | Crystallize the session's working memory into durable facts (end-of-session "sleep"). |
| `brain_identity` | Who this brain is: identity + development-history version count. |
| `brain_library` | List the book-neurons (title, version, tags) + synapse count. |

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
