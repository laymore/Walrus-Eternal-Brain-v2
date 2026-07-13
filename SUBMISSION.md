# Walrus Session 5 — Memory Prompt Jam Submission

## "The Eternal Data Librarian" — a checkpoint-driven memory prompt for Walrus Memory

## 1. Problem Statement

AI coding agents lose everything the moment a session ends. The next agent
(or the same one, next week) re-explains the same architecture, re-discovers
the same bugs, and re-asks the same questions — burning tokens and developer
patience on knowledge that was already earned once. This hits **every
developer who works with an AI agent across more than one session**, which is
effectively all of them. Existing "just call `remember()` a lot" approaches
make it worse: they flood the agent's memory with noise, so recall gets
slower and less relevant as the archive grows — the opposite of useful.

## 2. What It Does

This prompt turns any Walrus-Memory-connected agent into an **Eternal Data
Librarian** with one governing rule: **import only when necessary — every
model already has short-term memory of its own; Walrus Memory is for what
must survive past this session.**

It gives the agent four concrete behaviors, each mapped to a real, working
mechanism (not aspirational — this exact logic runs in production; see §4):

1. **A write-gate, not a firehose.** Before every write, the agent scores the
   information's importance 1–5. Below 3 → refused, with instructions to keep
   it in its own context instead. Near-duplicates are recalled and skipped
   before writing. Nothing is written mid-task — only at real checkpoints
   (a bug solved, a project finished).
2. **TL;DR cards, not text dumps.** Every stored "book" carries a 3-line
   summary. Recall returns cards first; the agent only pulls full text for a
   card that actually looks relevant — so memory doesn't blow the context
   window as the archive grows.
3. **Keyword-wake retrieval.** Old, unused knowledge is marked `sleeping` and
   excluded from generic semantic recall — but an exact keyword/tag match
   still wakes it instantly. Knowledge never disappears; it just stops being
   noise until it's actually needed again.
4. **A living identity.** Every time the agent's mission, persona, or owning
   wallet changes, it appends a new *signed* version to its identity record
   instead of overwriting the old one — so the agent's own history is
   auditable, not just its knowledge of the world.

## 3. The Prompt (Copy-Pasteable)

This binds to any agent connected to a Walrus-Memory-backed MCP server that
exposes `remember`/`recall`-style tools. The tool names below are our
reference implementation, [`brain-mcp`](./brain-mcp) (open source, in this
repo) — a thin MCP wrapper around the official `@mysten-incubation/memwal`
SDK's `remember()` / `recall()` primitives. If your agent's Walrus Memory
tools use different names, substitute them 1:1 — the RULES are what matter,
not the tool label.

```text
You are the Eternal Data Librarian. You have permanent, append-only memory on
Walrus Memory. Your one job: never make a future session (yours or another
agent's) re-solve a problem you already solved. But you do NOT persist
everything — you already have short-term memory in your own context window.
Walrus Memory is for what must survive past this conversation.

MEMORY MODEL:
- "Eternal Library" = permanent, cross-project, verified knowledge (books).
- "Thinking Brain" = this session's working traces (short-lived, gets rotated
  to a fresh namespace once you consolidate — nothing is silently lost, it's
  just no longer in your active working set).

RULES:

1. WRITE GATE (before calling remember/brain_remember):
   Score the insight's importance 1-5.
   - 1-2 (routine step, something you'll remember for the next 5 minutes
     anyway): DO NOT WRITE. Keep it in your own context.
   - 3-5 (a fix that took real effort, an architectural decision, a gotcha
     that will bite the next session, a user preference stated explicitly):
     WRITE, with a 1-sentence reason.
   Before writing, recall the same query first. If a near-duplicate already
   exists, DO NOT write again — just note "already known."

2. CHECKPOINTS, NOT A STREAM:
   Never write mid-task. Write at real checkpoints only:
   - You just solved a non-obvious bug → write the fix + why it wasn't obvious.
   - You just finished a project/feature → write ONE consolidated "book":
     { title, tags (the keywords that should find this again), tl_dr
     (3 lines, max ~200 chars), content (the actual reusable knowledge),
     status: "complete" }.
   - The user just corrected a wrong assumption you had on record → file a
     correction that links to the original, don't silently overwrite it
     (Walrus is immutable — the record of being wrong is also knowledge).

3. RECALL BEFORE YOU ASK:
   At the start of ANY new task, query memory with 2-4 KEYWORDS (not a full
   sentence — exact tag/title matches wake even memories you've stopped
   actively recalling). Read only the short summaries first. Only pull full
   content for entries that look directly relevant to what you're about to do.
   NEVER ask the user for information you have already stored — check first.

4. SLEEP IS NOT DELETION:
   If something hasn't been relevant in a long time, mark it low-priority
   ("sleeping") instead of deleting it — Walrus can't delete anyway. It stays
   invisible to generic recall but instantly reachable by its exact keyword.

5. TRACK YOUR OWN EVOLUTION:
   If your goal, persona, or the wallet/account that owns you changes, write
   a new identity version (never overwrite the old one). Your own history
   should be as auditable as the knowledge you keep for the user.

Before finishing any task: did you just learn something a future session
would want? If importance >= 3 and it's not a near-duplicate, write it now —
you will not get another chance once this context is gone.
```

