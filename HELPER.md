# 📖 HELPER — The Complete Guide to Walrus Eternal Brain

> **Read this first.** Whether you are a human developer or an AI agent plugging in
> through MCP, this file gives you the full mental model: what this project is,
> how every feature works, and the logic behind each design decision.

---

## 1. What is this?

**The Eternal Data Library for agents** — sovereign, on-chain knowledge storage &
retrieval built on [Sui](https://sui.io) + [Walrus](https://walrus.xyz) (MemWal).

The core loop:

```
finish a project  →  it becomes a "book"  →  the NEXT project consults the shelf
                                              instead of re-solving from scratch
```

Guiding principles:

- **One brain, many models** — Claude Code, Antigravity, Cursor, GPT, Gemini…
  all plug into the *same* sovereign brain via MCP. The model is stateless
  compute; the memory is portable and owned by ONE dev wallet.
- **Forgetting is a privilege** — knowledge never dies; it *sleeps* inside books
  and *wakes* when the right keyword calls it.
- **Import only when necessary** — every model already has short-term memory
  (its context window). The library persists only distilled, precious knowledge.
- **Append-only truth** — Walrus blobs are immutable. Nothing is ever edited in
  place: books, identity, corrections are all *new versions/pages*, so the full
  history is always auditable.

---

## 2. Architecture at a glance

```
┌────────────────────────── MODEL-CLIENTS ──────────────────────────┐
│   Claude Code · Antigravity · Cursor · any MCP-capable client     │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │ MCP (stdio)                  │ (optional, local)
        ┌──────▼──────┐                ┌──────▼──────────────┐
        │  brain-mcp  │                │ codebase-memory-mcp │
        │  (9 tools)  │                │ (structure of the   │
        └──────┬──────┘                │  CURRENT codebase)  │
               │                       └─────────────────────┘
        ┌──────▼──────────────┐
        │ eternal-agent-brain │  packages/core — WalrusEternalBrain
        │        -core        │  (all logic lives here)
        └──────┬──────────────┘
               │ HTTPS (delegate-key signed)
        ┌──────▼──────────┐        ┌───────────────┐
        │  MemWal Relayer │───────▶│ Walrus (blobs)│  eternal storage
        └──────┬──────────┘        └───────────────┘
               │
        ┌──────▼──────────┐
        │  Sui mainnet    │  MemWalAccount (ownership, delegate keys)
        └─────────────────┘
```

### 2.1 Two-Scope Hybrid (the canonical memory model)

| Scope | Namespace | Role |
|---|---|---|
| **Living Brain** (per-project) | `NS_BRAIN_identity / episodic / semantic / procedural / meta` | The agent's cognition while working: who am I, what happened, what I learned, what I can do, do I know that I know |
| **Eternal Library** (cross-project) | `eternal:global:associative-core` | The book shelf: distilled, reusable knowledge shared across ALL projects |
| **Thinking Brain** (per-session) | `eternal:project:<id>` (epoch-rotated) | Short-term working traces; actively forgotten after consolidation |

### 2.2 Memory-tiering doctrine (why we don't write everything)

| Tier | Where | Nature | Write policy |
|---|---|---|---|
| Short-term | the model's own context window | already exists | **never persisted by us** |
| Codebase structure | codebase-memory-mcp local graph | rebuildable in minutes, disposable | never pushed on-chain |
| Working traces | Thinking Brain (epoch-rotated) | temporary | light gate (importance ≥3, dedup, budget) |
| Books | Eternal Library (Walrus) | **eternal** | strict gate — distilled at checkpoints only |

---

## 3. Core concepts & the logic behind them

### 3.1 Books = Neurons
Every unit of knowledge is a **book** (`LIBRARY_BOOK` record) with:
`book_id` (stable slug), `version`, `title`, `content`, `tl_dr` (3-line card),
`tags` (the wake-up keywords), `status` (`building | complete | sleeping`),
`domain_context` (e.g. web3/mobile), `origin` (manual|agent), `source_model`.

**Logic:** books are *append-only versioned* — editing a book appends
`version+1` with the same `book_id`. The old versions remain forever: every
book carries its own development history, exactly like the identity does.

### 3.2 Synapses (BOOK_LINK)
Explicit lineage edges: *"project A reused code/knowledge from book B"*
(`BOOK_LINK {from_book_id, to_book_id, reason}`). Books can be linked or
isolated. On the Neuron Map these lines are hidden until you click a neuron.

### 3.3 Sleeping & Waking (the "forgetting is a privilege" mechanic)
- `status: sleeping` books are **excluded from semantic (vector) recall**.
- Only an **exact keyword/tag match** wakes a sleeping book (⏰).
- **Logic:** as the eternal archive grows, recall would drown in noise
  (de-sparsification). Sleep keeps the index sparse without deleting anything —
  knowledge is never lost, just resting until the right keyword calls.

### 3.4 Two-tier retrieval (`consultLibrary`)
1. **Keyword tier** — exact token matches on tags/title. Precise, cheap, and
   the only thing that can wake a sleeping book.
2. **Vector tier** — semantic recall for association (sleeping books stay asleep).

Results are **TL;DR index cards** (`[book_id]` + 3-line summary + badges
🔑 keyword / ≈ semantic / 😴→⏰ woke / 🚧 building / ⚠ cross-domain), NOT full
text. **Logic:** dumping full books blows the agent's context window; the agent
calls `brain_read_book(book_id)` only for cards that look relevant.

### 3.5 Errata / Correction Books (the "Garbage Vault")
Walrus is immutable — a wrong book cannot be deleted. Instead a
`CORRECTION_BOOK` links back to the flawed book, and `consultLibrary`
**automatically prepends "⚠ ERRATA: …"** whenever the flawed book is returned.
**Logic:** agents must never silently inherit permanently recorded mistakes.

### 3.6 Domain context (the "Tower of Babel" fix)
Books carry `domain_context`; consult accepts a `domain` param. Cross-domain
books are **deprioritized and flagged** ("⚠ cross-domain"), not hidden.
**Logic:** a "deploy playbook" for web3 must not silently override one for
mobile — but the agent should still see it exists.

### 3.7 Identity Evolution (the character's life story)
Identity is append-only + versioned + **signed**:

- **Hard truth:** the dev wallet = the on-chain `MemWalAccount.owner`, read
  live — never hardcoded. A legitimate ownership transfer auto-heals identity.
- **Soft fields** (project name, persona, mission): each change appends a new
  version **signed by the current dev wallet**; latest validly-signed wins.
- **Drift alarm:** a version whose signer ≠ on-chain owner is rejected.

The chain of versions IS the agent's autobiography, e.g. the real one on-chain:

```
v1 [seed]      "Mini Forum"                      ← born
v2 ✓ signed    renamed → "Walrus Eternal Brain"
v3 ✓ signed    Universal Identity (persona/runtime/collaborators)
v4 ✓ signed    mission → Eternal Data Librarian
v5 ✓ signed    🎓 PROMOTED → Archivist (metrics frozen in)
```

### 3.8 Universal Identity (one soul, many frameworks)
`projectIdentity(identity, format)` projects the same identity into any
framework's native shape: `system-prompt` (ready-to-use directive), `eliza`
(bio/lore/style), `openhands` (runtime/capabilities/constraints), `crewai`
(role/goal/backstory), `full`. **Logic:** every model that plugs in recognizes
the *same entity* in the format it natively understands.

### 3.9 Librarian Maturity (growth stages)
`computeMaturity()` derives a rank from **real on-chain metrics** — never
self-declared:

| Rank | Requires (cumulative) |
|---|---|
| Novice Scribe | an identity |
| Apprentice Librarian | ≥3 books |
| **Archivist** | ≥7 books **and ≥1 errata filed** (a librarian corrects the record) |
| Curator | ≥12 books, ≥1 synapse, ≥1 calibrated skill |
| Master Librarian | ≥20 books, ≥2 domains |
| Eternal Librarian | ≥40 books, ≥3 domains, ≥5 synapses |

`identity-evolve --promote` records a rank crossing as a **signed identity
version** with the metrics snapshot frozen in — the promotion becomes a page in
the life story. The rank is shown in the web UI and appended to every
`brain_identity` projection ("You are …, an Archivist-rank librarian").

### 3.10 Selective ingestion (the write-gate)
`brain_remember` persists ONE precious insight at a time:
- `importance` 1–5 required; **<3 is refused** with guidance ("routine context
  belongs in your own short-term memory").
- **Dedup-before-write:** recall first; near-duplicate (distance <0.12) → skip,
  answer "already known".
- **Session budget:** 20 writes; past the cap, distill + shelve instead.
- Books are born **only at checkpoints** (`brain_shelve_project`, the Promotion
  Engine, the Project Compressor) — never from a continuous stream.

### 3.11 Active Forgetting (Thinking Brain hygiene)
After consolidation, `clearThinkingBrain()` rotates the working namespace to a
new epoch (`eternal:project:<id>:epoch:<ts>`). Old traces are left behind —
not read, not deleted (Walrus can't delete). **Logic:** prevents context bloat
and rate-limit pressure without pretending immutable data can be erased.

### 3.12 Cognitive engines (Living Brain, phases 3–8)
Scripts under `scripts/` — all default to **dry-run**; `--commit` writes:

| Engine | What it does |
|---|---|
| `phase3-semantic-engine.mjs` | Consolidation (episodic→semantic via `analyze()`), Confidence Tracker (belief from confirmation clusters, computed at read time), Contradiction Detector |
| `phase4-procedural-engine.mjs` | Skill Builder (skills from successful episode groups), Skill Optimizer (stated vs observed drift), Skill Degradation (unused >30d = rusty) |
| `phase5-metacognition-engine.mjs` | Pre-Action Assessment (PROCEED/CAUTION/REFUSE from cross-tier evidence — candidate actions are derived from the agent's own episodic language, no hardcoded-English mismatch), Post-Action Reflection, Confidence Calibrator |
| `phase6-library-engine.mjs` | Promotion Engine: high-confidence semantic facts → books (idempotent); `--consult "problem"` to query |
| `phase7-neuro-engine.mjs` | Left/Right routing (logic→Library, context→Thinking), Pattern Separation health, Integrated Recall |
| `phase8-eternal-engine.mjs` | Identity Test Suite (behavioral, validated against the LIVE on-chain owner), TTL hot/warm/cold, Regeneration dedup scan |
| `watchdog.mjs` | Independent health monitor — "different process, different trust" |

---

## 4. Components map

| Path | What it is |
|---|---|
| `packages/core/` | **The engine.** `WalrusEternalBrain` class — every feature above is a method here. Framework-agnostic TypeScript. |
| `brain-mcp/` | **The universal socket.** MCP server (stdio) exposing 9 tools to any model-client. |
| `agent-api/` | Local REST gateway (`/api/context`, `/api/trace`, `/api/consolidate`) with per-session brains + consolidation mutex + CORS allow-list. |
| `src/` | **The web UI** (React + Vite): Librarian / Library / Ledger views. Wallet-gated (Sui dapp-kit). |
| `scripts/` | Cognitive engines (above) + ops: `identity-evolve.mjs`, `book-evolve.mjs`, `compress-project.mjs`, `setup-account.mjs`, `find-account.mjs`, deploy scripts. |
| `walrus-cors-proxy/` (repo root) | Cloudflare Worker proxying the MemWal relayer for the browser (origin allow-list + rate limiting). |
| `packages/core/src/graph-builder.ts` | `@deprecated` — superseded by composition with codebase-memory-mcp. |

### 4.1 The web UI (observation, not editing)

**By design, the UI has no manual "Add book" and no search box** — writing to
the library is the *agent's* job (MCP tools, engines); the human observes.

| View | Shows |
|---|---|
| **Librarian** (`BrainView`) | Identity card (agent, project 🚧 building, dev wallet, SuiNS, Site object) + 🎓 rank badge with next-stage progress + Universal Identity sections + Development History timeline |
| **Library** (`LibraryView`) | Stat chips (books / building / sleeping / synapses / 🩺 health) + the **Neuron Map**: each book is a neuron; the building project glows (🚧, bigger + gold halo); sleeping books are dim grey (😴); click a neuron → lineage synapses appear + detail panel (content, status badge, book history); background click hides lines again. Toggle to fullscreen Topology view. |
| **Ledger** (`LedgerView`) | Proof-of-work feed: books shelved/evolved, synapses formed, recent working traces with `[source_model]` provenance |

---

## 5. For AI agents: the MCP workflow

### 5.1 The 9 tools

| Tool | When to call | Key params |
|---|---|---|
| `brain_identity` | **First.** Know who you are + your librarian rank | `format`: system-prompt (default) / eliza / openhands / crewai / full |
| `brain_start_project` | **Before any code** on a new project. Opens a fresh Thinking Brain namespace + returns a kickoff briefing from the library | `name`, `description`, `domain?` |
| `brain_recall` | Before acting — pull verified Library facts + session context | `query` |
| `brain_consult_library` | Stuck on a problem — get TL;DR cards from past projects | `problem`, `domain?` |
| `brain_read_book` | A TL;DR card looks relevant — pull the full text | `book_id` (from the card) |
| `brain_remember` | You just earned ONE precious insight | `trace`, `importance` (1–5; <3 refused) |
| `brain_consolidate` | Mid-project checkpoint — crystallize session → Library | — |
| `brain_shelve_project` | **Project DONE.** Consolidate + shelve as a book | `summary`, `tags?`, `tl_dr?`, `architecture_digest?` (paste CBM `get_architecture` output), `project_dir?` |
| `brain_library` | Browse the shelf (titles, versions, tags, synapse count) | — |

### 5.2 The canonical lifecycle

```
brain_identity                        # know thyself (rank included)
brain_start_project(name, desc, domain)
      │  → kickoff briefing (TL;DR cards from past projects)
      ▼
work… brain_recall / brain_consult_library → brain_read_book (only when a card fits)
      │  earn an insight? → brain_remember(trace, importance≥3)
      ▼
brain_shelve_project(summary, tags, tl_dr, architecture_digest)
      # book shelved · session consolidated · Thinking Brain rotated (forgotten)
```

### 5.3 Client config (stdio)

```json
{
  "mcpServers": {
    "brain": {
      "command": "node",
      "args": ["<repo>/brain-mcp/dist/server.js"],
      "env": {
        "MEMWAL_ACCOUNT_ID": "0x…",
        "MEMWAL_DELEGATE_KEY": "<delegate key — never commit>",
        "MEMWAL_SERVER_URL": "https://relayer.memory.walrus.xyz",
        "BRAIN_PROJECT_ID": "my-project",
        "BRAIN_SOURCE_MODEL": "antigravity"
      }
    }
  }
}
```

Set `BRAIN_SOURCE_MODEL` per client (claude-code / antigravity / cursor…) so
every write carries provenance — the Ledger shows who contributed what.

### 5.4 Pairing with codebase-memory-mcp (recommended)

> **Ask CBM about the code. Ask the brain about the lessons.**

Install CBM (auto-configures 11 clients): structure questions (`search_graph`,
`trace_path`, `detect_changes`, `get_architecture`) go to CBM's local,
rebuildable graph; wisdom questions go to the brain. At shelve time, paste
CBM's `get_architecture` digest into `architecture_digest` — the book then
carries the real structure summary, and the `.codebase-memory/graph.db.zst`
artifact's sha256+size is recorded as provenance (the graph itself stays
off-chain).

---

## 6. For humans: setup & CLI

### 6.1 Environment (`.env` — never commit)

```bash
VITE_MEMWAL_ACCOUNT_ID=   # MemWalAccount object id on Sui
VITE_MEMWAL_DELEGATE_KEY= # Ed25519 delegate key (write-capable!)
VITE_MEMWAL_SERVER_URL=   # relayer (browser goes through the CORS proxy)
VITE_SITE_OBJECT_ID=      # Walrus Site object
VITE_DEV_WALLET_ADDRESS=  # the ONE dev wallet
SUI_PRIVATE_KEY=          # server-side only (signing identity versions)
```

No account yet? `node scripts/setup-account.mjs` creates the MemWalAccount +
delegate key on-chain (needs `SUI_PRIVATE_KEY` + gas).

### 6.2 Build & run

```bash
npm install && npm run dev            # web UI  → http://localhost:5174
cd packages/core && npm run build     # the engine (build first)
cd brain-mcp && npm install && npm run build   # the MCP socket
npm run api                           # optional REST gateway :3001
npm run deploy                        # build + site-builder update (Walrus Sites)
```

### 6.3 CLI quick reference

| Command | Purpose |
|---|---|
| `node scripts/identity-evolve.mjs --history` | Read the life story (all signed versions) |
| `… --set persona.role="…" --commit` | Append a signed identity change |
| `… --promote --commit` | Record a librarian-rank promotion (if earned) |
| `node scripts/book-evolve.mjs --list` | Shelf overview (status/tags/synapses/errata/TL;DR) |
| `… --new "Title" --content "…" --tags a,b --tldr "…" --domain web3 --commit` | Shelve a book |
| `… --evolve "<book>" --content "…" --commit` | New version of a book |
| `… --link "A" "B" --reason "reused X" --commit` | Form a synapse |
| `… --set-status "<book>" building\|sleeping\|complete --commit` | Change status |
| `… --correct "<book>" --content "what was wrong + fix" --commit` | File an errata |
| `node scripts/compress-project.mjs [dir] --commit` | Compress a repo into ONE book (mines episodic lessons, not README boilerplate) |
| `node scripts/phase6-library-engine.mjs --consult "problem"` | Ask the shelf from the terminal |
| `node scripts/phase8-eternal-engine.mjs` | Brain health check (identity 5/5 → HEALTHY) |

All engines are **dry-run by default** — nothing writes without `--commit`.

### 6.4 Trust & security model

- **One dev wallet** owns everything (MemWalAccount, SuiNS, Site). The wallet
  is read LIVE from chain — never hardcoded.
- Devices/models get **delegate keys** (revocable on-chain via
  `removeDelegateKey`). The browser stores its delegate key locally after an
  "Authorize Device" transaction.
- Identity changes and promotions are **Ed25519-signed** by the current owner;
  invalid signers are rejected (drift alarm).
- Never commit `.env` / private keys. The repo's history has been verified clean.

---

## 7. FAQ & gotchas

| Symptom | Explanation |
|---|---|
| `Module "crypto" has been externalized…` during build | Normal MemWal browser-compat warning. Safe to ignore. |
| HTTP 429 `Rate limit exceeded` | Relayer allows **30 weighted req/min per delegate key**. Engines throttle themselves; wait ~60s. |
| `/embed` returns 404 | This relayer doesn't expose raw embeddings. Everything uses `recall()` vector search instead (by design in phases 3/7). |
| `remember()` feels slow (~20–30s) | Each write embeds + Seal-encrypts + uploads to Walrus + registers on Sui. Batch and be selective — that's what the write-gate is for. |
| A book is wrong but can't be deleted | That's Walrus immutability. File an errata: `book-evolve --correct` — consult will warn every future reader automatically. |
| Sleeping book doesn't show in results | By design. It wakes only on an exact tag/title keyword match. |
| Two same-named playbooks from different ecosystems | Use `domain` on consult/start_project — cross-domain results are flagged ⚠, not hidden. |
| UI has no search / add-book | Intentional (Phase 11): the library writes itself through agents; the UI is a decluttered observation window. |
| Identity looks stale after transferring the account | Run `identity-evolve` — the on-chain owner is the hard truth; append a new signed version to heal the soft fields. |

---

## 8. Where to go deeper

- `ROADMAP.md` — every phase (0–13) with implementation notes & live-verification records
- `brain-mcp/README.md` — MCP config recipes + CBM division of labor
- `docs/` — architecture papers & design history
- `library-books/` — locally generated project books (before shelving)

*This file is the map. The shelf is the territory. Start with
`brain_identity`, and never solve the same problem twice.* 🧠📚
