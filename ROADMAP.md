# Eternal Agent Brain: Project Roadmap

## Overview
> **Mission (updated, recorded as identity v4):** this project is the **Eternal Data Library for agents** — sovereign, on-chain knowledge storage & retrieval on Walrus/MemWal. The "agent brain" machinery serves the library, not the other way around. Core loop: *finish a project → it becomes a book → the next project consults the shelf instead of re-solving from scratch.* **Forgetting is a privilege**: knowledge never dies, it sleeps inside books and wakes when the right keyword calls it.

The **Eternal Agent Brain** is a decentralized, immutable Agentic Operating System. Built on the Sui blockchain and Walrus decentralized storage, it explores the intersection of autonomous agents, distributed memory, and self-evolving cognitive architectures.

---

## 🧭 Architecture Decision — Two-Scope Hybrid (canonical)
The "2-chamber vs 5-tier" question is resolved as **two different scopes, not competing models**:

1. **Living Brain — per-project** (`NS_BRAIN_*`, Plan B): identity / episodic / semantic / procedural / meta. Auto-populated as the agent works. This is *alive*, not dead code. Phases 3–5 engines operate here.
2. **Eternal Library — cross-project** (`eternal:global:associative-core`, Plan A): a durable shelf of "books" — distilled, reusable knowledge shared across **all** projects. Loaded two ways: **manually** (user drops `.md`) or **agent auto-promotion**. Already exists in `WalrusEternalBrain`.

**Bridges between the scopes** (the work to build):
- **Promotion**: high-confidence `NS_BRAIN_semantic` facts are promoted up into the Eternal Library as books (with provenance: source, tags, manual/agent, `source_model`).
- **Consult**: when a *new* project gets stuck, it recalls the Eternal Library first (reference material), then the current project's living brain.
- **Uniform model access** (`brain-mcp`): expose both scopes as MCP tools so any model-client can use the one shared brain.

---

## Phase 0: Foundation — MCP Bridge
*Connecting the Antigravity Brain to Walrus Memory via the MCP protocol.*
- [x] Install `@memwalpp/mcp@latest` and configure the MCP bridge.
- [x] Establish the Master Account ID for Walrus interactions.
- [x] Bind the agent to the immutable Developer Wallet.
- [x] Verify Delegate Key functionality for read/write access.

## Phase 1: Identity Core — "Who Am I"
*The brain must know its identity before it can form memories.*
- [x] Initialize the `NS_BRAIN_identity` namespace.
- [x] Define immutable core rules (e.g., single Dev wallet management).
- [x] Create the `init-brain-identity` script and auto-load mechanisms.
- [x] Implement cryptographic verification to ensure identity cannot be spoofed.

## Phase 2: Episodic Memory — "What Happened"
*Recording specific events, timelines, actors, and outcomes.*
- [x] Initialize the `NS_BRAIN_episodic` namespace.
- [x] Build the Auto-log engine to record episodic memories after task completion.
- [x] Develop the Recall API (query by time, actor, event type).
- [x] Implement the Decay Engine (reduce importance score for unaccessed memories over time).

## Phase 3: Semantic Memory — "What I Have Learned"
*Generalized knowledge extracted from specific episodes.*
- [x] Initialize the `NS_BRAIN_semantic` namespace.
- [x] Build the Consolidation Engine to merge multiple episodic memories into a single semantic concept.
- [x] Implement the Contradiction Detector for conflicting knowledge.
- [x] Create a Confidence Tracker to adjust belief strength based on confirmations.