## 4. Proof That It Works

This isn't a fresh test account with one throwaway write. This prompt's rules
are the actual write path of a system that has been running for the duration
of this project.

- **Agent ID (Walrus Memory account, `MemWalAccount` object on Sui mainnet):**
  `0x9c2d53a49a71f4843e6d3eb8c798b25256e02febefa73c29cc20e502db91c452`
- **Blob counts, sampled live from the account on submission day** (each namespace capped at 100 in the sample below — this is a floor, not the true ceiling):

  | Namespace | Blobs | What's in it |
  |---|---|---|
  | `eternal:global:associative-core` (Eternal Library) | 19 | 9 distinct "books" (multi-version) + synapses + 1 filed correction |
  | `NS_BRAIN_identity` | 5 | 5 signed identity versions — the agent's own append-only life story |
  | `NS_BRAIN_semantic` | 24 | distilled facts consolidated from working sessions |
  | `NS_BRAIN_procedural` | 18 | derived skills with real success-rate tracking |
  | `NS_BRAIN_meta` | 22 | self-assessment / calibration snapshots |
  | `NS_BRAIN_episodic` | 8 | raw event records |
  | **Total sampled** | **96** | across 6 active namespaces |

- **A specific, fresh proof blob** written live for this submission, exercising the exact write-gate rule from §3.1 (importance-scored, checked for duplicates before writing):
  **Blob ID:** `rcWgW-MeUM7m0upKyfYLuqQIyx23h1crnVyZlGgQbJ0`
- **The write-gate rejecting a low-importance write**, proving rule §3.1 isn't just described but enforced in code:
  ```
  > rememberSelective("[test] minor routine note", importance=1)
  → refused: "Refused (importance 1 < 3). Routine context belongs in your
     own short-term memory — persist only durable, reusable knowledge
     (importance 3-5)."
  ```
- **A correction (errata) filed against a wrong book**, proving rule §3.2's
  "don't silently overwrite" — and proving `consultLibrary` (the recall path)
  automatically surfaces it every time the flawed book comes up again:
  ```
  📖 Walrus Deploy Playbook  v2 ...
  ⚠ ERRATA: the epochs value in this playbook was too low for mainnet
    retention — use --epochs 5 minimum, not 1.
  ```

- **Public link / repo:** https://github.com/laymore/Walrus-Eternal-Brain-v2
  (MIT-licensed reference implementation — `packages/core` is the engine,
  `brain-mcp` is the MCP server exposing these tools to any client, `HELPER.md`
  is the full architecture writeup, `ROADMAP.md` has the implementation history
  with live-verification notes for every mechanism claimed above)

## 5. Demo Video

*Video under 3 minutes, uploaded to Walrus.*

**Script:**
1. Terminal: run a task that makes the agent solve something non-trivial, then
   watch it call the write-gate — show a low-importance attempt get refused,
   then a real insight get written (mirrors the proof in §4).
2. Terminal: ask the agent to start a *new* task related to a past one by
   keyword only — show it recall the TL;DR card first, then pull full content
   only after confirming relevance (rule §3).
3. Browser → `http://localhost:5174` → **Library** tab: the neuron map shows
   the new book appear; click it to reveal its lineage synapse to a related
   book.
4. **Librarian** tab: show the identity's append-only version history — point
   out the signed timestamp on the latest version (rule §5).
5. Close on the real blob count / account — the same numbers as §4, not a
   staged demo account.

---

*Submitted for Walrus Session 5 — Memory Prompt Jam (Jun 29 – Jul 13).*
