# The chat interface translates and explains; it never computes a number

An optional AI chat sits on top of the finished tool. It turns a natural-language question into
proposed Journal Entries, calls the existing pure `project(settings, entries) → Month[]` engine,
and explains the rows that come back. It performs no arithmetic of its own — not a tax bracket,
not a means test, not a rounding. Every figure it utters must be quotable from a specific month
and line item in the engine's output.

## Why

The question a person actually asks is natural language: *"what if I go three days a week at 62
and put $200k of super into the mortgage?"* That sentence is already a set of dated Journal
Entries — a `WORK_PATTERN_CHANGE`, a `RETIRE`, a `LUMP_SUM_FROM_SUPER` gated on a Condition of
Release. Translating prose into structured, dated, owned entries is exactly what a language model
is good at, and it is the step that currently costs the most clicks.

Arithmetic is the opposite case. Phases 1 and 13 exist to make one engine trustworthy: primary
sources for every constant, a hand-worked Age Pension figure, Moneysmart for the baseline,
golden files on the demo couple. A model that computes a deeming figure or tapers an assets test
in its own head produces a number that has passed none of those gates, wearing the same prose as
one that has. It would silently discard the entire verification effort while making the output
*more* convincing. **This is the single most important constraint in the v3 scope**, and every
other rule below exists to enforce it.

The same reasoning puts the feature in v3 rather than v1. An explainer over an unverified engine
does not produce obviously bad answers; it produces fluent, confident, wrong ones. That is worse
than no tool at all, because fluency is what stops a reader checking. The chat is therefore
blocked on Phase 13, for the same reason aged care is.

## How it applies

**The tool surface is split, and the split is enforced.** Read-only tools may run the engine and
read the plan; they may not write. Proposing tools write only to a review queue.

| Tool | Kind | Contract |
|---|---|---|
| `runProjection(scenarioId, draftEntries?)` | read | Runs `project()`. `draftEntries` are applied in memory for the turn only and are never persisted |
| `getMonth(scenarioId, month)` | read | One month's full line-item breakdown, `appliedEntryIds[]` included — the provenance source |
| `getMarkers(scenarioId)` | read | Shortfall Age, Pension-Only Age, Home Status changes, exemption-clock expiry, entitlement cliffs |
| `compareScenarios(idA, idB)` | read | The same diff the comparison chart draws |
| `solveSustainableSpend(scenarioId)` | read | Wraps the Phase 10 binary search; honours the contingency floor every month |
| `explainAssumption(key)` | read | Returns the value, its FY stamp, its source and retrieval date from the assumptions object |
| `proposeEntries(scenarioId, entries[])` | propose | Writes to the review queue. Never to the plan file |
| `proposeScenario(name, parentId)` | propose | Same. Inheritance by `parentId`, never a copy of entries |

There is no tool that edits a Setting, no tool that disables an entry, and no tool that writes
the plan file. A chat turn implying a plan change ends in visible, reviewable proposed entries
the user accepts or rejects one by one — [ADR-0004](./0004-the-tool-proposes-you-dispose.md)
applied to its cleanest case yet. The chat is a faster way to *draft* an entry, never a faster
way to commit one.

**Provenance is a hard gate on output, not a style preference.** Any figure stated in prose
carries the month and line item it came from, in the same form the Phase 5 month table shows:
"$1,240 a fortnight of Age Pension in Mar-2034, from the assets test — month table, Mar-2034,
Age Pension row". A claim that cannot be traced to an engine row must not be uttered. This is
what stops the chat becoming the black box that Phase 5 exists to prevent, and in practice it
means the model is never asked to remember a number: it cites what a tool returned this turn, or
it re-fetches.

**A 40-year projection does not go into context.** ~500 months of line items per Scenario, per
turn, is unaffordable and unnecessary. `runProjection` returns financial-year rows plus the
markers; `getMonth` fetches the full breakdown for the handful of months the answer actually
turns on. Provenance survives because the citation names a month, and the month is fetchable —
summarising is safe precisely because nothing is being remembered.

**Out of scope means refusal, not improvisation.** Aged care is v2 and Monte
Carlo, investment property and sell-to-rent are not scoped at all. Asked about any of
them, the chat says the engine cannot answer it and points at where the reasoning lives —
§5.11 and Phase 14 for care, the Parked list for the rest. Improvising an answer the engine
cannot produce is the failure mode this whole ADR is written against. **CGT left this list on
2026-09-04** ([ADR-0009](./0009-the-non-super-portfolio-is-funded.md)): the engine computes it, so
the rule reverts to the ordinary one — quote the engine's row, never a figure of the model's
own. **Franking credits left it the same day**
([ADR-0010](./0010-franking-credits-are-in-scope-on-both-sides.md)) and are subject to one extra
care: the engine computes the credit on **both** sides of a sacrifice-versus-invest question, so a
comparison answered from one side is a wrong answer rather than a partial one.

## Consequences

- **Real financial figures leave the machine.** Calling a hosted model sends balances, salaries,
  ages and spending to a third party over the network. The project's stated posture is no server,
  no accounts, no cloud; this knowingly breaks the third of those. It is the price of the
  feature and it is not a footnote. Mitigations, in order of preference: a local model over
  `localhost` (Ollama or equivalent), which keeps the posture fully intact; a **redacted mode**
  that reasons over the demo couple's shape or over scaled and relative figures; and only then a
  hosted provider with real numbers.