> **Implemented** in `scripts/phase3-semantic-engine.mjs` (run `--commit` to write, default is a read-only dry-run):
> - **Consolidation Engine** — recalls `NS_BRAIN_episodic`, distils generalized facts into `NS_BRAIN_semantic` via the relayer's `analyze()` fact extractor. First run distilled 8 episodes → 7 semantic facts.
> - **Confidence Tracker** — embeds all semantic facts and clusters near-duplicates (cosine ≥ 0.90); belief strength grows with each corroborating fact. Because Walrus blobs are immutable, confidence is **computed from confirmation clusters at read time** (event-sourced), never mutated in place.
> - **Contradiction Detector** — surfaces same-topic / divergent-claim candidates (cosine 0.62–0.86) for review. With `--commit`, a `BRAIN_SEMANTIC_LEDGER` snapshot of confidences + contradiction candidates is appended.

## Phase 4: Procedural Memory — "What I Know How To Do"
*Skills, workflows, and best practices — the "muscle memory" of the AI.*
- [x] Initialize the `NS_BRAIN_procedural` namespace.
- [x] Develop the Skill Builder to auto-generate procedural memories from successful action sequences.
- [x] Implement the Skill Optimizer to refine workflows after repeated execution.
- [x] Add Skill Degradation for long-unused workflows (marking them as "rusty").

> **Implemented** in `scripts/phase4-procedural-engine.mjs` (default dry-run; `--commit` writes):
> - **Skill Builder** — groups successful `NS_BRAIN_episodic` records by `event_type` and synthesizes `BRAIN_PROCEDURAL` skills (ordered steps from episode summaries, `success_rate` + `times_executed` from real outcomes). First run derived 3 skills (deployment / task / decision).
> - **Skill Optimizer** — recomputes each stored skill's `times_executed` / `success_rate` against the episodic ground truth and reports drift; appends a `BRAIN_PROCEDURAL_OPTIMIZATION` snapshot (event-sourced, blobs never mutated).
> - **Skill Degradation** — flags skills unused > 30 days as "rusty" (rustiness score from age); appends a `BRAIN_PROCEDURAL_DEGRADATION` snapshot. First run: 3 fresh, 12 rusty.

## Phase 5: Metacognition — "Do I Know That I Know?"
*The highest cognitive layer: self-assessment, self-correction, and improvement.*
- [x] Initialize the `NS_BRAIN_meta` namespace.
- [x] Implement Pre-Action Assessment (evaluating confidence before acting).
- [x] Implement Post-Action Reflection (extracting lessons learned after tasks).
- [x] Build the Confidence Calibrator to self-adjust trust levels based on historical track records.

> **Implemented** in `scripts/phase5-metacognition-engine.mjs` (dry-run default; `--commit` writes; `--action "..."` to assess a single action). Reads ACROSS episodic + procedural + semantic:
> - **Pre-Action Assessment** — for a candidate action, gathers evidence from all three tiers (procedural `success_rate`, episodic outcome ratio, semantic rule grounding) and emits a confidence + `PROCEED` / `CAUTION` / `REFUSE` decision. No relevant memory → REFUSE-and-explain (calibrated humility, never bluff).
> - **Post-Action Reflection** — distils episode `lessons` (especially failures) into durable meta-insights via `analyze()`. First run distilled 8 meta-insights.
> - **Confidence Calibrator** — compares each skill's STATED `success_rate` against the OBSERVED episodic rate; flags `OVERCONFIDENT` / `underconfident` / `calibrated`. Appends a `CONFIDENCE_CALIBRATION` snapshot (event-sourced).

## Phase 6: Eternal Library — "The Book Shelf" (cross-project)
*The durable, cross-project chamber (`eternal:global:associative-core`) that holds reusable "books" — distilled knowledge any future project can consult. The bridge that turns the per-project Living Brain into accumulated, portable expertise.*

