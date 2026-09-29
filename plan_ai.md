# Plan — the AI chat (Phase 15)

Written 2026-09-23 against `main` @ `f24edee`. **A plan, not a build: no code has been written.**
Governing documents: [ADR-0006](./docs/adr/0006-the-chat-never-computes.md) (the chat never
computes), [ADR-0004](./docs/adr/0004-the-tool-proposes-you-dispose.md) (the tool proposes, you
dispose), concept.md §v3, and TODO.md Phase 15 (P15-1 to P15-15). Where this plan and those
documents disagree, the disagreement is named in §7. Nothing is silently changed.

---

## 1. What it is, in one paragraph

You type a question in plain English, such as *"what if I drop to three days a week at 62 and pay
the mortgage off from super?"* The chat turns it into draft plan entries, runs the forecast
engine you already have, and explains what came back. **It never does arithmetic.** Every dollar
figure on screen is taken from the engine's output and shown as a clickable "chip" that opens the
month and line it came from. It can **suggest** changes to your plan, but it can't make them.
Each suggestion waits in a list until you accept or reject it. The chat is off by default, and
the tool works exactly as it does today without it.

## 2. The rules every stage must keep

These come from ADR-0006 and are acceptance criteria, not guidance.

1. **No number is computed by the model.** A figure is either copied from a tool result by the
   software (a chip) or it isn't said at all.
2. **No tool writes the plan.** Tools can read, and they can put suggestions in a queue that
   lives in memory. Only your click on "Accept" writes, and it goes through the same save path
   and checks as the form.
3. **The browser calls the model provider directly.** The local server never passes a model
   call through, not even to get around a CORS problem. A provider that refuses calls from a
   browser is unsupported.
4. **Your API key lives in browser storage (localStorage) only.** It never goes into
   `plan.json`, an export, or any request to the local server. Tests prove all three.
5. **Off by default, and removable.** With the chat off, every forecast is byte-identical to
   today's. Nothing in the engine, the month table or the chart may depend on it.
6. **Out of scope means refusing.** Asked something the engine can't compute, the chat says so
   and says where the reasoning lives. It never makes up an answer.
7. **Figures show today's money or future dollars, following the page's toggle, and say which.**
   The model never converts between the two. Chips convert at display time, the same way the
   month table does (ADR-0001). The "$80k went missing" confusion (ret@64) is the failure this
   rule prevents.
8. **A couple is never reduced to one person.** Ages, retirement dates and markers are given per
   person, exactly as the chart does.

## 3. The entry gate — blocked on Phase 13, and what that does and doesn't block

Phase 15 is **blocked on Phase 13** (the checks against outside calculators). An explainer on top
of an unchecked engine gives fluent, confident, wrong answers. Of Phase 13, only P13-1 (Moneysmart)
is done. Still open: P13-2 (TTR against your fund's calculator), P13-3 (a hand-worked Age Pension
figure), P13-4 (golden files), P13-5 (mutation check), P13-7 (CGT) and P13-8 (franking).

**My reading of the block:** it's about *putting a model in front of you*. Stages 1-3 below
attach no model and add no explanation you'd read. They are plain, tested functions over the
engine you already use. **Recommendation: stages 1-3 may go ahead now, and stage 4 onwards waits
for Phase 13 to close.** This is decision D1 in §8.

## 4. Architecture

```
  you ──► chat panel (src/app/chat/)
              │   prose from the model, containing chip markers only
              ▼
        provider adapter ──fetch()──► Anthropic / OpenAI-compatible / Ollama on localhost
              │   tool calls from the model
              ▼
        tool layer (src/app/chat/tools/)  ◄── pure; reads the PlanFile held in the page
              │                                calls project(), sustainableSpend(), outcomes.ts
              ├── read tools ──► results stored per turn, each figure addressable
              └── propose tools ──► in-memory review queue ──► [Accept] ──► the ordinary save path
```

- **Layering.** Everything lives under `src/app/chat/`. It imports `core/` and `data/`; nothing
  in `core/`, `data/` or `store/` imports it. `test/import-graph.test.mjs` already enforces the
  direction and gets one new rule: **no module under `chat/tools/` may import `store/` or the
  write functions in `planEdits.ts`.** That's P15-8 enforced by a test, not by convention.
- **No new dependencies.** Plain `fetch()`, no provider SDKs. The only dev dependency stays
  `typescript` (P2-9a).
- **The model's settings are inputs, not constants:** provider, endpoint, model name and a monthly
  cost ceiling are all set by you, with no model name written into source.

## 5. The tools

| Tool | Kind | Returns | Notes |
|---|---|---|---|
| `runProjection(scenarioId, draftEntries?)` | read | One row per financial year plus the markers | Draft entries go through the parse checks and apply in memory for this turn only |
| `getMonth(scenarioId, month)` | read | One month's full line breakdown with `appliedEntryIds` | The source every citation points to |
| `getMarkers(scenarioId)` | read | Shortfall Age, Pension-Only Age, mortgage payoff/target, floor breaches, retirement months | Per person, never merged |
| ~~`compareScenarios(idA, idB)`~~ | — | **Withdrawn (§12.10):** the AI never compares two options | You compare them as scenarios in `enough` |
| `solveSustainableSpend(scenarioId)` | read | Converged factor, spend and its Shortfall Age | Wraps `sustainableSpend.ts`, about 20 walks |
| `explainAssumption(key)` | read | Value, financial year, source, retrieval date, confidence, register section | Reads `data/assumptions/*`, which already carries every field |
| `listAssumptions(topic)` | read | The keys under one topic | **New.** Without it the model has to guess key names |
| `whatCanYouModel()` | read | What's in scope and what's refused, **derived from code** | **New**, see refusals below |
| `proposeEntries(scenarioId, entries[])` | propose | Accepted-for-review, or the exact check failure | Goes through the same parse checks and trial walk as the form |
| `proposeScenario(name, parentId)` | propose | Same | Inherits from the parent, never copies entries |

**Financial-year rows** (P15-9) come from a new pure summariser over `Month[]`: income by kind,
tax, spending, the Age Pension, balances split into protected, assessable and accessible, and the
markers. That's about 40 rows instead of about 500 months. The detail stays one `getMonth` away.

**Refusals must be derived from code, not from a list.** The refusal list in P15-12 is already
out of date: it names CGT, which has been in scope since 2026-09-04. So `whatCanYouModel()` reads
`UNSPECIFIED_ENTRY_TYPES` (death, downsizing, HEAS, aged care and so on — the 8 refused today),
the Parked list and the limits in register §8. When a feature ships, the chat's refusals update
themselves.

