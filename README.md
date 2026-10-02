# enough

A personal retirement and cashflow forecaster for an Australian couple. Superannuation,
transition to retirement, Age Pension, assets outside super with their CGT and franking credits
(modelled on both sides — inside super and outside it, see [ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md)), mortgage and spending — with dated what-if entries and multiple scenarios compared on one chart.

**Status: design complete. The projection engine runs a plan into month-by-month figures, and the
app renders them from a `plan.json` on disk — an auditable, expandable month table (Phase 5), a
Protected-versus-Assessable wealth chart with a Date/Age toggle and a Household-versus-per-Person
split toggle (P7-2, P7-6, P7-9), and N scenarios compared as total-wealth lines on one chart
(P7-1). Scenarios can be created, cloned, renamed and deleted, and inherit from one another by
reference rather than by copying entries. The entry editor is in (P6-6): the twenty-four entry types this
build can honour — `RETIRE`, `WORK_PATTERN_CHANGE`, `SUPER_CONTRIBUTION`, `LUMP_SUM_FROM_SUPER`,
`NON_SUPER_INVESTMENT` (buy or sell), `SPEND_CHANGE`, `ONE_OFF_EXPENSE`, `GIFT` (money given away, nominal on
the day; the part over $10,000 in a financial year or $30,000 over five, one set of limits for a couple,
is counted as an asset and deemed for 5 years from the gift, gifts from before the plan included; no
exception is modelled), `MORTGAGE_REFINANCE`
(which sets a home loan's terms from a date, and can start one where there was none),
`MORTGAGE_TARGET` (a payoff or offset date to check against retirement, changing no figure),
`MORTGAGE_PAYOFF` (pay the home loan off in full in one month, out of cash),
`RETURN_CHANGE` (a new investment return assumption from a date, per Person, P2-11),
`TTR_START` (a second accumulation account becomes a transition to retirement pension from a date at
60 to 64; before it the account is accumulation, and it converts at a later `RETIRE` or at 65),
`TTR_RATE_CHANGE` (a new yearly drawdown rate for one transition to retirement pension, from a
date; a change mid-year re-sets the rest of that year),
`INSURANCE_COVER_CHANGE` (cancel or cut back the death and/or TPD cover in one super account from a
date: that premium falls by the same share, and the insurance admin fee stops once both are nil;
raising cover, an account with no premium for it, and a date at or after 70 are refused, P3-17a),
`SPOUSE_CONTRIBUTION` (an after-tax contribution into a spouse's superannuation, which may earn a
tax offset up to $540, P3-19), `ILLNESS_SEPARATION` (a couple living apart because of illness or
care: each is paid the single Age Pension rate, means-tested together; tax still treats them as a
couple, P12-4), `DEATH` (one of a couple dies: the survivor is means-tested as single, gets the
deceased's super as one tax-free lump sum and their investments at their own cost base, P12-1) and
`ENTER_CARE` (one Person moves into residential aged care: the home value, room price and lump sum are
the user's own estimates on the entry; fees are means-tested, and the deposit is exempt for the Age Pension
and refunded at death, Phase 14) and `HEAS_DRAW` (a Home Equity Access Scheme loan against the home, from
this date, owner `household` only: a stated fortnightly draw or the most allowed — 150% of the full Age
Pension less any Age Pension received — until an optional stop date; the debt compounds at 3.95% and is
repaid from the home at sale or death, with a no-negative-equity guarantee that a same-or-later
`MORTGAGE_REFINANCE` would void, so the door refuses one rather than let it through, Phase 9) and
`SELL_HOME` (sell the home outright: proceeds, net of the mortgage and any Home Equity Access Scheme
debt — capped at the sale price — land in cash, and the household becomes a non-homeowner from that
date; the main residence Capital Gains Tax exemption is total, so no tax is charged; a household
planning to buy again can set part of the net proceeds aside, excluded from the Age Pension assets
test — but still deemed, at the lower rate only — for up to 24 months, P14-13/P14-13c; a `BUY_HOME`
ends the window) and
`RENT_OUT_HOME` (rent the whole home out from a date to an optional end date: the net rent — weekly
rent less council rates, insurance, agent's fees and repairs — is assessable income for tax, the Age
Pension and aged care, never deemed, and floored at nil for the two means tests but not for tax; the
home becomes an assessable, non-homeowner asset once nobody protects it, valued from an `ENTER_CARE`
entry's own estimate or refused if none exists; a later `SELL_HOME` more than 6 years after this date
is refused, P14-13) and `BUY_HOME` (buy a new home after a `SELL_HOME` in the same scenario: the price
and stamp duty and fees, your own estimates in today's money, are paid first from the sale's set-aside,
then through the Waterfall, and refused if they cannot be paid in full; the household is a homeowner
again from that date and the sale-proceeds exemption ends; a first home without a sale, a second
purchase, and a purchase with anyone in aged care are refused, P14-19) and `DOWNSIZER_CONTRIBUTION`
(up to $300,000 of home sale money into one Person's own super, 55 or older, within 90 days of a
`SELL_HOME` in the same scenario, the couple's total at most the sale price, once per Person, with 10
years' ownership stated rather than checked; paid from the sale's set-aside first, then through the
Waterfall, refused if it cannot be paid in full; no contributions tax, no cap, no deduction, P9-5) — can
be added, and any entry switched off, validated before it is written and re-projected on save. The
other three types named in `plan.ts` are refused at the door, so the form cannot offer them. Entries are never edited
in place and never deleted — ADR-0002's append-only journal. The Household itself is editable on a
Settings panel, and a first run with no plan file on disk asks only for a name and a date of birth,
writing nothing until that is confirmed — no demo figures are seeded (2026-09-20).**

## The home loan, and what it does not do

A **stated home loan** — what is owed, the rate, and the monthly repayment — is amortised month by
month, and **the Offset Account is finally put to work**: interest is charged on the balance *less*
whatever sits in the offset, so a larger offset means a smaller charge and more of the same
repayment landing on the principal. Nothing is paid *into* the offset; it simply is not charged
against. The repayment appears as two lines, interest and principal, because the offset's whole
effect is visible only in the interest half.

**The repayment is charged ON TOP OF the stated yearly spending figure**, and the form says so where
the figure is entered. Most people's mental spending number already contains the mortgage, and
counting it twice would make the forecast worse than the life.

**The limits, and which way each one runs.**

- **Owing money on the home changes the Age Pension not at all.** A home loan is netted only against
  the asset it secures, which is already exempt — it is **not** deducted from other assets, and the
  offset is still assessed in full. That asymmetry is the law, not a simplification, and it is
  sourced to Services Australia in `data/assumptions/agePension.ts`.
- **A repayment too small to cover the month's interest is refused, not forecast.** That loan would
  never be repaid, and a projection of it would be a fiction.
- **The loan's terms can change from a date, and a loan can start where there was none.** A dated
  entry sets what is owed, the rate and the repayment from that month — so a household that
  refinances, or buys later, or pays one loan off and borrows again, can say so. **What you still
  owe is shown for every month**, so "am I clear before I retire" is a question the table answers.
- **A loan can be paid off in full in a chosen month** — the whole balance plus that month's interest
  leaves the household's cash, and a month that cannot fund it shows a shortfall rather than a loan
  that quietly vanished. The terms stay on record, so borrowing again later is a new loan.
- **Paying PART of a loan off early with a lump sum, redraw, extra repayments and interest-only loans
  are still not modelled.** A household that will do any of them cannot say so, and the forecast will be
  wrong for it in whichever direction that change would have run.
- **A dated change cannot be checked when the file is read, only when the month is reached.** Whether
  a repayment covers the interest depends on the offset balance at that date, which is a result of
  the forecast rather than something in the file. A loan stated for *today* is still refused at the
  door, naming the field; a dated one that cannot be repaid is refused when the projection reaches
  it, naming the entry.
- **A household stating no loan is unaffected to the cent** — the whole projection is byte-identical
  to the build before this existed.

## Superannuation contributions, and where the engine stops

A stated **salary sacrifice** is priced end to end: it reduces the salary assessed for income tax,
it is added back for Rebate Income by the mechanism the Act names, the cash actually leaves the pay
packet, and what survives the fund's 15% contributions tax is credited to the interest the plan
names. The **Superannuation Guarantee** is computed on qualifying earnings — a sacrificed amount is
itself qualifying earnings from 1 July 2026, so sacrificing no longer shrinks the base — credited
net of the same 15%, and measured against the general concessional cap *together with* the
sacrifice. **Division 293**, the further 15% where a Person's Division 293 income and their low tax
contributions exceed $250,000, is charged monthly and trued up at the end of the year; the
ITAA 1997 Subdiv 293-B election to have that charge released from a named superannuation interest
instead of paid out of the Person's own cash is settable on the household form, one single-choice
control per Person, nothing pre-selected.

An arrangement **holds from its date until something supersedes it**, and there are two ways to end
it, which differ in what they do to the past: **stop it from a date** and the years it ran are
untouched — the money stays in the fund and stays counted against those years' cap — while
**switching the entry off** takes it out of the whole forecast, those years included. A stop states
nothing but its date, and a later arrangement restarts one. The stated amount is a fixed number of
dollars and does not rise with prices or wages (register **O88**, ruled 2026-09-21): to change it,
state the new amount from the month it changes.

**The limits, and which way each one runs.** A feature list read as a completeness claim is the
failure mode this section exists against.

- **Only FY2026-27's general concessional cap is published. Every later year is now INDEXED from
  your own stated wage-growth figure, and is a FORECAST rather than the law** (2026-09-21). The cap
  rises in the $2,500 steps the Act specifies, cumulatively from the $25,000 base and never chained
  year-on-year, off the December-quarter wage level the ATO last published. That level is a sourced
  record; every quarter after it is grown from your figure and is stamped **unverified**, so every
  cap computed from it says so on the screen that uses it.
  - ⚠️ **This is the one change in the build that deliberately runs in the FLATTERING direction** —
    larger caps, fewer refusals, more into super at 15%. It was taken as a ruling, not by accident,
    on the ground that the previous behaviour was **not cautious but wrong**: a cap frozen at the
    base amount for forty years is a known-false forecast, and caution is for genuine uncertainty.
  - **Set that figure to nil and the cap simply holds** at the last published level; a contribution
    above even the indexed cap is still **refused by name**, and the refusal says the cap it used
    was a forecast.
- **Division 291 is not modelled.** An excess over the concessional cap has no excess-contributions
  determination, no 15% offset and no release machinery here; it is refused, not priced.
- **The partial financial year still flatters.** An electing Person's first or last part-year never
  reaches a settlement, because the settlement needs all twelve of the year's months — so that
  year's monthly cash accruals stand as the default the Person did not choose. This is register
  **O84 residual (i)**, and it is the one gap in the contribution feature that runs in the
  Household's favour.
- **This is not a claim that the model has no flattering gaps, and must not be read as one.** O84(i)
  is the only one among the contribution rows (O76–O84); elsewhere the engine has others, stated
  with their direction where they live. Two of them: no income other than salary reaches taxable
  income — the Age Pension is assessable and is not in it — which under-states tax; and a month
  whose register parameters do not reach it emits a note saying so, and the income-tax one says in
  terms that the absence is the flattering direction.

**[docs/assumptions-register.md §8](./docs/assumptions-register.md) is the authoritative list of
what is still open and which way each gap runs.** It is not duplicated here: a second copy of that
list is a copy that goes stale, which is the whole reason this section is short.

## Running it

```
npm install     # one dev dependency, typescript
npm start       # compiles, serves http://127.0.0.1:4173, opens the browser
npm test        # node:test
```

`test/golden-demo-couple.test.mjs` is a golden-file regression test on the fixture
`fixtures/demo-couple.plan.json`, pinned against `fixtures/golden/demo-couple.golden.json`. Only
`npm run golden:update` writes that file — the test never does. A moved figure means either a real
regression or a real, named change to the engine's rules; accept a move with a commit message that
names the mechanism and the expected size of the change, never by re-running `golden:update` just
to go green.

The Working File and the Ledger live outside the repo, in `~/.enough` by default. Set
`ENOUGH_DATA_DIR` to put them elsewhere — never inside the project tree.

### Asking Claude about the forecast (the connector)

`server/connector.mjs` is a local MCP server
([ADR-0011](./docs/adr/0011-an-outside-ai-reads-the-engine-through-a-local-connector.md)): it lets
Claude Desktop call `enough`'s own engine on your saved plan. It reads `~/.enough/plan.json` (or
`$ENOUGH_DATA_DIR/plan.json`) afresh on every call and **never writes it**; suggestions come back
as what to type into the entry form. Run `npm run build` first, since it runs the engine out of
`dist/`. Then add it to Claude Desktop's config
(`~/Library/Application Support/Claude/claude_desktop_config.json`) and restart Desktop:

```json
{
  "mcpServers": {
    "enough": {
      "command": "node",
      "args": ["/path/to/enough/server/connector.mjs"]
    }
  }
}
```

Use the absolute path to your own checkout. If Desktop cannot find `node` (an nvm install is not on
its `PATH`), put the output of `which node` in `command`. Your dollar figures go to Anthropic;
names and dates of birth do not.

## Documents

| File | What it is |
|---|---|
| [TODO.md](./TODO.md) | The working task list, phased. Maintained throughout the build — tick, date, and comment as you go |
| [concept.md](./concept.md) | The design. Scope, domain model, the Australian rules to encode, verification plan, build order, v1/v2 delivery scope |
| [CONTEXT.md](./CONTEXT.md) | Glossary. The canonical term for each concept, and the words to avoid |
| [docs/assumptions-register.md](./docs/assumptions-register.md) | Every legislated rate, threshold and formula, with its kind, confidence, source and retrieval date. The authority |
| [docs/adr/](./docs/adr/) | Decision records — the *why* behind choices a future reader would otherwise undo |

## Decisions on record

- [0001](./docs/adr/0001-nominal-dollars-internally.md) — compute in nominal dollars, display in today's dollars
- [0002](./docs/adr/0002-journal-entries-as-overlay.md) — scenarios are a baseline plus an append-only overlay
- [0003](./docs/adr/0003-age-pension-eligibility-is-computed.md) — Age Pension entitlement is computed, never assumed
- [0004](./docs/adr/0004-the-tool-proposes-you-dispose.md) — derived values are suggestions, never silent bindings
- [0005](./docs/adr/0005-home-is-a-status-not-a-value.md) — the home is an exemption status, not an asset value
- [0006](./docs/adr/0006-the-chat-never-computes.md) — the optional AI chat translates and explains; it never computes a number
- [0007](./docs/adr/0007-served-locally-over-http.md) — the app is served over `http://localhost` by a ~40-line Node server
- [0008](./docs/adr/0008-the-plan-is-a-json-file-on-disk.md) — the plan is a JSON file on disk, not a database
- [0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md) — the Non-Super Portfolio is first-class and fundable, and taxing it is in scope
- [0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md) — franking credits are in scope, and modelled on **both** sides of the comparison
- [0011](./docs/adr/0011-an-outside-ai-reads-the-engine-through-a-local-connector.md) — an outside AI reads the engine through a local connector; the in-app chat is held in reserve

## Shape

A browser app, run locally. TypeScript compiled by `tsc` to native ES modules and served as-is;
Chart.js vendored as a committed file at `public/vendor/`, hash-pinned in `PROVENANCE.md` and
loaded by a plain relative `<script>` tag rather than an `import` (its published ESM build imports
a bare specifier no bundler-free browser can resolve — see the file's own header); state in a
single JSON document on disk. No bundler, no framework, no accounts, no cloud. npm total: **one dev
dependency, `typescript`**. Tests run on `node:test`.

It is served over `http://localhost` by a **~40-line Node server** (`node:http` + `node:fs`,
zero runtime dependencies) and started by one script. It is never opened via `file://`: that
gives Chrome an opaque origin, and ES modules will not load across one. The earlier
"double-click `index.html`" shape was a latent defect — it could never have worked alongside the
ES modules this design has always specified.

The server does two things: serve static files, and read and write `plan.json` and `ledger.json`
on disk. It holds no state, contains no application logic, and computes nothing. **An origin
provider is not a data intermediary** — every figure it touches travels between this machine's
disk and this machine's browser and stops there. [ADR-0006](./docs/adr/0006-the-chat-never-computes.md)'s
"no intermediary server" claim is about the network boundary, and survives intact.

An optional AI chat is v3 scope and **defaults off**. It proposes Journal Entries and explains
the engine's output; it never computes a number, and the app is fully functional without it.
Using a hosted model sends real figures off the machine — the "no cloud" half of the shape,
knowingly broken, with a local model and a redacted mode as the alternatives that keep it. The
API key lives in localStorage and never enters the plan file. See
[ADR-0006](./docs/adr/0006-the-chat-never-computes.md).

A spreadsheet was considered and rejected: dated what-if entries cannot be kept as data separate
from the projection in a sheet. The cost of that choice is auditability, which a sheet gives
free — so the expandable month-by-month table was v1 scope, deliberately built *before* the chart,
and both are now in place (Phases 5 and 7).

## Data

**Real financial figures never enter this repo.** The plan file is the source of truth and lives
outside it. `.gitignore` covers `plan.json`, `*.plan.json`, `plans/`, `exports/`,
`*.private.json`; the transaction ledger (`ledger.json`, `*.ledger.json`, `imports/`); and the
formats bank data actually arrives in — `*.csv`, `*.ofx`, `*.qif`, `*.qfx`, `*.xls`, `*.xlsx`.
The `fixtures/` directory is negated back in for when the synthetic demo couple and the golden
files land (TODO.md P2-8) — they are not built yet, and `fixtures/` does not exist today.
`src/app/demoHousehold.ts`'s committed Scenario is a *display* fixture, exercising every
renderable shape in a month row, explicitly not P2-8's verification artefact — see that file's own
header. **It is no longer written to a first-run user's disk (2026-09-20)**: a first run with no
plan file asks for a name and date of birth instead of being handed a stranger's figures; the
fixture still backs the app's own tests. Never exclude a parent of `fixtures/`: a negation cannot
resurrect a file inside an excluded directory, and git will not warn you.

## Before writing code

1. Read [docs/assumptions-register.md](./docs/assumptions-register.md). It is the authority on
   every legislated rate, threshold and formula — kind (config / config (derived) / constant),
   confidence, source and retrieval date per row — and the direct input to P2-5. The engine
   should never need the research reports under `docs/research/`; they are the evidence record.
   Phase 1 closed LITO, SAPTO, the caps, Div 296, the September reindexation and the HEAS
   capacity formula. What remains open is listed in the register, not here: the Medicare levy
   low-income thresholds are carried as a **labelled prior-year fallback** because the FY2026-27
   figures are not yet legislated.
2. Note **Age Pension rates reindexed 20 September 2026**; figures here are the March set plus
   published-ahead September values.
3. Build order is [concept.md §9](./concept.md). Step 1 is the assumptions object; step 2 is the
   Age Pension means test — promoted above the engine because it dominates the answer. Step 4 is
   the Non-Super Portfolio, CGT and franking, added 2026-09-04 and **built empty**: the Household
   holds nothing outside super, the pool is a capability rather than a holding, and both the
   waterfall and the decision it informs need it in place before any money is. Franking is built on
   **both** sides — inside super as well as outside it — or the comparison it exists to correct is
   simply biased the other way (ADR-0010). Retrofitting a step into an
   engine-shaped waterfall after the month table and chart are built means revisiting both.
4. Validate against external references before trusting any comparison: Moneysmart for the
   baseline, your fund's calculator for TTR, Services Australia for one hand-worked Age Pension
   figure. A shared engine bug shifts every scenario equally and looks entirely plausible.