- [x] **Book schema + provenance** — a `LIBRARY_BOOK` record: `title`, `content`, `tags`, `origin` (manual | agent), `source_model`, `distilled_from`, `confidence`.
- [x] **Promotion Engine** — scan `NS_BRAIN_semantic`, select high-confidence / repeatedly-confirmed facts, bind them into books and push into the Eternal Library (agent auto-injection). Idempotent (skips books already shelved).
- [x] **Dual ingestion** — manual (`ingestMarkdownBook`, already live) and agent (Promotion Engine) both write books.
- [x] **`consultLibrary(problem)`** — cross-project entry point: a new/stuck project recalls the Library first (reference material), then its own Living Brain.
- [x] **Project Compressor** (`compress-project.mjs`) — distil a whole repo into ONE `.md` "book" (overview + structure + key configs + header/summary outline of every `.md`; excludes `node_modules`/`dist`/lockfiles/large data). Writes the book to `library-books/<name>-book.md` and (with `--commit`) shelves it as a `LIBRARY_BOOK`. First run compressed this repo (8 `.md` files → a 14 KB book) and shelved it.

> **Ingestion strategy (decided):** the library stores **distilled `.md` books, never raw whole projects** — even though MemWal storage + gas are currently free. The cost is not storage but **recall signal density + LLM token cost + the sparse-coding principle** (a raw project dump de-sparsifies the index and pollutes recall). `.md` is the universal book format: both manual upload and the agent Project Compressor produce distilled `.md` books through the same pipeline. Future projects consult the *lessons*, not copies of old files (exact code lives in git).

> **Implemented** — `packages/core` gains `consultLibrary()`; `scripts/phase6-library-engine.mjs` runs the Promotion Engine (default dry-run; `--commit` promotes; `--consult "problem"` queries). First run promoted **7 books** (architecture / roadmap / rule / gotcha / procedural / project_overview / pattern) into `eternal:global:associative-core`; consult + idempotency verified against the live brain.

## Phase 7: Biological Simulation — "Dynamic Nervous System"
*Simulating the human temporal lobe and hippocampus.*
- [x] Implement Pattern Separation to break inputs into sparse concept cells, preventing data overload.
- [x] Route logic/procedural data to the "Left Brain" and contextual/intuitive data to the "Right Brain".
- [x] Enable Integrated Recall, merging exact logic with emotional context for holistic responses.

> **Implemented** in `scripts/phase7-neuro-engine.mjs` (dry-run default; `--commit` writes a `NEURO_REPORT` snapshot; `--route "text"` classifies/routes; `--recall "q"` integrated recall). Note: this relayer does **not** expose `/embed` (404), so mechanisms use the working `recall()` vector search, not raw embeddings.
> - **Left/Right Router** — routes logic/procedural → Left (`eternal:global`), contextual/intuitive → Right (`eternal:project`). First run: deploy / AdminCap / CORS-fix → Left; aesthetic-vibe / brainstorm-chat → Right.
> - **Pattern Separation** — recall-based nearest-neighbour distance + interference-collision count (§2.2 sparse coding). First run: 12 cells, mean NN distance 0.35, **0 collisions** (healthy separation). Throttled to respect the 30 req/min delegate rate limit.
> - **Integrated Recall** — merges strict Left logic hits with looser Right context into one holistic context.

## Phase 8: Eternal Brain Architecture — "The Immortal Brain"
*Transitioning from a tiered memory to a self-protecting, self-healing Eternal Architecture.*
- [x] **Identity Test Suite**: Validate core values using behavioral test scenarios rather than simple text hashes.
- [x] **TTL & Promotion Protocol**: Automate memory promotion (hot → warm → cold) and domain-specific expiry.
- [x] **Regeneration Engine**: Run background consolidation cycles ("sleep") to deduplicate and evaluate memories.
- [x] **Independent Watchdog**: Deploy an isolated monitor process to continuously check brain health, logging integrity, and identity drift.