## 6. Figure chips — how rule 1 is enforced mechanically

- Every tool result is stored for the turn under an id (`t1`, `t2`, …), and each figure in it has
  a path. The model is instructed to write figures only as markers, e.g. `⟦t2:fy2034.agePension⟧`.
- The renderer swaps each marker for a chip that shows the **engine's own value**, in the basis
  the page's toggle is set to. A chip opens the month table at that month and line.
- **The guard:** after a reply arrives, a scanner looks for any currency-like figure in the prose
  outside a chip. If it finds one, the figure is struck out on screen, marked "not from the
  engine", and counted. In the golden-question suite, that count must be **zero**.
- **Allowed without a chip:** calendar years, months, ages and percentages that appear verbatim
  in your question or in a tool result. This is decision D3 in §8.
- A marker whose path doesn't resolve shows a red "no such figure" chip. It never falls back to
  text.

## 7. Where this plan departs from the written design

1. **Redacted mode: "opaque figures", not "scaled figures".** ADR-0006 suggests reasoning over
   "scaled relative figures". Scaling doesn't work: tax brackets, tapers, caps and cut-offs are
   thresholds, so a scaled household crosses them in different years and the explanation would
   describe a different plan. **Proposed instead:** tools still run on your real plan in the
   browser, but in redacted mode every dollar amount sent to the model is replaced by its chip
   marker (for example `t2:fy2034.agePension`), plus a sign and a rough size ("larger than
   spending"). The model explains structure and timing, and you see real figures in the chips.
   Dates of birth are sent as ages only. **Limit, which the screen will state:** whatever you
   type in your own question goes to the model as written. Decision D2.
2. **The golden-question suite (P15-14) can't run inside `npm test`.** It needs a live model,
   costs money, and gives slightly different answers each run. So it's split in two:
   - **Scripted conversations in `npm test`:** a fake provider replays fixed tool-call sequences.
     This tests everything except the model: tools, chips, guard, queue and accept path.
   - **An opt-in script** (`scripts/chat-golden.mjs`, the same shape as the Moneysmart scripts)
     runs a fixed set of questions against a real model and scores them. Scored on: the right
     tools called, zero unsourced figures, correct refusals, and valid proposals.
3. **Saving the conversation behind an accepted entry** (P15-13) needs a new optional field on
   entries, `origin` (the question, the reply with chips resolved to their values, the model name,
   the date). A plan without it must load byte-identically, and the ADR-0006 sensitivity warning
   goes on the export screen.

## 8. Decisions I need from you

- **D1 — Start stages 1-3 before Phase 13 closes?** Recommended: **yes**. They attach no model.
- **D2 — Redacted mode as "opaque figures" (§7.1) instead of "scaled figures"?** Recommended:
  **yes**. Scaling gives wrong explanations.
- **D3 — Which numbers may appear in the chat's own words without a chip?** Recommended: years,
  months, ages, and percentages that appear verbatim in a tool result or your question. **Never
  dollar amounts.**

- **D4 and D5** are about using an outside AI tool instead — see §11.

Settled by precedent, not asked: **the local model first, a hosted provider second** (ADR-0006's
own order of preference); **the queue lives in memory** (P15-7a); **no proxy, ever** (ADR-0006,
2026-09-04 note).

## 9. Stages

Each stage is one build. Each is **gated first** (a read-only pass with named NO-GO
conditions), mutation-checked, committed to `main`, and TODO.md is updated in the same commit.
"Byte-identical when absent" is proved by re-running with the new test files removed.

| # | Stage | Delivers | NO-GO / must fail under | TODO |
|---|---|---|---|---|
| 0 | **Measurement spike** (read-only, no code kept) | Can each candidate provider be called from `http://localhost:4173` with tool use? Anthropic, an OpenAI-compatible API, Ollama. Record CORS behaviour, the headers needed and tool-call support. Also measure the size of one financial-year summary for the demo plan | NO-GO for a provider if a browser call needs a proxy. NO-GO for the whole local path if no local model does tool calls reliably | P15-1, P15-3 |
| 1 | **Read tools + financial-year summariser** (no model, no UI) | `chat/tools/` read tools, the summariser, `explainAssumption`/`listAssumptions`, and `whatCanYouModel` derived from code | Must fail if: a tool rounds or converts a figure; a financial-year total ≠ the sum of its months; the refusal list is hand-written (add a type to `UNSPECIFIED_ENTRY_TYPES` → a test goes red) | P15-6, P15-9, P15-12 |
| 2 | **Propose tools + in-memory queue + the P15-8 enforcement test** | Proposals checked by the parse door and a trial walk; the queue; the import-graph rule | Must fail if: a tool module imports `store/` or a writer; an invalid proposal reaches the queue; a proposal survives a reload | P15-7, P15-7a, P15-8 |
| 3 | **Chips + the guard** | Marker syntax, the resolver, the chip renderer (basis-aware, links to the month table), the scanner | Must fail if: a chip shows text from the model instead of the engine's value; a `$` figure outside a chip gets through; a chip ignores the today's-money toggle | P15-10 |
| — | *Phase 13 closes here (D1)* | | | |
| 4 | **Provider adapters + key handling + settings** | Adapters over `fetch()`; key in localStorage; the chat setting, off by default; message when unreachable | Must fail if: the key appears in `PlanFile`, an export, or any request to the server (assert all three); the chat being off changes any forecast byte | P15-1, P15-1a, P15-2, P15-2a, P15-5 |
| 5 | **Chat panel + review and accept** | The panel; accept/reject per proposal through the ordinary save path; the `origin` field | Must fail if: accept bypasses the form's checks; a plan without `origin` stops loading byte-identically; rejecting writes anything | P15-11, P15-13 |
| 6 | **Redacted mode** (per D2) | Opaque figures toward the model; a screen notice naming what still leaves the machine | Must fail if: any dollar amount in a request to the model while redacted mode is on (scan the actual request body) | P15-4 |
| 7 | **Golden questions + cost** | Scripted conversations in `npm test`; the opt-in live script; tokens and cost per representative turn recorded in concept.md §6; README and ADR-0006 notes | Live script: any unsourced figure, a missed refusal or an invalid proposal counts as a failure | P15-14, P15-15 |

**Rough size:** stages 1-3 are each about the size of one of the recent feature builds (TTR took
three steps). Stage 0 is an hour of measurement. Stages 4-7 are larger because they're UI work
in a real browser. Each needs the page opened and used, not just a green test run.

## 10. Risks

- **Local models may not do tool use well enough.** Stage 0 measures this before anything is
  built. If they can't, the local path is recorded as unsupported, and hosted-with-redaction
  becomes the private option.
- **The model paraphrases a figure instead of emitting a marker.** Handled by the guard (§6).
  The live golden script measures how often it happens.
- **Suggestions that look plausible but are subtly wrong** (wrong person, wrong date). Handled
  by the review screen, which shows each proposal in the same plain-English wording as the entry
  table, plus the trial walk's effect, before you accept.
- **Sensitivity.** A hosted model sees real figures unless redacted mode is on, and saved
  `origin` text puts reasoning about money into `plan.json` and exports. The screen will say both.
- **Cost.** It's your own key, separate from this project's agent budget. A monthly ceiling is a
  setting, and the chat stops, saying why, when the ceiling is reached.

---

## 11. Alternative: let an outside AI tool (Claude and others) read the forecast

Added 2026-09-23. Instead of building a chat into `enough`, **`enough` produces something an AI
tool you already use can read and work with.** There are two ways to do it, and they suit
different needs.

### 11.1 Option A — an "AI brief" file you hand to the tool

A new **"Export for AI"** button writes one Markdown file. You attach it to a Claude conversation
or a Claude Project, or paste it into any chat tool.

- **Contents:**
  - The plan in plain English (people, ages, retirement dates, entries in the entry table's own
    wording).
  - One row per financial year for the active scenario and any compared scenarios.
  - The markers (Shortfall Age, Pension-Only Age, mortgage payoff), per person.
  - The assumptions it rests on, each with its source and retrieval date.
  - What the tool can and can't model (derived from code, as in §5).
- **Every figure carries its citation** in the file itself: `$31,240 (Age Pension, FY2034-35,
  month table)`. The file also says once, at the top, whether figures are today's money or future
  dollars.
- **A header of instructions for the reader AI:**
  - Don't calculate new figures.
  - Quote only figures in this file, with their citation.
  - For any "what if", tell the user to run it in `enough` and export a new brief.
- **Stamped** with the date, a fingerprint of `plan.json` and the build, so a stale brief is
  recognisable.
- **Cost:** small — one pure function reusing the financial-year summariser from stage 1, plus
  one button. No key, no provider, no server change.
- **Limit, stated plainly: it's a snapshot, and it can't answer "what if".** Asked one anyway,
  the AI will be tempted to work it out itself. The instructions discourage that, but nothing can
  prevent it. **That breaks ADR-0006's core rule, so the screen and the file both warn about it.**

### 11.2 Option B — a local tool connector (an MCP server) the AI tool can call

MCP (the Model Context Protocol) is the standard Claude Desktop, Claude Code and other clients
use to call tools on your own machine. A small local program would expose the **same read tools
as §5**, running the **real engine** in Node against your `plan.json`. `dist/core` already runs in
Node, because the test suite imports it.

- **What you get:** a real conversation with real "what ifs". You ask Claude, Claude calls
  `runProjection` with draft entries, `enough`'s engine computes, and Claude explains the rows.
  **This is the §1 experience, delivered by the tool you already use.**
- **It removes a large part of the build:**
  - No provider adapters, no API key handling and no CORS test (stages 0 and 4).
  - No chat panel (most of stage 5).
  - No token-cost plumbing, because the AI tool handles its own.
- **What it gives up — the hard part, and I'd rather state it than bury it:**
  1. **The chip guard is gone.** `enough` doesn't control what Claude writes, so "no figure the
     engine didn't produce" becomes an **instruction, not a mechanism**. Mitigations:
     - Every figure in a tool result arrives already formatted, with its citation and its basis.
     - The server's built-in instructions state the rule.
     - The golden questions (stage 7) measure how often it's broken.
     They mitigate the risk; they don't enforce the rule.
  2. **The today's-money toggle has to be a tool parameter**, and every figure has to be labelled
     with its basis, because there's no page toggle in Claude's window.
  3. **Private mode (redacted mode) doesn't work** the way §7.1 designs it. There's no chip
     renderer on your side to swap placeholders back into real figures. If you use a hosted AI,
     your real figures go to it, exactly as in the hosted option of §7.
- **The connector must not write your plan.** It reads `plan.json`, read-only, at the fixed path
  the local server uses. It never writes that file, and it never takes a path from the AI.
  `proposeEntries` checks each suggestion (parse checks and a trial walk) and returns it as a
  short **suggestion code**. You paste the code into a new "Paste a suggestion" box in `enough`,
  which shows it in the ordinary accept/reject review. Nothing is queued anywhere. An unused code
  is just text in a chat log, which keeps P15-7a's "an unaccepted suggestion leaves no trace".
  (D5)
- **Phase 13 still blocks it.** It puts an AI in front of you, so §3 applies unchanged.
- **Needs an ADR amendment** (ADR-0011): ADR-0006 assumed the chat lives inside `enough`.
  Nothing it forbids is broken. A connector running on your own machine isn't a proxy: no model
  call passes through it, the AI tool calls it. But the "mechanism, not a warning" promise is
  weaker, and that should be written down and approved, not implied.

### 11.3 How it changes the stages

| | In-app chat (§9) | Option A: AI brief | Option B: connector |
|---|---|---|---|
| Stages 1-2 (tools, suggestions) | needed | the summariser only | **needed, shared** |
| Stage 3 (chips + guard) | needed | not needed | replaced by citation strings in results |
| Stages 0, 4, 5 (provider, key, panel) | needed | not needed | replaced by the connector (about one stage) + the paste box |
| Stage 6 (private mode) | opaque figures | not possible | not possible |
| Stage 7 (golden questions) | scripted + live | spot checks | live, run through Claude Code non-interactively |
| "No figure the model made up" | **enforced** | instruction only | instruction only, measured |
| "What if" questions | yes | **no** | yes |
| Build size | largest | smallest | medium |

**Design note that holds whichever you choose:** build stages 1-2 as pure functions that don't
touch the page, so the browser chat and the connector share the same tools. That costs nothing
now and keeps both paths open.

### 11.4 Recommendation and decisions

**Recommended order:**
1. Option A first, as soon as the stage 1 summariser exists. It's small, useful immediately,
   and can go ahead before Phase 13 closes, because it states the engine's own figures with
   citations and warns against new ones.
2. Then **Option B instead of the in-app chat**, once Phase 13 closes. It delivers the same
   conversation for about half the build.
3. Keep the in-app chat (§9) in reserve **for one measured reason only:** if the golden
   questions show Claude writing figures the engine didn't produce often enough to matter, only
   the in-app chip guard can enforce the rule.

- **D4 — Go with Option A now and Option B in place of the in-app chat, keeping the in-app chat
  in reserve?** Recommended: yes. The trade you'd be accepting is §11.2's point 1.
- **D5 — Hand suggestions back as paste-in codes rather than a file the connector writes?**
  Recommended: codes. A suggestions file would be a queue that survives on disk, which P15-7a
  rules out.

---

## 12. Decisions from the grilling session (2026-09-23)

These supersede §11.4 and D4/D5 where they differ.

1. **Option A is dropped.** The questions that matter are "what if"s, and a snapshot can't answer
   them. Worse, it invites the reader AI to work them out itself.
2. **Option B replaces the in-app chat.** The in-app chat (§9) stays in reserve, with a trigger
   that can actually be tested: **one** breach of kind 1 or kind 2 in a golden run sends the work
   back to it.
   - Kind 1: an invented figure, one that appears in no tool result.
   - Kind 2: the wrong basis, today's money and future dollars mislabelled or mixed.
   - Kind 3 (Claude doing arithmetic on real figures) is designed out: tools return the
     differences already worked out and labelled with their basis, so there's nothing to subtract.
3. **Hosted is acceptable; identity is not sent.** Dollar figures go to Anthropic unchanged. The
   connector sends people as Person A / Person B, ages instead of dates of birth, and no names.
   Stage 6 (private mode) is dropped. Local models are best-effort, recorded but not promised.
   "Local first" is demoted from settled precedent.
4. **No suggestion codes (D5 withdrawn).** `proposeEntries` still validates and trial-walks, but
   returns the entries in the entry table's plain-English wording. You add them through the
   ordinary form. No paste box. Revisit only if retyping turns out to be a real nuisance.
5. **Build now; Phase 13 is a warning, not a block.** The page already shows the same unchecked
   figures. The connector's built-in instructions carry a list, kept in code, of areas not yet
   checked against outside calculators. Each Phase 13 item removes its own entry in the commit
   that closes it.
6. **Written by hand, no MCP library.** Messages over stdio covering `initialize`, `tools/list`
   and `tools/call`, in plain Node. P2-9a stays intact. The connector announces a fixed protocol
   version and is tried against the real client at each stage.
7. **Golden questions: 13, run on demand.** Never inside `npm test`. Run before first real use and
   after any change to the connector or its instructions; cost per run is recorded on the first
   run.
   - Scored by code: every `$` figure in the final answer must appear word for word, basis label
     included, in a tool result from that same conversation.
   - **Echoes (user ruling 2026-09-24):** repeating a figure WORD FOR WORD from the user's own
     question is allowed. A rounded or reworded copy of any figure is still a breach, and so is a
     figure that drops its minus sign.
   - The set: 6 what-ifs, 3 that switch basis, 3 that must be refused, and pay the mortgage down
     vs top up super.
8. **Default basis is today's money.** Every figure is labelled. Claude switches to future dollars
   only when asked, or when quoting a figure you'd check against a statement, and says it has
   switched.
9. **Clients.** Claude Desktop for real use: its only way to get figures is the connector. Golden
   runs use `claude -p` restricted by `--allowedTools` to the connector's tools. The connector is
   launched from outside the repo.

10. **The AI never compares two options (Q8).** The connector has no `compareScenarios`
    tool. A single what-if still returns its engine-worked change against the current plan (for
    example "Shortfall Age 84 → 81"), because the engine computes it and Claude only quotes it. For
    "A or B", Claude sets up each option as a suggestion and tells you to add both as scenarios
    and compare them in `enough`'s chart. It never ranks them. The mortgage-vs-super golden
    question passes only if Claude declines to pick a winner.
11. **Carry-forward is reported as not modelled.** Unused concessional cap carried forward isn't
    modelled (the plan has no contribution history). `whatCanYouModel()` says so, and a top-up
    above the cap comes back as a refusal that names the reason.

**Recorded in [ADR-0011](./docs/adr/0011-an-outside-ai-reads-the-engine-through-a-local-connector.md)**, with a pointer note appended to ADR-0006.

---

## 13. Stage 1 build plan — the connector's read tools (gated 2026-09-23: GO)

A read-only check found no NO-GO condition, and its main claims were verified against the code.

- **(a) Node-importable, with no DOM, store or writer.** GO: `planEdits`, `scenarioWalks`,
  `todaysDollars`, `monthsToSeries`, `outcomes` and `sustainableSpend` all load in plain Node.
- **(b) Financial-year totals reconcile.** GO, on one rule: add up nominal `Cents` first, then
  convert once per total. Converting each month and then adding can be off by up to n cents.
- **(c) Checking a draft doesn't touch the save path.** GO: `validatedPlan()`
  (`planEdits.ts:1950`) is the parse door plus the trial walk. `savePlan` is never reached.
- **(d) The basis formatter runs without the page.** GO: `todaysDollars.ts` imports only
  `core/money` and `core/priceLevel`.

**Rulings made here, by precedent (not escalated):**
- **Location: `src/app/chat/tools/`,** as §4 says. A new top-level layer can't join `PURE`,
  because `PURE` bans importing `app/`, and the tools need `todaysDollars`, `scenarioWalks` and
  `planEdits`. So the "no store/, no writer" rule is a new rule for that folder.
- **`runProjection(draftEntries?, scenarioId?)`:** the scenario defaults to the file's active
  one. It stays optional, so a what-if can target a named scenario without comparing two.
- **The not-yet-checked list covers TTR, the Age Pension, CGT and franking** (P13-2, 3, 7 and 8).
  The gate listed only two of them.

**Microtasks** (each one commit, with the mutations it must fail under):

| # | Delivers | Must fail if |
|---|---|---|
| 1 | Import-graph rule: `app/chat/tools/` may not import `store/`, nor call `savePlan`/`writePlan` | a `store/` import, or a `savePlan` reference, is added to a tool file |
| 2 | Financial-year summariser over `Month[]` | a year's total ≠ the sum of its months in nominal cents; it converts before adding |
| 3 | Basis-labelled figure strings (today's money by default) | any figure goes out bare or without its basis |
| 4 | Identity layer: Person A/B by `persons` index, ages not dates of birth | the fixture's **actual** name or date-of-birth strings appear anywhere in serialised output. Scan for the values, not the field names: entry wording and outcomes carry `name` |
| 5 | `getMonth` | `appliedEntryIds` is missing; a raw `Cents` figure goes out |
| 6 | `getMarkers` | a household verdict is pinned to one person; a per-person marker is merged |
| 7 | `runProjection` with drafts, plus the engine-worked difference from the current plan | it reaches the save path; a refusal is swallowed rather than returned word for word |
| 8 | `solveSustainableSpend` | output lacks its basis |
| 9 | `explainAssumption` / `listAssumptions` | a `PROVENANCE_KEYS` field is dropped |
| 10 | `whatCanYouModel` + the not-yet-checked list | adding a type to `UNSPECIFIED_ENTRY_TYPES` leaves the refusal test green (it must read the live constant) |

The Parked list and register §8 exist only as prose, so `whatCanYouModel` carries them as a list
kept by hand in its source (ADR-0011 already says so).

**Progress (2026-09-24):**
- **Done:**
  - Microtask 1 @dd57f66.
  - Microtask 2 @6b67e97, plus a fix @b365a57: the unfunded shortfall has its own field and
    Division 293 tax is counted once.
  - Microtask 3 @c4d5a35: labels carry cents and use `formatCents`, like the month table. The
    golden scorer must treat curly and straight apostrophes as the same.
  - Microtask 4 @781e29b.
- **Every named line and note translates** @fd02679. The engine writes every description
  through an exported helper, and there is no inline description left. The demo walk's hash is
  unchanged (72bfb895…).
- **For microtask 5 (`getMonth`):** `provenance`, on each line and on the month, still carries
  names (franking source strings, Division 293 release caveats). `getMonth` must drop or translate
  it, or the guard throws. **Refusal messages carry names too, and microtask 7 returns a refusal to
  the AI word for word**, so they need translating before step 7, or the guard throws on every
  refused what-if.
- **Microtask 5 `getMonth` @52dab89 and microtask 6 `getMarkers` @c0f3e5b are done.** Every named
  provenance sentence is translated; the fallback is "source omitted: carries a name". Every
  reason a marker can be absent is kept distinct.
- **FIXED @4f2451c:** some provenance sentences carry raw
  "N cents a year" figures (the Guarantee's maximum contributions base, Division 293, fund
  earnings tax, `projection.ts:1212,1229`). They are nominal and unlabelled, and they are exactly
  what an AI would turn into an unlabelled dollar figure. Label them or strip them at the tool
  boundary.
- **Cost:** each tool call walks every scenario (about 35ms). That's fine for now; revisit if
  `solveSustainableSpend` (about 20 walks) makes it matter.
- **Money guard @4f2451c and microtask 7 `runProjection` @aec258a are done.** Refusals are
  translated, and an unlabelled figure is omitted. Differences are worked in nominal cents, then
  labelled.
- **Output size, fixed @6f8a324.** `runProjection` is compact by default: the draft ids, every
  marker (an unchanged one sent once), and per year only the headline differences that moved
  (spending, Age Pension, income from super, tax, unfunded shortfall, total balances). Years with
  no headline change collapse into "2026-27 to 2031-32: no change" lines. `detail: 'full'` returns
  the old output. Demo sizes, compact against full: no drafts 1,817 against 61,044 bytes; retire
  two years later 9,330 against 62,673; a one-off expense 8,568 against 61,709. The test holds the
  retirement case at 10 KB or less.
  - ~~**A RETIRE draft after the plan's own RETIRE changes nothing.**~~ Fixed @ad5060b: a what-if
    can replace the plan's own RETIRE, and the size test now does exactly that (no synthetic copy).
    Re-measured, compact against full: no drafts 1,866 against 61,093; retire two years later
    8,485 against 61,953; a one-off expense 8,617 against 61,758. The retirement case now differs
    from the plan as it is (retiring 2031-05), where the old synthetic copy differed from a plan
    with no retirement at all.
- **Microtask 8 `solveSustainableSpend` @07b96bd.** A converged search returns the factor, both
  figures labelled, the month it is limited by, and the Shortfall Age from one more walk at that
  spend. Every other outcome is a named refusal with the solver's reason and no figure, including
  "above the searched range", whose floor figure is left out. About 0.8 to 0.9 seconds a call on
  the demo (19 walks plus the scenario walk).
- **Microtask 9 `explainAssumption` / `listAssumptions` @aeb7fb2.** Every provenance field goes
  out. A legislated dollar figure carries its record's own stamp, for example
  `$2,100,000.00 (as legislated for 2026-27)`, `(as legislated from 2026-09-20)` or
  `(as legislated for every year)`, and the money guard accepts exactly those three forms. Which
  numbers are money is read off the `Cents` types, and the compiler holds the list of 100
  places to them. An unknown key or topic is refused, lists the topic's keys, and is never guessed.
- **Microtask 10 `whatCanYouModel` @this commit.** The refused types are read from the live
  `UNSPECIFIED_ENTRY_TYPES`. The Parked list, register §8's open limits, carry-forward,
  `VACATE_HOME` (Phase 14) and the transfer balance account are a hand-kept list of 16. The
  not-yet-checked list is P13-2, P13-3, P13-7 and P13-8: each closing item deletes its own line.
- **Open before the golden runs:**
  1. **Guard gap.** A money figure written with neither "cents" nor `$` gets past the money guard.
  2. **Refusals** have names replaced where the name is found, not rebuilt from a template,
     because engine throw sites have no helpers. The identity guard still fails closed.
  3. ~~**The connector itself** (stdio `initialize`, `tools/list`, `tools/call`) is not built.~~
     Built (2026-09-24), below.
- ~~**🔴 BLOCKER for the golden runs: drafts can only ADD entries.**~~ **CLEARED (2026-09-24).**
  - **`listEntries` @8045620.** The scenario's resolved entries: id, type, owner by label, the entry
    table's wording with each figure relabelled on the basis it was stated in (a salary, stated in
    today's wages, ~~is omitted~~ carries the exact tag "(in today’s wages)" since @ea4debe),
    switched on or off in THIS scenario, and the nearest scenario it
    was inherited from.
  - **What-ifs change existing entries @ad5060b.** `runProjection` takes
    `{ add, disable, replace: [{ entryId, with }] }` (a bare list still means add), built as an
    in-memory child scenario of the asked one with `planWithScenarios`, `planWithEntry` and
    `planWithEntryOverride`, and measured against the parent. Named refusals: `UNKNOWN_ENTRY`,
    `ENTRY_NAMED_TWICE`, `ENTRY_ALREADY_OFF`, and `HONOURED_ONCE`: the walk honours only the
    earliest `RETIRE` per Person and the earliest `ILLNESS_SEPARATION` per Household, so a second
    one is refused with "replace the existing one".
- **Account numbers, fixed @this commit.** Every tool names an account as the page does, "super
  account N+1": `getMonth`'s notes carry `superAccount`/`superAccounts` in place of
  `interestIndex`/`interestIndexes`. A draft names accounts from 1 and is stored as N-1; account 0,
  a non-whole number or one the Person does not hold is `UNKNOWN_SUPER_ACCOUNT`, and a door refusal
  that quotes a stored account position is re-numbered from 1.
- **Birth month is not scanned for.** Ages read month by month reveal it anyway, so only the full
  date of birth is guarded.
- **The connector is built (2026-09-24).**
  - **Wages tag @ea4debe.** A salary in `listEntries` goes out as `$60,000.00 (in today’s wages)`
    in either view. The money guard accepts exactly `TODAYS_WAGES_TAG` (curly apostrophe, as
    `MONEY_VIEW_TAG`) and nothing looser.
  - **`proposeEntries` @d3c6fbb.** Takes the same what-if as `runProjection` and checks it with
    `whatIfOrRefusal`. Each added or replacing entry comes back as the entry form's own boxes, with
    what to type in each. The typed text is fed back through the form's own `planEdits` builder and
    must save as exactly the checked draft; if not, it is `NOT_TYPEABLE`. Entries to switch off come
    back in the table's wording. No codes, no ids. A money box's value is the typed text
    ("38000.00"), with no `$` and no tag, because its label names its money. This relies on guard
    gap 1 on purpose. The labels are copies, held to `entryForm.ts`'s `label(...)` literals by a test.
  - **`server/connector.mjs` @5f94445.** Hand-written stdio JSON-RPC 2.0 with nine tools. It
    always announces protocol **2025-11-25**: the newest spec version with `initialize` (2026-07-28
    replaced it with `server/discover`; github.com/modelcontextprotocol/modelcontextprotocol
    `schema/`), and `LATEST_PROTOCOL_VERSION` in the SDK bundled with Claude Code 2.1.281, which
    asked for it in the real run. The plan is read from `config.mjs`'s `PLAN_FILE` on every call,
    and an undeclared argument is refused. A thrown engine error goes out as its class name only.
    `test/connector.test.mjs` spawns the program.
  - **Real client, once.** `claude -p` from outside the repo, on a copy of the demo plan. It called
    `whatCanYouModel`, then for "retire two years later" `listEntries`, `whatCanYouModel`,
    `runProjection` (a replace) and `proposeEntries`. Cost $0.10 each. All 12 `$` figures in the
    what-if answer appear in a tool result, **but Claude dropped the per-figure "(today’s money)"**
    and put the basis once in a heading. Under §12.7's scorer that is a fail: the instructions or
    the tool output need tightening before the golden runs.
  - **Golden-run gotcha:** the user's `~/.claude/settings.json` sets a default `agent`, which hides
    every MCP tool from `claude -p`. Run with `--setting-sources project --strict-mcp-config
    --tools ""` and `--allowedTools` set to the nine `mcp__enough__*` names.
  - **Not fixed, noticed:** the demo's RETIRE note says "stops work at 63", but `getMarkers` gives
    Person A's retirement as 2031-05 "at age 62". The birthday is the 14th, so the age is read at
    the start of the month. ~~P13-7 and P13-8 are ticked in TODO.md but still sit in
    `NOT_YET_CHECKED`, so the connector still warns about CGT and franking.~~ Removed, below.
- **Three fixes from the real-client run (commit A, 2026-09-24):**
  1. **Every figure carries its own label.** The instructions gain rule 2: each dollar figure keeps
     the bracketed label that follows it in the tool result, word for word, in sentences, lists,
     tables and headings alike, and a label stated once in a heading does not count. Every tool
     result that holds a `$` figure repeats that rule as a second text block ("Reminder: …"); one
     without a figure is sent alone, so the tool's own text is still block one, byte for byte.
     Not yet re-measured against the real client: the golden run is the measurement.
  2. **CGT and franking leave `NOT_YET_CHECKED`** (P13-7 and P13-8, verified @7d9882a). The list is
     TTR and the Age Pension.
  3. **Loading the connector creates nothing.** `config.mjs` no longer calls `mkdirSync` at import;
     `server/index.mjs` makes the data directory as it starts, so the server behaves as before. A
     connector pointed at a missing directory answers `NO_PLAN` and leaves it missing.
- **The golden suite and scorer (commit B, 2026-09-24): `scripts/chat-golden.mjs`.** Opt-in, never in
  `npm test`: `npm run build && node scripts/chat-golden.mjs` (`--only W4,C1`, `--model`,
  `--max-budget-usd` per question, default 1; `--out <dir>`; `--score <dir>` re-scores saved
  transcripts with no call).
  - **The 13:** W1-W6 what-ifs (part-time, a lump sum from super, paying off the loan, spending,
    retiring at 60, Person A working on while Person B is retired), B1-B3 basis switches
    (sustainable spend and the entries in future dollars; one month in both), R1-R3 refusals (a death
    benefit to adult children, downsizing, carry-forward), and C1 (loan vs a $40,000 a year salary
    sacrifice, above the cap).
  - **The plan is the demo plan plus a SYNTHETIC home loan** ($280,000 at 6.1%, $2,400 a month),
    because the demo household has none and three questions are about one. It is written to a
    temporary directory outside the repo; the user's own plan is never read.
  - **The scorer:** every `$` figure in the final answer must be in a tool result from the same
    conversation word for word, its bracketed label included (apostrophes normalised; markdown `*`
    and backticks dropped first). Verdicts: `invented` (kind 1), `untagged` and `wrongTag` (kind 2).
    A figure the question itself states is still a breach, marked `(echo)`. ~~A sign dropped from a
    tool's `-$` figure is not caught.~~ Caught since 384d9d1; see the first live run, below. Plus: expected tools called, the basis asked for, a refusal
    both given by a tool (or `whatCanYouModel` read) and said in words, C1's refusal named
    `ExcessConcessionalContributionsNotModelledError`, no winner sentence, and a pointer to the
    scenario comparison. "No winner" is a sentence heuristic: a winner phrase with no negation,
    "which" or "whether" in the sentence. The table prints the sentence it flags.
  - **Self-tests** (`test/chat-golden-scorer.test.mjs`, in `npm test`) on three canned transcripts;
    nine scorer mutations each turn it red.
  - **One live call (W4, spending cut): $0.1359**, 30 figures. The per-figure label held
    everywhere, tables included. It FAILED on 2 kind-1 breaches: "$72,000 a year (today's money)",
    the question's own figure echoed, and "your existing $84,000 entry", a rounded copy of
    `$84,000.00 (today’s money)`. **Open for a ruling:** whether echoing the user's own figure
    counts as kind 1. As scored now, it does.
  - **Noticed, not fixed:** `WORK_PATTERN_CHANGE.annualSalary` is the salary at the stated days, not
    a full-time figure (`plan.ts`). The connector's params text says only "in today's wages", so a
    model can pass the full-time salary and get "no change".
- **The first live golden run (run1, 2026-09-24): 13 kind-1 breaches, three causes, each fixed as a
  class.**
  1. **The scorer (@bfde764).** 9 of the 13 were a tool's negative figure written without its minus
     because words carried the sign ("lower by $17,730.48 (today’s money)", "Tax is down
     $18,514.71 …"). The verdict is now `signInWords`, not a breach, and the table lists each for a
     human to audit. Accepted only for a direction word straight before the figure ("lower by",
     "down", "fell by", "a drop of", "less" …), in the list or "and by" it governs, or "less"/"lower"
     straight after; the label is still checked. Anywhere else, and after "higher by" or "up", a
     dropped minus stays invented. **Not caught, either before or now:** a direction word that
     contradicts the sign ("lower by $X" against a tool's positive `$X`).
  2. **`proposeEntries` money (@f850c74).** Claude wrote the bare box text "40000.00" as
     "$40,000.00 (as typed; dollars on the day)" and "$72,000.00" (W2, W4). Each money box now has
     `amount` beside `value`: the same cents, labelled by `listEntries`' own `labelledEntryFigures`
     (a spending level in today's money, a salary "(in today’s wages)", a nominal amount converted
     at its own month on the asked basis), so the tags are `MONEY_VIEW_TAG` and `TODAYS_WAGES_TAG`,
     both already accepted by the money guard, which is unchanged. Rule 8 says to quote `amount`
     and give `value` only as what to type. `value` still relies on guard gap 1.
  3. **Legislated figures from memory (this commit).** R3 wrote "under $500,000" for the
     carry-forward balance test: right law, no tool. Rule 9: never state a legislated amount,
     threshold or cap from memory; fetch it with `explainAssumption` or don't give it.
     `whatCanYouModel`'s carry-forward limit now states `$500,000.00 (as legislated for every
     year)` (`superannuation.carryForward.totalSuperBalanceTest`) and the general cap
     `$32,500.00 (as legislated for 2026-27)` (`superannuation.caps.concessional`), each read from
     its record; the pension age (67) and Guarantee rate (12%) in two other limits are now read from
     theirs. A source canary holds the file to no typed `$` figure, amount, percentage or 67. The
     Medicare levy limit names thresholds but no figure, and is left as it is.
  - **Re-scored run1:** 10/13 pass; kind 1 breaches 4 (W2 ×2, W4 ×1, R3 ×1), all real, and all of
    the kinds fixes 2 and 3 address; kind 2 breaches 0. Nine figures marked `signInWords` (W1 ×5,
    W5 ×4). The live suite has not been re-run.
  - **Noticed, not fixed:** R3's `ExcessConcessionalContributionsNotModelledError` refusal reaches
    the model with every figure omitted, the forecast cap included, so the model cannot say how
    much room is left under the cap.

---

## 14. The trigger fired (2026-09-24); the in-app chat goes ahead

- **Golden run 2** scored 12/13. W6 rounded and averaged figures in prose ("about $62k less a year").
  The user chose to honour ADR-0011's trigger. See the ADR-0011 note of the same date.
- **Order:**
  - stage 0, measure the provider (CORS and tool use from localhost:4173);
  - stage 3, chips and the guard (built on the existing tools);
  - stage 4, provider adapters, key handling and settings;
  - stage 5, the chat panel, with review and accept through the ordinary save path;
  - stage 7, scripted conversations in `npm test`, plus the live golden suite re-pointed at the in-app chat.
- **Kept from §12:**
  - identity is removed (Person A/B, ages);
  - today's money by default;
  - the AI never ranks two options;
  - the not-yet-checked list is derived from code;
  - the refusals.
- **Dropped:** stage 6, private mode (hosted is acceptable without identity).
- **Chips show whole dollars,** following the user's 2026-09-24 ruling on the web interface: "no cents anywhere in this interface".
- **The connector remains** as a secondary route. The README says its prose summaries are not guaranteed.

### Stage 3 as built (2026-09-24)

Pure modules under `src/app/chat/`, with no provider and no panel yet.

- **The figure store** (`figureStore.ts`). Each tool result gets an id (`t1`, `t2`, …) for the whole
  conversation. Each figure in it gets a path, and the store keeps its RAW value, not its label.
  - The marker grammar is `⟦<id>:<path>⟧`. Keys are joined by `.`, and an array element is `[i]`. A
    financial-year row is `fyYYYY-YY` instead. A figure inside a sentence is the sentence's path, then
    `#` and its place in the sentence, counted from 1.
  - The model sees each figure as `⟦t2:…agePension⟧ $31,240 (today’s money)`: whole dollars, in the
    basis the tool was asked for.
  - The tools are not forked. `tools/figureCapture.ts` makes the two labelling sites append the raw
    value during a capture. Outside a capture every tool's output is unchanged, and a test proves it.
- **Chips** (`chips.ts`). Each marker becomes a chip showing the ENGINE's value, converted when it is
  shown, in the page's current basis. A figure that is stated in today's money converts the other
  way. Chips show whole dollars. A chip links to `#month-YYYY-MM`, or to `#month-YYYY-MM-line-N` for a
  line. The month table doesn't have those anchors yet: the panel adds them in stage 5.
  - A marker that doesn't resolve, or is malformed, becomes a red "no such figure" chip, never text.
- **The guard** (`guard.ts`) reads the prose outside the chips, and handles two kinds of number.
  - **Money is always struck.** That covers `$`, `A$` and `AUD`; k, m and bn amounts; a number beside
    "thousand", "million", "billion", "dollars", "bucks", "grand" or "cents", in digits or in words;
    and any number with a thousands comma or five or more digits. A figure the user wrote in their
    own question is struck too.
  - **Any other number in digits** stands only if it appears word for word in the question or in a
    tool result (D3). The figures the model was shown are removed from that source text first. The
    numbering of an ordered list is exempt.
  - **Limit, stated plainly:** a tool result is long, so a small number such as an age from 27 to 68
    on the demo plan usually appears somewhere in it. An invented age in that range therefore gets
    through. Dollar amounts can't get through this way.
  - W6's sentence is a test fixture, and both of its figures are struck.
- **The instructions** (`instructions.ts`) tell the model to write every figure only as its marker,
  never to write an amount of money, and to write only the numbers D3 allows. The connector's other
  rules are its own sentences: never rank two options, today's money by default, Person A and
  Person B, the not-yet-checked warnings, and accepting refusals. They're exported from
  `instructions.ts`, and the connector now imports them.
- The import rule now covers all of `app/chat/`: nothing in it may import `store/` or name a writer.


### Stage 4 as built (2026-09-24)

Pure modules under `src/app/chat/`. There is no panel yet (stage 5), and no live call was made: there
is no key yet.

- **Stage 0, recorded.** From `Origin: http://localhost:4173`, Anthropic's CORS preflight answers
  `access-control-allow-origin: *` and allows `x-api-key`, `anthropic-version`, `content-type` and
  `anthropic-dangerous-direct-browser-access`. Ollama isn't installed here, so **the local path is
  recorded as unavailable** and the only provider offered is `anthropic` (P15-3 stays open).
- **One tool catalogue** (`toolCatalogue.ts`). The connector's tool names, descriptions, schemas and
  refusals moved out of `server/connector.mjs`, and both routes use them. The connector's `initialize`
  and `tools/list` output is byte-identical.
- **The adapter** (`anthropic.ts`) uses plain `fetch()` to `<endpoint>/v1/messages`, straight from the
  browser, with the user's key in `x-api-key`. `provider.ts`'s `endpointRefusal` turns away several
  kinds of endpoint before any request is made: one that isn't a web address, one that is enough's own
  origin, one that isn't `https://`, and one that carries a query, a fragment or credentials. There is
  no proxy route to fall back on. Usage is read from every response, with cache tokens counted as
  input. Failures come back as plain English:
  - unreachable (the network or the endpoint);
  - the key refused (401);
  - not permitted (403);
  - the model or endpoint unknown (404);
  - the rate limit (429);
  - overloaded (529 or 503);
  - a fault at the provider (other 5xx);
  - a refused request, in the provider's own words (other 4xx);
  - an answer in a shape the chat can't read.
- **The loop** (`conversation.ts`) runs question → model → tool calls → figure store → … → prose, then
  hands the prose to chips and the guard. A turn answers at most **8 rounds of tool calls**
  (`MAX_TOOL_ROUNDS`, so at most 9 model calls). A turn that fails leaves the conversation as it was.
  The model declining, or its answer being cut off at the length limit, ends the turn with a message.
- **Settings** (`chatSettings.ts`) are all inputs: on/off (**off by default**), the provider, the
  endpoint, the model name, the key, the input and output prices per million tokens, and a monthly
  ceiling. **Nothing else has a default**, so the chat refuses to ask until each one is set, and names
  the ones that are missing. No model name or price appears anywhere in `src/`, and a raw-source test
  sweeps for both.
- **The ceiling** is checked before every model call. When this month's spending has reached it, the
  turn is refused with a plain message and nothing is sent. Each response's cost is stored as soon as
  it arrives. Limit, stated plainly: a call already under way when the ceiling is crossed is still paid
  for, so the ceiling can be overshot by at most one response.
- **Storage.** Everything above, together with this month's spend, lives under one localStorage key,
  `enough.chat`, as `{ version: 1, settings, spend: { month, dollars } }`. A stored value this build
  can't read is treated as "off" and is not overwritten. ADR-0008 has a dated note explaining why the
  settings belong there.
- **Proved** (`test/app-chat-key-isolation.test.mjs`). `fetch` is intercepted through a load, a
  question, a save, a second question and a second save, with the chat on. The key is in no request to
  the local server and in no header or body sent there. It's absent from the PlanFile, from
  `plan.json` as written, and from the export shape. Every request that carries it goes to the
  endpoint. With the chat off, and with it on but unused, the demo walk is `72bfb895…` and the
  connector fixture is `a250af6a…`.
- Chips now round through `displayMoney.ts`'s `roundToDollar`, and stage 3's local formatter is gone.

### Stage 5 as built (2026-09-24)

The chat is on the page. No live call was made: there is no key yet, and the render below used a fake.

- **The settings box** (`chat/chatPanel.ts`, in its own "The chat" box beside the settings): on/off (off
  by default), the provider address, the model name, the key in a password box, the two prices per
  million tokens and the monthly limit. It shows this month's spend against the limit in whole dollars
  ("under $1" below a dollar), and one line: figures go to Anthropic, names and dates of birth don't. It
  reads and writes through `chatSettings.ts` only.
- **The panel** is not in the page while the chat is off: its host is empty and hidden, and no
  conversation or queue exists. On, it holds the question box, the conversation and the review queue.
  A reply goes on the page only as `chips.ts` rendered it, and is rendered again when the money toggle
  flips. A failed turn shows `conversation.ts`'s own message.
- **Chip links.** `monthAnchors.ts` gives each month row `month-YYYY-MM` and each line
  `month-YYYY-MM-line-N` (N as the engine counts `Month.lines`) after `renderTable` paints. It is
  additive: no column or cell changed. Following a chip opens the month, scrolls to the line and marks it.
- **Review and accept (P15-7, P15-7a).** `conversation.ts` hands back, with each answer, the
  `proposeEntries` calls the tool passed. `reviewQueue.ts` re-checks each against the plan the page
  holds now and queues it in memory. A card gives the entries in the entry table's wording and the
  trial walk's effect (`runProjection`, recorded in the card's own figure store) as chips. **Accept**
  builds each entry with the entry form's builder, adds it with `planWithEntry` to the suggestion's
  scenario, switches off with `planWithEntryOverride`, and passes the candidate to the page's own
  `save`, which is `savePlan`. A refusal writes nothing and the card stays. **Reject** writes nothing.
  A reload empties the queue.
- **`origin` (P15-13, built 2026-09-28):** each entry Accept adds carries the turn behind it —
  question, reply with chips resolved to the whole-dollar values shown, model, ISO date. The door
  checks and bounds it; a plan without it re-saves byte-identically; no walk figure and no tool's
  output changes (`test/app-chat-origin.test.mjs`). The ADR-0006 warning is in the review box, since
  Export (P8-3) is deferred and has no screen yet.
- **Deferred:** `proposeScenario` is not built.
- **Instruction 10** now says that a passed suggestion goes to the review list and nothing is added
  until the user accepts it.
- **Proved** in `test/app-chat-panel.test.mjs`, through a stand-in DOM, since there is no jsdom (P2-9a):
  - the panel is absent while the chat is off, and the demo walk is still `72bfb895…`;
  - "$62k" is struck, and an unknown marker is a red chip;
  - a chip's href is an id in the rendered table, on the line it came from;
  - a candidate `savePlan` refuses is not written;
  - reject writes nothing;
  - the queue is not in storage and does not survive a reload;
  - over a whole panel session, the key is in no request to the local server. This reuses stage 4's
    `fetch` interceptor, now `test/fixtures/chatFetch.mjs`.