- **The API key is the user's, and it never touches the plan file.** Entered by the user, held in
  localStorage, excluded from Export/Import by construction — the exported plan JSON is the
  source of truth and must remain safe to hand to someone else. `.gitignore` already covers
  `plan.json`; a key written into that file would be one careless `-f` from a commit, so the
  export shape is the defence, not the ignore rule.
- **The browser calls the provider directly.** No intermediary server, so the "no server" half of
  the shape survives. This constrains provider choice to those permitting browser-origin calls
  with a user-supplied key.
- **The chat defaults off, exactly as the HEAS facility does.** The tool is 100% functional with
  the chat absent, the key missing or the provider unreachable. It is strictly additive; nothing
  in the engine, the month table or the chart may come to depend on it.
- **Turns that changed the plan are persisted; the rest are not.** An accepted proposal records
  the turn that produced it, so a decision made in March is still readable in September —
  the same reproducibility argument as append-only entries in
  [ADR-0002](./0002-journal-entries-as-overlay.md). Idle conversation is discarded. The cost is
  that the plan file now contains free-text reasoning about real money, which raises the
  sensitivity of the export rather than the sensitivity of the repo.
- **Three failure modes are specific to this feature, and each needs a mechanism rather than a
  warning.** A hallucinated entitlement or a plausible-but-wrong AU rule claim is answered by
  routing every rule question through `explainAssumption`, which returns the FY-stamped value and
  its source, and by refusing rule claims that no assumption key backs. A correct engine figure
  restated wrongly in prose is answered by rendering figures as UI chips populated from the tool
  result rather than as model-generated text, so the number on screen is the engine's bytes and
  not the model's transcription of them. Both are checkable: the golden-file demo couple gives a
  fixed set of questions with known answers, and the chat is regression-tested against it like
  any other output.
- Anyone later tempted to let the model "just do the maths, it's only a percentage" should read
  this first. The maths is the part that was verified.

## Note, 2026-09-03 — the local server is not an intermediary

The app is now served over `http://localhost` by a ~40-line Node server
([ADR-0007](./0007-served-locally-over-http.md)), which reads as a contradiction of "no
intermediary server" above. It is not, and the distinction is worth stating so nobody resolves it
the wrong way later.

An **origin provider is not a data intermediary**. The server serves static files and reads and
writes `plan.json` and `ledger.json`; it holds no state, contains no application logic, and
computes nothing. No financial figure transits it on its way anywhere — every byte it touches
travels between this machine's disk and this machine's browser. The claim above is about the
network boundary: the browser calls the model provider directly, with the user's own key, and
nothing sits between them. That is intact.

What this makes explicit is the line that must not be crossed. Routing a provider call through
the local server — for a CORS workaround, to hide the key, for convenience — would create a real
intermediary and end the argument. It is forbidden for that reason. The API key stays in
localStorage, never reaches the server, and is still absent from the plan file and the export by
construction; with no plan data in browser storage at all, the key is now the only thing there.

One phrase above has been overtaken: "the exported plan JSON is the source of truth" was written
when Export was the only way plan data reached disk. The working file `plan.json` is now the
source of truth, and Export is a dated snapshot of it
([ADR-0008](./0008-the-plan-is-a-json-file-on-disk.md)). The argument is unaffected — both are
the same shape, so "the export shape is the defence, not the ignore rule" holds for both, and
the export remains the artefact that must be provably safe to hand to someone else.

## Note, 2026-09-04 — two lines made explicit: no proxy, and the queue holds nothing

Nothing here is new reasoning. Both clarifications close a gap a future reader could fill the
wrong way, and both are cheaper to state than to re-litigate.

**The local server never proxies a model call.** The 2026-09-03 note said routing a provider call
through the origin provider is forbidden; this states the positive form. `server/index.mjs` has
exactly two jobs — serve `dist/`, and read and write the Working File and the Ledger at two fixed
paths chosen in the server and never taken from the request. There is no third job, and an LLM
request is not one of the two. Cloud provider calls are made by the browser with `fetch()`, with
the user's own key, straight to the provider. A local model at `http://localhost:11434` is the
same shape and the same rule: the browser calls it, and in that mode no financial figure leaves
the machine at all. If a provider's CORS policy makes a browser-origin call impossible, that
provider is unsupported — it is not a reason to add a proxy route.

**The review queue is in memory, and holds nothing across a reload.** `proposeEntries` and
`proposeScenario` write to a queue that lives in the page. It is not `plan.json`, and it is not
browser storage either: an earlier design persisted it in IndexedDB, which was retired along with
the browser-sandbox architecture that made a browser-side store necessary at all
([ADR-0008](./0008-the-plan-is-a-json-file-on-disk.md)). In-memory is now both correct and
simpler. A proposal that is never accepted leaves no trace — which is the intended behaviour, not
a limitation: an unaccepted proposal is a suggestion the user declined, and ADR-0004 says a
suggestion that survives a decision is a binding in disguise. Accepting one writes real Journal
Entries through the ordinary Save path, along with the turn that produced them; closing the tab
before accepting discards it. localStorage still holds the API key and nothing else.

## Note, 2026-09-23 — delivered through a local connector; see ADR-0011

Phase 15 is delivered as a local MCP connector read by Claude Desktop, not as an in-app chat
([ADR-0011](./0011-an-outside-ai-reads-the-engine-through-a-local-connector.md)). The rule that
the chat never computes is unchanged. How it is kept changes: in Claude's window it is an
instruction checked by the golden questions, not a chip guard. One breach sends the work back to
the in-app design above. "Local model first" is demoted: hosted is acceptable, with identity
removed.