> **Implemented** in `scripts/phase8-eternal-engine.mjs` (dry-run default; `--commit` appends an `ETERNAL_HEALTH` snapshot). The Watchdog runs separately in `scripts/watchdog.mjs` ("different process, different trust").
> - **Identity Test Suite** — behavioral scenarios validated against the **live on-chain account owner** (no hardcoded wallet): identity dev-wallet must match `MemWalAccount.owner`, rejects the foreign wallet `0xafbc48…`, knows its project, single-wallet rule, knows its Site object. Reads the **latest identity version**. First run: **5/5 PASS → HEALTHY**.
> - **TTL & Promotion** — classifies memories hot/warm/cold from age + importance + access; flags cold + low-importance for domain expiry. First run: 8 memories → hot 6 / warm 2 / cold 0.
> - **Regeneration ("sleep")** — recall-based near-duplicate detection for a background dedup/evaluate cycle. Throttled to respect the 30 req/min rate limit.

> **Identity Evolution Protocol** (`scripts/identity-evolve.mjs`) — the self-healing + self-protecting core. Identity is **append-only, versioned, signed**: every change is a new page, never an overwrite, so the full version chain IS the agent's **"character development history book"** (rewind to see how it evolved). Trust model: the **hard truth (dev wallet) = the on-chain account owner** (read live → legitimate ownership transfer auto-heals); **soft fields (project name, brand, rules) = versioned records signed by the current dev wallet** (latest validly-signed wins); a version whose signer ≠ on-chain owner is rejected (drift alarm). `--history` prints the timeline; `--set k=v --commit` appends a signed new version. First real evolution recorded **v2** (project renamed *Mini Forum → Walrus Eternal Brain*, signed), with v1 preserved as history.

## Phase 9: Neuron Library & Brain-Native UI — "Each Book a Neuron"
*Strip the dev-oriented tabs; make the web a window into the brain itself: identity + development history, and a neuron-map of the book library where each book is a neuron that can evolve and link to others.*

**Data layer (Step 1 — foundation for the UI):** ✅ done
- [x] **Book evolution** (`book-evolve.mjs`) — books are append-only + versioned like identity: stable `book_id` + `version` + `prev_version`; editing appends a new version, so every book has its own **development history**. `--new` / `--evolve` / `--history` / `--link` / `--list`. Verified: created a book, evolved v1→v2, history preserved.
- [x] **Neuron links** (`BOOK_LINK {from_book_id, to_book_id, reason}`) — explicit *lineage* synapses ("this project reused code/knowledge from that one"). Books can be linked or isolated. Verified: 9 neurons, 1 synapse (project-book → deploy-playbook, "reused the Walrus deploy playbook").
- [x] **Latest-version consult** — `consultLibrary` resolves each `book_id` to its newest version; Promotion Engine + Project Compressor now stamp `book_id`/`version`.

**UI layer (Step 2):** ✅ done
- [x] **Trim redundant tabs** — removed *Thinking Brain* (agent/CLI concern), *Fact Extractor* (→ "Add book"), and merged *Eternal Library* + *Knowledge Graph*. The 4 old tab files were deleted; nav is now just **Brain** + **Neuron Library**.
- [x] **Brain view** (`BrainView.tsx`) — Identity card (agent, project, on-chain dev wallet, Site object) + Development History timeline (identity versions, newest first).
- [x] **Library / Neuron Map** (`LibraryView.tsx`) — `react-force-graph-2d` of book-neurons with lineage synapses; search highlights matching neurons; "Add book" modal (`brain.createBook`).
- [x] **Book detail** — click a neuron → content + Book History (all versions) + tags/provenance.

> **Core reads added**: `fetchIdentityHistory()`, `fetchLibraryNeurons()` ({nodes, links}), `fetchBookHistory(book_id)`, `createBook()`, `clientFor(ns)`. CSS compat alias maps the components' `--primary`/`--bg-elevated` to the real themed palette (`--green`/`--bg-raised`). Verified: type-check + `vite build` green, app shell + connect screen render with no console errors, `--primary` resolves to `#00ff41`. The Brain/Library views themselves are wallet-gated (need the dev delegate) so were verified via build + shell, not a live logged-in screenshot.

