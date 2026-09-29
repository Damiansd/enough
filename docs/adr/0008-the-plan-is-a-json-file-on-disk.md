# The plan is a JSON file on disk, not a database

State lives in `plan.json`, a single versioned JSON document written through to disk on every
change by the local server. Transaction history lives in `ledger.json`, a separate file. There is
no database, and no browser storage holds plan data. SQLite is deferred behind a written trigger
that is expected never to fire.

## Why

**Diffability, first, because auditability is the governing constraint.** ADR-0004 states it
plainly: auditability is the thing a spreadsheet gives free and a web app has to earn. A JSON
plan can be read in a text editor, diffed against last month's copy, committed to a private
repo, and handed to another person who can check it without running our code. `git diff` on a
plan file shows that the deeming rate moved from 2.25% to 2.75% and nothing else did. That is not
a nicety layered on top of the model; it is the same property the month table exists to provide,
extended to the inputs. A SQLite file is an opaque binary. Every question of the form "what
changed, and when?" then needs a tool we would have to build, and would build worse.

**Every documented read is a whole-set read.** ADR-0002 settled that a Scenario is a Baseline
plus an append-only list of entries, replayed from scratch on every change. The projection loads
all the settings and all the entries, every time, and a solver does it twenty times in a row.
There is no query here. A database's central advantage — fetching a slice of a large set without
touching the rest — is an advantage over an access pattern this design does not have. The
horizon is ~500 months, the entry list is dozens of records, and the whole plan is measured in
kilobytes.

**The export shape is a security control, and it must stay assertable.** ADR-0006 makes the
export the defence for the API key, not the `.gitignore` rule: the exported plan must be provably
safe to hand to someone else. That is a test that enumerates fields on a serialised object and
fails if an unexpected one appears. Keeping the working file and the export the *same shape*
makes that assertion cover both. With a database in between, the export becomes a projection of
a schema, the assertion covers only the projection, and a column added in a hurry is invisible to
it. The security property degrades from structural to remembered.

**Two files, because they have different sensitivity.** A plan file is balances, ages and
assumptions — the sort of thing you hand an adviser. A ledger is a record of everything the
household bought, and nobody hands that to anyone. Keeping them separate makes sharing a copy
decision instead of a redaction problem, and it means the plan stays small and diffable no matter
how many years of transactions accumulate behind it.

## How it applies

- **Save and Export are different verbs.** Save is continuous: the browser writes through to
  `plan.json` via the server on every change, atomically (temp file, then rename), so an
  interrupted write cannot truncate a plan. Export is deliberate: a dated snapshot for archiving
  or handing over. The documents used to conflate the two because there had only ever been one.
  Import accepts either, and checks the version.
- **The plan carries its own "today".** `settings.asAtDate` is part of the file, and `project()`
  never reads the clock — see the note appended to ADR-0002. A plan is reproducible because
  everything the projection reads is inside it.
- **No plan data in localStorage.** Not as a store, not as a cache. The only thing localStorage
  holds in this project is the optional API key (ADR-0006), which makes that rule trivial to
  state and trivial to test.
- `.gitignore` covers `plan.json`, `*.plan.json`, `ledger.json`, `*.ledger.json`, `imports/` and
  the formats bank data actually arrives in — CSV, OFX, QIF, QFX, XLS, XLSX. Committed fixtures
  are negated back in, and no parent of `fixtures/` may ever be excluded, because a negation
  cannot resurrect a file inside an excluded directory and git will not warn you.

## Consequences

- **We hand-roll what a database gives free**, and the list is short: atomic writes, a version
  field checked on read, and a migration function per version bump. Written once, in the store
  layer, behind the boundary that `core/` and `data/` may not import.
- **A full write rewrites the whole file.** At kilobytes this is irrelevant. It stops being
  irrelevant somewhere, and that somewhere is the trigger below.
- **SQLite is deferred to Phase 11, with a trigger.** It is reconsidered if the ledger exceeds
  **250,000 transactions**, or if a full ledger write is **measured** above **250ms**. Measured,
  not felt. Neither is plausible for one household's spending history — a decade of transactions
  is tens of thousands of rows — so the honest expectation is that this never fires. It is
  written down anyway, so the decision has an exit that is evidence rather than mood.
- If the trigger ever does fire, it fires for the **ledger only**. The plan file is not on the
  table: its size is bounded by the number of Journal Entries a person writes by hand, and it is
  the artefact the diffability argument is about.
- Anyone later proposing a database "for structure" should read this first. The structure is in
  the types, and the types are checked at compile time.

## Note, 2026-09-24 — localStorage also holds the chat's preferences and its spend counter

"The only thing localStorage holds in this project is the optional API key" is extended, not
reversed. The in-app chat (plan_ai.md §14, stage 4) keeps three things in this browser's
localStorage, under **one key, `enough.chat`**: the API key; the chat's settings (on or off, which
is off by default, the provider, the endpoint, the model name, the input and output prices per
million tokens, and the monthly cost ceiling); and this month's spend counter.

**Why there and not in `plan.json`:** they are preferences for this browser, not plan data. None
of them changes a figure the engine computes, and none belongs to the household the plan
describes. A plan handed to an adviser, or opened on another machine, should arrive without
someone else's key, their choice of model or what they spent on it this month. The spend counter
has to live beside the ceiling it is checked against, on the device that makes the calls.

**What is unchanged:** there is still **no plan data** in localStorage, and none of this ever enters
`plan.json`, an export or any request to the local server. `test/app-chat-key-isolation.test.mjs`
intercepts `fetch` through a load, two questions and two saves with the chat on, and asserts all
three. The same sentence in [ADR-0006](./0006-the-chat-never-computes.md)'s 2026-09-04 note
("localStorage still holds the API key and nothing else") is overtaken in the same way.