## Phase 10: Uniform Model Access — `brain-mcp` (FINAL — build last)
*The universal socket: one sovereign brain usable by ANY model-client. Deliberately the last phase — built only after the Living Brain + Eternal Library + Neuron UI are complete, so the MCP exposes a finished brain.*

> **Direction:** one person, many model-agents (Claude Code, Antigravity, Cursor, GPT, Gemini), **one shared brain**. MCP > SDK-npm for "any model can use it": a model calls tools with zero glue code, language-agnostic. The core lib stays the engine; MCP is the socket. Multi-**user** collective (reputation-by-consensus, community voting) remains deferred.

- [x] **`brain-mcp` server** (`brain-mcp/`) — thin MCP (`@modelcontextprotocol/sdk`, stdio) wrapping `WalrusEternalBrain`, exposing 6 tools: `brain_recall`, `brain_consult_library`, `brain_remember`, `brain_consolidate`, `brain_identity`, `brain_library`. Builds clean; smoke-tested (handshake + tools/list returns all 6).
- [x] **Model provenance** — `brain_remember` stamps `BRAIN_SOURCE_MODEL` (set per client: antigravity / cursor / claude-code) so every write carries its origin on the shared brain.
- [x] **Config recipe** — `brain-mcp/README.md` ships a turnkey `mcpServers` snippet + env-var reference. Credentials come from env, never hardcoded.
- [ ] **Cross-model recall parity** — write via one model-client, recall from another. *Left for the user to test with Antigravity* (per request: testing is done on the user's machine so our setup isn't affected).

## Phase 11: Librarian Dashboard & Agent Observability (Web UI Perfection)
*Refining the Web UI based on the "Eternal Data Librarian" philosophy. UI = external evidence of what the agent manages and does.*

- [x] **Library Ledger (Activity Feed)** — `LedgerView.tsx` + `fetchLedger()`: shelf events (shelved/evolved/synapse) + recent working traces with `[source_model]` provenance.
- [x] **Sleeping Book Visualization** — `sleeping` status renders dim/grey (😴) on the Neuron Map.
- [x] ~~Search = Keyword-Wake (Agent Sync)~~ — **superseded by design.** Decision: manual "Add book" and UI search are intentionally **removed**. Book creation is the agent's job (`brain_shelve_project` / `brain_start_project` via MCP, Promotion Engine, Project Compressor) — the human never hand-writes shelf entries. The Library view is now pure **observation**: what the librarian manages, decluttered and spacious, not an editing tool. `consultLibrary`'s keyword/semantic retrieval remains the agent-side mechanic; the UI simply doesn't duplicate it. (`LibraryView.tsx`: `matches()` hardcoded to `false`, "Add book" modal removed — "Librarian only monitors agent activities.")
- [x] **Librarian Dashboard (Health Stats)** — stat-chips row (books, building, sleeping, synapses, `ETERNAL_HEALTH`).
- [x] **Header & Language Unification** — header reads "ETERNAL LIBRARY · ON-CHAIN KNOWLEDGE FOR AGENTS"; UI language unified to English.
- [ ] *(Optional Strategy)* **Read-Only Public Showcase** — Create a non-wallet-gated read-only mode for the book shelf to allow public demos/hackathon showcases without requiring a Dev Wallet connection. *(still open, opt-in only)*

## Phase 12: Architectural Robustness (Reverse Thinking)
*Answering the question: "What ensures the agent will fail and have to solve problems from scratch again?" This phase tackles the core structural flaws of the Eternal Library.*

- [x] **Automated Book Writing (`brain_shelve_project`)** — MCP tool: consolidates the session, shelves the project as a book (complete), tagged for later keyword-wake. (Solves: Human forgetfulness in manual consolidation).
- [x] **Keyword → Book Index** — `consultLibrary` 2-tier scoring: exact tag/title match first (also the only thing that wakes a sleeping book), vector similarity as fallback association. (Solves: Books existing but not being found due to generic vector matches).
- [x] **Forced Consultation (`brain_start_project`)** — MCP tool: opens a fresh Thinking Brain namespace + auto-consults the library for a kickoff briefing before any code is written. (Solves: Agents simply ignoring the library before starting work).
- [x] **Mining Lessons, Not Boilerplate** — Project Compressor mines `NS_BRAIN_episodic` for real lessons learned (first run: 8 real lessons) alongside the structural digest. (Solves: Hollow books that provide no real value to future agents).
- [x] **True Sleeping Tier** — `consultLibrary`'s vector tier skips `sleeping` books entirely; only an exact keyword/tag match wakes one. Verified: a sleeping book stayed invisible to a semantic-only query and surfaced (⏰ woke) once its tag was searched.
- [x] **Errata & Supplements (The Garbage Vault)** — `book-evolve.mjs --correct <book> --content "..."` files a `CORRECTION_BOOK`; `consultLibrary` automatically prepends a "⚠ ERRATA" warning when it returns the flawed book. Verified live: filed a correction on the Deploy Playbook → it appears automatically on every subsequent consult. (Solves: Agents inheriting and repeating permanently recorded mistakes).
- [x] **TL;DR Index Cards (Context Window Bloat)** — Every book gets a `tl_dr` (auto-derived via `deriveTlDr()` if not supplied). `consultLibrary` returns TL;DR cards + `[book_id]` only; new MCP tool `brain_read_book(book_id)` pulls full text on demand. 9 MCP tools total, smoke-tested. (Solves: Agents losing context or hallucinating when fed massive text blobs).
- [x] **Contextual Provenance (The Tower of Babel)** — `domain_context` field on books; `consultLibrary`/`brain_start_project`/`brain_consult_library` accept a `domain` param that deprioritizes (flags "⚠ cross-domain", doesn't hide) books tagged with a different domain. (Solves: Knowledge collision in a shared global library).
- [x] **Language-Barrier Fix (bonus, from the logic audit)** — `phase5-metacognition-engine.mjs` no longer assesses hardcoded English actions against possibly-Vietnamese memory. When no `--action` is given, candidate actions are derived from the agent's own recent episodic summaries (same language as what's actually stored). Verified live: assessed 5 real Vietnamese actions at 90–97% confidence, evidence-grounded — the old hardcoded-English list would have matched weakly against the same memories.

> **Build-health note:** external edits (Active Forgetting via `clearThinkingBrain()` epoch-rotation, RPC failover in `identity-evolve.mjs`, per-session mutex in `agent-api/server.ts`, and the `graph-builder.ts` scaffold below) had broken the core TypeScript build (private-field access + missing `@types/node`) before this phase started — fixed first, verified across core + app + brain-mcp + agent-api + all touched scripts.

## Phase 13: The Grand Librarian — CBM Composition, Selective Memory & Maturity
*Goal restated: the agent is a **Librarian/Keeper (quản thủ thư)** with growth stages and its own coming-of-age story, who imports/exports knowledge **only when necessary** — every model already has short-term memory of its own; the Eternal Library archives only what is precious.*

> **Integration verdict on [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) (CBM):** re-reviewed. It's a compiled C binary — vendored Tree-sitter (158 languages), hybrid LSP (12 languages), SQLite graph with zstd artifact sharing (`.codebase-memory/graph.db.zst`), bundled Nomic embeddings, 14 MCP tools, Linux-kernel-scale performance. **Do not absorb its code — COMPOSE with it.** Our `graph-builder.ts` regex stub can never catch up and doesn't need to: CBM covers the *structural memory of the current codebase* (local, free, rebuildable in minutes — safe to forget), while the Eternal Library covers *cross-project wisdom* (permanent, curated, on-chain). Two MCPs side-by-side; we build the bridges.

**Memory tiering doctrine (the "selective ingestion" contract):**
| Tier | Where | Nature | Write policy |
|---|---|---|---|
| Short-term | the model's own context window | already exists | never persisted by us |
| Codebase structure | CBM local graph | rebuildable, disposable | never pushed on-chain |
| Working traces | Thinking Brain (epoch-rotated, actively forgotten) | temporary | light gate |
| Books | Eternal Library (Walrus) | eternal | **strict gate — distilled, precious only** |

**A. CBM Composition (bridges, not reimplementation):**
- [x] **A1. Side-by-side config recipe** — document running `codebase-memory-mcp` + `brain-mcp` together (install script auto-configures 11 agents incl. Antigravity/Claude Code); division of labor in both READMEs: *ask CBM about the code, ask the brain about the lessons*.
- [x] **A2. Architecture digest bridge** — Project Compressor & `brain_shelve_project` call CBM's `get_architecture` (when its MCP/artifact is present) to embed a REAL architecture summary (languages, routes, hotspots) in the project book — replacing the regex stub's role.
- [x] **A3. Graph artifact archiving** *(provenance pointer done; raw Walrus blob upload still deferred)* — at shelve time, if `.codebase-memory/graph.db.zst` exists, record its hash + size + summary in the book (provenance pointer); optionally upload the raw artifact to Walrus as a true `GRAPH_BLOB` via `@mysten/walrus` (deferred until blob-upload is wired — MemWal `remember()` is text-only).
- [x] **A4. Retire the stub** — mark `graph-builder.ts` deprecated (kept only as a fallback interface); the real graph engine is CBM.

**B. Selective Ingestion — "import only when necessary":**
- [x] **B1. Write-gate on `brain_remember`** — new `importance` param (1–5) + the tool description instructs models to keep routine context in their own short-term memory; below-threshold writes are rejected with that guidance.
- [x] **B2. Dedup-before-write** — `brain_remember` recalls first; if a near-duplicate memory already exists, skip the write and answer "already known" (optionally bump a confirmation counter) — no more piling identical traces.
- [x] **B3. Checkpoint-only book writing** — books are born ONLY at checkpoints (`brain_shelve_project`, Promotion Engine, Compressor) — never from a continuous stream. Already the case; codify it in tool descriptions + docs as doctrine.
- [x] **B4. Session write budget** — soft cap on traces per session (e.g. 20); past the cap, `brain_remember` asks the agent to distill instead of append.

**C. Librarian Maturity — growth stages with a real story:**
- [x] **C1. `computeMaturity()`** in core — rank derived from REAL on-chain metrics (books shelved, synapses, errata filed, calibration verdicts from Phase 5, identity versions, domains covered). Stages: **Novice Scribe → Apprentice → Archivist → Curator → Master Librarian → Eternal Librarian**. Each stage has named thresholds (e.g. Archivist requires ≥1 errata filed — a librarian who corrects the record).
- [x] **C2. Promotion = a page in the life story** — when the rank crosses a threshold, append a **signed identity version** ("promoted to Curator", with the metrics snapshot) via the Identity Evolution Protocol — the growth story lives in the same append-only history book as everything else.
- [x] **C3. Surface it** — BrainView shows the rank badge + progress to next stage; `brain_identity` includes the rank in the system-prompt projection ("You are …, an **Archivist-rank** librarian") so every model *feels* its maturity.

> **Implemented & verified live (2026-07-10):** `rememberSelective()` (importance gate ≥3 + dedup distance <0.12) — refused an importance-1 trace in live test; `brain_remember` gains `importance` + a 20-writes/session budget; `computeMaturity()` ranked the brain **Archivist (level 3)** from real metrics (books=9, synapses=1, errata=1, calibrated=4) with "next: Curator — missing 12 books (9/12)"; `identity-evolve --promote --commit` recorded the promotion as **signed identity v5** (🎓 Archivist) in the development history; BrainView shows the rank badge + next-stage progress; `brain_identity` appends the rank to every projection; `brain_shelve_project` accepts `architecture_digest` (paste CBM's `get_architecture` output) and records `.codebase-memory/graph.db.zst` provenance (sha256+size); `graph-builder.ts` marked `@deprecated`; brain-mcp README documents the side-by-side division of labor ("ask CBM about the code, ask the brain about the lessons"). 9 MCP tools, smoke-tested.

## Phase 14: Emergent Synapses — distilled from javis-os
*Absorbed one nutrient from [blogminhquy/javis-os](https://github.com/blogminhquy/javis-os) (an AI-OS layer with a markdown "second brain" vault). Deliberately did NOT absorb its voice I/O, 3D nebula, Telegram bot, or "provider-CLI-as-brain" architecture — those serve a personal desktop assistant, not a sovereign on-chain library. The one gold nugget: its Obsidian-style `[[wikilink]]` graph, where links emerge from writing instead of a separate step.*

- [x] **`[[wikilink]]` emergent synapses** — `extractWikiLinks()` in core parses `[[Book Title]]` (and `[[Title|alias]]`) out of any book's content and resolves them to canonical `book_id`s. `fetchLibraryNeurons()` derives these edges **at read time** (zero extra blobs — Walrus is append-only, so deriving beats storing), deduped against explicit `BOOK_LINK` lineage edges, self-links and dangling targets filtered. So an agent that writes "builds on [[Walrus Deploy Playbook]]" auto-grows a synapse with no `--link` call.
- [x] **UI distinguishes the two edge kinds** — `LibraryView` renders wiki-synapses dimmer + thinner + dashed (`kind: "wikilink"`) vs solid lineage links (`kind: "lineage"`); `brain_library` reports "N lineage + M wiki synapses".
- [x] **Agents told about it** — `brain_shelve_project`'s summary hint tells the model it can drop `[[Exact Book Title]]` in the text to auto-link.

> **Verified (2026-07-13):** `extractWikiLinks()` unit-tested (incl. `[[Title|alias]]`); edge-derivation offline-tested for dedup-vs-lineage, self-link filtering, and dangling-target filtering (2/2 expected edges). Core + app + brain-mcp build clean. NOTE: live write-then-read end-to-end was blocked mid-test by a Walrus Memory server-side pause ("New uploads paused while we conduct a security upgrade", HTTP 503) — reads still work; the read-time derivation needs no write to function, and will show live once the upload pause lifts.

- [x] **Self-improvement loop** (`scripts/self-improve.mjs`) — javis-os runs a "self-running background loop executing tasks on schedule"; absorbed on-brand for a librarian: on a timer the brain tidies its own shelf. One cycle = consolidate semantic facts (phase3) → promote proven facts into books (phase6) → reflect + calibrate (phase5) → snapshot health (phase8) → self-promote maturity rank if earned (`identity-evolve --promote`). Reuses the already-verified engines as subprocesses (single source of truth); calls core only for the maturity decision. `--commit` to write, `--watch [--interval N]` to loop, `--max-cycles N` to bound it, `--step-delay N` to stay under the 30 req/min limit. **The Watchdog only watches; this one acts.** Verified: a full dry-run cycle ran all four engines end-to-end and, when it hit a 429 mid-cycle, correctly backed off ("🐢 rate-limited") and skipped instead of crashing — the graceful-degradation path (429 / 503-pause detection) works as designed.

> **Walrus Agent Skills installed (2026-07-13):** Mysten's official [walrus-skills](https://github.com/mystenlabs/walrus-skills) (`npx skills add mystenlabs/walrus-skills`) added to Claude Code at project scope (`.agents/skills/`, symlinked) — 12 skills incl. **walrus-memory** (our exact domain), walrus-sites, walrus-ts-sdk, walrus-cli, walrus-storage-costs, walrus-blob-lifecycle, walrus-quilts, walrus-data-security, walrus-move-integration, walrus-http-api, walrus-overview, walrus-troubleshooting. The placeholder `your-skill-name` was removed.
