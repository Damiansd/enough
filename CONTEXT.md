# enough

A personal forecaster for an Australian couple's retirement finances: superannuation,
transition to retirement, Age Pension, mortgage, investments and cashflow. Scenarios are built
by layering dated what-if entries on a baseline and comparing them.

## Language

### People and scope

**Person**:
One member of the couple. Almost every super and tax rule is assessed per Person, never jointly.
_Avoid_: member, individual, spouse (except where quoting a specific ATO rule name)

**Household**:
The couple taken together. Only the Age Pension means test, the mortgage and spending are
assessed at Household level.
_Avoid_: family, couple, us

### Super access

**Preservation Age**:
The age at which superannuation *may* become accessible, subject to a Condition of Release.
60 for everyone now. Reaching it does not by itself release anything.
_Avoid_: access age, unlock age

**Condition of Release**:
The event that actually releases preserved super — ceasing employment after 60, or simply
turning 65. This, not an age or a date, is what gates a lump sum.
_Avoid_: super access date, retirement date, unlocking

**Accumulation Phase**:
A super account that is being built up. Earnings inside it are taxed at 15%.
_Avoid_: growth phase, savings phase

**Retirement Phase**:
A super account paying a retirement income stream, where earnings are untaxed. Entering it
consumes Transfer Balance Cap.
_Avoid_: pension phase, drawdown phase

**TTR**:
A transition-to-retirement income stream: drawing super income while still working, before a
Condition of Release is met. Capped at 10% a year, and its earnings are still taxed at 15%.
_Avoid_: transition pension, part-pension

### The two things called "pension"

**Age Pension**:
The government means-tested payment from age 67. Always write it in full — never bare "pension".
_Avoid_: pension, the pension, government pension, state pension

**Account-Based Pension**:
A super income stream in Retirement Phase. Always write it in full.
_Avoid_: pension, super pension, income stream, ABP (in prose)

### Balances and caps

**Total Super Balance**:
A Person's total super at 30 June, used to test eligibility for contribution rules.
_Avoid_: super balance (when the tested figure is meant), TSB (in prose)

**Transfer Balance Cap**:
The lifetime limit on how much a Person may move into Retirement Phase. Per Person, never
shared, and indexed on *unused* proportion — so the model tracks highest-ever transfer balance,
not the current one.
_Avoid_: pension cap, transfer cap

### Income bases

**Rebate Income**:
The income base SAPTO is tested against: taxable income + reportable superannuation contributions
+ net investment losses + adjusted fringe benefits. Distinct from the **taxable income** LITO
tests against — the two offsets test on different bases, and reusing one figure for both is a live
bug class.
_Avoid_: income (bare), adjusted taxable income, taxable income (where the SAPTO base is meant)

### Franked income

**Dividend Imputation**:
The Australian system under which company tax already paid on a profit is passed to the holder of
the share with the distribution, so the profit is taxed once at the holder's rate rather than
twice. In scope from 2026-09-04 (ADR-0010), on **both** sides of every super-versus-non-super
comparison.
_Avoid_: franking system, imputation system, the franking rules

**Franking Credit**:
The company tax attached to a franked distribution and passed to the holder. In Australia it is
**refundable** — a holder whose tax on the grossed-up amount is less than the credit receives the
difference in cash rather than wasting it, which is what makes it worth modelling for a retiree and
for a fund in Retirement Phase. It is never cash in the month of the distribution; it is an annual
tax outcome.
_Avoid_: imputation credit, dividend credit, tax credit

**Gross-Up**:
Adding the Franking Credit to the cash received to give the assessable amount. The order is
load-bearing: gross up, tax the larger figure, *then* apply the offset. Taxing the cash and
offsetting the credit is a different, wrong calculation. The grossed-up amount raises taxable
income, and with it Rebate Income and the Medicare levy base, even where the offset leaves no tax
to pay.
_Avoid_: grossing up, pre-tax dividend, cash plus credit

**Franking Offset**:
The Franking Credit claimed against tax payable. A **refundable** offset, not a deduction and not
capped at the liability — which is the distinction a non-Australian reading of the same word gets
wrong.
_Avoid_: franking rebate, dividend offset, deduction, credit (bare, where the offset step is meant)

**Franking Percentage**:
The share of a distribution that carries credits. A property of what a fund or ETF holds, varying
year to year — so it is a **Setting** the user supplies, never an assumption and never a constant
in the engine. Distinct from the gross-up rate, which is legislated.
_Avoid_: franking rate, franking level, franking ratio

**45-Day Holding Rule**:
The qualification requirement a holder must meet before claiming a Franking Credit. Modelled as a
**stated assumption rather than machinery**: buy-and-hold positions satisfy it, so the engine
assumes qualification, says so on screen, and flags a disposal landing inside the window instead of
silently crediting it.
_Avoid_: 45-day rule (bare), qualification rule, holding rule

### Modelling

**Baseline**:
The projection produced by base parameters alone, with no entries applied. Never mutated.
_Avoid_: base case, default scenario, status quo

**Scenario**:
A named projection: a Baseline plus an ordered list of Journal Entries. Scenarios inherit from
other Scenarios rather than duplicating their entries.
_Avoid_: plan, case, model, projection (a Scenario *produces* a projection)

**Journal Entry**:
A single dated what-if change belonging to a Scenario — retiring, contributing, refinancing,
discharging the mortgage. Entries are never edited or deleted, only disabled.
_Avoid_: event, transaction, change, what-if

**Setting**:
A base input that has no date and holds for the whole projection: return rates, CPI, wage
growth, Planning Horizon.
_Avoid_: parameter, assumption (an *assumption* is specifically a legislated rate or threshold)

**Planning Horizon**:
The age each Person is projected to. Set to 100 for both — deliberately beyond life
expectancy, because outliving the money is the expensive error and underliving it is not.
_Avoid_: life expectancy, end age, death age

**Non-Super Portfolio**:
Investments held outside superannuation — taxable ETFs and cash. First-class in the model,
drawable, and **currently empty**: the Household owns no investments outside super — the Offset
Account is its only non-super money — and the pool is carried anyway because ETFs are a vehicle
under consideration. **Assessable and deemed from the
first dollar** in both Age Pension tests, with none of the shelter super gets. Its purpose in this
model is the Liquidity Bridge.
_Avoid_: savings, investments (bare), outside super, bridge assets (the Bridge is the strategy,
not the pool)

**Liquidity Bridge**:
The years between reducing or stopping work and the Condition of Release at 60, funded from the
Non-Super Portfolio and the Offset Account because super cannot be reached. A *strategy spanning
dates*, not a balance — "how long does the bridge reach" is the question it answers, and on today's
holdings the answer is *nowhere*, because nothing has been put there yet.
_Avoid_: bridge account, cash buffer, early retirement fund, war chest

**Cost Base**:
What a parcel of a non-super investment cost, with its acquisition date, tracked **per parcel**.
Never averaged across an account: the 12-month discount and parcel selection both turn on which
parcel is sold, and an average expresses neither.
_Avoid_: purchase price, book value, average cost

**Glide Path**:
The return assumption expressed as age bands — High Growth, Balanced, Conservative — per Person
and per account. A Dated Parameter, so the bands resolve into synthetic `RETURN_CHANGE` entries
before projection. **Deterministic**: it is not a distribution and not a Monte Carlo concession.
_Avoid_: de-risking, lifecycle option, asset allocation, risk profile

**Dated Parameter**:
A base input that is really an event in time — retirement age, TTR start. Expressed as a
Setting for convenience, but resolved into a synthetic Journal Entry before projection, so
there is only ever one mechanism.
_Avoid_: base parameter, default event

**Owner-Occupied Mortgage**:
The loan against the home the Household lives in. Its interest is not deductible, so an extra
repayment returns the full nominal rate untaxed, and the home itself is exempt from the Age
Pension assets test.
_Avoid_: home loan, the mortgage (when investment property might be meant)

**Offset Account**:
Cash held against the Owner-Occupied Mortgage, reducing interest without repaying principal. It
is doing three jobs at once — the Household's liquid buffer, a mortgage reduction, and part of
the Liquidity Bridge — which is why it is drawn ~~**last**~~ **after every other pool a Household can
reach before a Condition of Release** in the Income Waterfall: a dollar there
earns the mortgage rate risk-free and untaxed, making it the most expensive dollar to spend.
~~Last~~ was true of the Waterfall until 2026-09-19, when released
superannuation was added behind it ~~as limb five~~ (see **Income Waterfall** below for the
current count and order — it has grown again since). The reasoning above is unchanged: the only
pool now drawn after the Offset is one the Household cannot reach at all until a Condition of
Release.
_Avoid_: savings account, emergency fund, redraw (redraw is a different thing)

**Home Status**:
The time-varying exemption state of the home — occupied, vacated with a Protected Person,
vacated with nobody remaining, or sold. Derived each month from Journal Entries, never stored as
a fixed value. Its exemption status matters more than its market value.
_Avoid_: home value, property, house (as an asset line)

**Protected Assets**:
Wealth excluded from the Age Pension assets test — principally the home while its Home Status
exempts it. Reported separately from Assessable Assets every month.
_Avoid_: exempt assets, hidden assets

**Assessable Assets**:
Wealth counted by the Age Pension assets test. The only figure the entitlement calculation
consumes.
_Avoid_: countable assets, net worth

**Income Waterfall**:
The fixed order in which sources are drawn to meet the spending target: salary, then
Account-Based Pension — whose Schedule 7 minimum is a **floor and never a ceiling** — then
Non-Super Portfolio, then Offset Account, ~~with Age Pension applied wherever it is assessed~~ **then
released superannuation — added 2026-09-19, ~~a fifth limb~~, drawn LAST, after the Offset, by a
disclosed and deliberately conservative decision (`WATERFALL_LIMBS` carries the reasoning: the
correct position flips at each owner's Age Pension age and one slot in a static array cannot express
that). `WATERFALL_LIMBS` now lists seven limbs, and released superannuation is the last of them —
the count grew again on 2026-09-23, when idle cash and the Account-Based Pension were each split
into two limbs** — with Age Pension applied wherever it is assessed. Super
is drawn above the minimum only when the target demands it, and the minimum is PAID even when the
target does not demand it (ruled 2026-09-17; `9a767fa`). The shorthand "to its minimum" used to
stand here and was misread by the implementation as a cap — it is not one. Before a Condition of Release the first two are unavailable or capped, so the
Liquidity Bridge carries the whole target.
_Avoid_: drawdown strategy, withdrawal order

**Pensioner Concession Card**:
The concession entitlement that comes with *any* Age Pension entitlement, however small. The
reason retaining minimal eligibility is a goal rather than a rounding error.
_Avoid_: concession card, healthcare card (a different card)

### Home Equity Access Scheme

**Maximum Payment Rate**:
The maximum basic rate + Pension Supplement + Energy Supplement (plus Rent Assistance, nil for a
homeowner Household). It is the base for both HEAS multiples: the 150% fortnightly income-stream
cap and the 50% annual lump-sum advance cap. The fortnightly cap is net of Age Pension actually
received — the loan is only the difference.
_Avoid_: maximum rate, full pension, MPR (in prose)

**Maximum Loan Available**:
The HEAS capacity ceiling: Age Component × floor(security value ÷ $10,000), computed per Person on
that Person's share. Reaching it stops payments and is an **automatic exit** from the scheme, not
a default or a breach — the balance keeps compounding afterwards.
_Avoid_: credit limit, loan cap, borrowing limit, MLA (in prose)

**Security Value**:
The property value HEAS capacity is computed against — the home's market value less the
Owner-Occupied Mortgage and any amount not nominated as security, rounded **down** to $10,000 per
Person on that Person's share. It is typed by the user into the `HEAS_DRAW` Journal Entry that
needs it and lives in that entry's `params`, never in `Person`, `Household` or Settings. Read by
HEAS capacity alone; the Age Pension means test has no path to it (ADR-0005). It carries no source
and no confidence, so everything computed from it is an estimate and is shown as one.
_Avoid_: home value, house price, property value, market value (bare), the home Setting

**Age Component**:
The frozen age→dollars lookup from legislative instrument F2019L00420 s 4(2): dollars of loan
capacity per $10,000 of security value, keyed to age at last birthday. For a couple it is keyed to
the **younger** Person's age and recalculated on that birthday. Unchanged since 2019 with no
indexation mechanism, so it is a constant, not config.
_Avoid_: age factor, age multiplier, loan-to-value ratio

### Spending history

**Transaction**:
One observed historical spend record, imported from CSV or entered by hand. Belongs to the past
and is never forecast. Append-only.
_Avoid_: expense, payment, line item

**Category**:
The classification of a Transaction. The top level is fixed — **Committed**, **Discretionary**,
**One-off**, **Other** — because the Derived Baseline depends on it. Subcategories beneath are
user-defined.
_Avoid_: tag, type, bucket

**Categorisation**:
The record that gives one Transaction a Category (and optionally a subcategory). Appended to the
Ledger, never edited: a Transaction's Category is the last Categorisation naming it, so
reclassifying adds a record and the history of how it came to be classified is kept. One made by
accepting a rule's suggestion names that rule; one that names none was chosen by hand.
_Avoid_: tagging, label, classification record

**Categorisation Rule**:
A piece of a Transaction's raw description (case ignored), optionally held to one account, and the
Category it suggests. It only suggests: what it matches is offered as one batch to accept or reject
whole, and a Transaction categorised by hand is never in one. Saved in the Ledger and appended,
never edited; the last one saved for the same words and account is the rule, and retiring it is a
record too.
_Avoid_: auto-categorisation, filter, tag rule

**Import Mapping**:
The record of which column of one bank's CSV format holds the date, description and amount (or
debit and credit), how its dates are written, and which account the rows belong to. Saved in the
Ledger and appended, never edited; found again by the file's column names in any order, or, for a
file with no header row, by its column count and a name the user gave the format.
_Avoid_: import profile, bank template, column config

**Committed**:
Spending that continues regardless of choice: mortgage, insurance, utilities, rates.
_Avoid_: fixed, essential, needs

**Discretionary**:
Spending that can flex: travel, dining, hobbies. The only category that spending presets act on,
because it is the only one that genuinely phases down with age.
_Avoid_: variable, non-essential, wants

**One-off**:
A lumpy irregular item — a car, a roof. Excluded from the Derived Baseline and its 12-month total
shown beside it, so a single new roof does not make the forecast permanently pessimistic. Nothing
is amortised automatically: a one-off expected again is added as a one-off expense entry.
_Avoid_: irregular, unexpected, capital

**Other**:
Money that moves but is not spending: transfers between the Household's own accounts, card
repayments, mortgage payments, income and investment purchases. Left out of the Derived Baseline,
and its total shown beside it so a real purchase filed here can be caught.
_Avoid_: excluded, transfer (for the category), ignore

**Derived Baseline**:
The yearly household spending worked out, only when asked, from the 12 whole calendar months of
Transactions before the plan's as-at date: Committed, Discretionary and uncategorised money out,
net of refunds, each month raised to today's dollars. Offered as a suggestion; accepting it adds
one Journal Entry setting the spending level from the as-at date, and it is never silently bound.
_Avoid_: actual spend, average spend, calculated spend

### Storage

**Plan File**:
The versioned JSON document holding Settings, Journal Entries, Scenarios and the chat turns behind
accepted entries (ADR-0006). It is a *shape*, not a location: a Working File and an Export are
both Plan Files. Lives on disk outside the repo, readable and diffable without the app.
_Avoid_: the database, the store, save file, plan data

**Working File**:
The one `plan.json` currently open — the live instance on disk that every change is written
through to. The Plan File is the format; the Working File is the file. An Export is a Plan File
and is never the Working File.
_Avoid_: the current plan, the file (bare), workspace, session, working copy

**Save**:
The continuous, silent write-through of every change to the Working File, atomically. It is a
consequence of editing, never a user decision: there is no save button and no unsaved state.
**Save is not Export** — Save keeps the one live file current and produces nothing to hand over.
_Avoid_: autosave, persist, write out, commit, export (for this act)

**Export**:
The deliberate production of a dated, self-contained snapshot for archiving or handing to another
person. Same shape and same field allow-list as the Working File, which is what lets one assertion
cover both. **Export is not Save** — an Export is an artefact the app never reads back into itself,
and it leaves the Working File untouched. Import accepts either.
_Avoid_: backup, dump, download, save a copy, save as, share, save (for this act)

**Ledger**:
`ledger.json`, the append-only store of Transactions. A separate file from the Plan File and a
separate sensitivity: it records everything the Household bought, and it is never bundled into a
Plan File or an Export.
_Avoid_: the database, transaction file, spending history file, plan file (for this file)

### Aged care (phase 2)

**Aged Care Means Assessment**:
The means test for aged care fees. Separate from, and different to, the Age Pension means test —
most importantly it caps the former home's value where the Age Pension test does not. Never
conflate the two.
_Avoid_: means test (bare), aged care assets test

**Protected Person**:
A spouse, dependent child, or long-resident carer still living in the home. Their presence makes
the home **100% exempt** from both the Aged Care Means Assessment and the Age Pension assets
test, indefinitely.
_Avoid_: remaining spouse, occupant

**RAD**:
Refundable Accommodation Deposit — a lump sum lent to an aged care provider for a room, refunded
on departure. Exempt for the Age Pension assets test but **fully assessable** for the Aged Care
Means Assessment. That asymmetry is the central trade-off in funding care.
_Avoid_: bond, accommodation payment, deposit

**DAP**:
Daily Accommodation Payment — the daily-rate alternative to a RAD, calculated as RAD × MPIR ÷ 365.
_Avoid_: daily fee, rent

**MPIR**:
Maximum Permissible Interest Rate — the government-set rate converting a RAD into a DAP, locked
at the rate on the day of entry.
_Avoid_: interest rate, aged care rate

### Outcomes

**Shortfall Age**:
The age at which the Income Waterfall can no longer meet the spending target. The tool's
headline number.
_Avoid_: running out, depletion age, broke

**Pension-Only Age**:
The age at which all assets are exhausted and the Household lives on Age Pension alone. A
second marker, not the headline — in Australia the money never reaches zero income.
_Avoid_: ruin, bankruptcy, zero

## Testing and tooling traps

Not domain terms — recorded here anyway because they are as durable as the glossary above, and
cost real time each time they are relearned.

**Vacuous constant-vs-constant assertion**:
A test of the shape `deepEqual([...SERIES.notes], [THE_CONSTANT])` compares a constant with
itself: emptying `THE_CONSTANT` still passes. Several of these existed and would have gone green
with the on-screen text they were meant to protect deleted. Pair every text pin with a length
floor AND a distinctness/negation assertion, and prove a new pin fails on empty text before
trusting it.
_Avoid_: asserting a value against the same constant it was built from.

**Jargon-enforcing pin**:
A phrase-pin on the exact wording (e.g. asserting the literal string `RE-PARTITIONS the journal`)
makes that phrase permanent — the test becomes the reason the sentence can't be put in plain
English. Working order to undo it: find the PROPERTY the pin actually defends (subjects covered,
reachable from its control, a length floor — never `length > 0`) → replace with a property pin →
prove the new pin fails when the text is emptied → only then reword the prose. Reversing that
order (reword first) produces a test that passes because it stopped checking anything.

**`grep` reads `src/core/projection.ts` as binary**:
A plain `grep` against that file returns nothing and looks exactly like "confirmed absent" —
almost produced a false confirmation once. Use `grep -a` whenever an absence in that file is
load-bearing to an argument.

**Tests import from `dist/`, not `src/`**:
`npm test` builds first; a bare `node --test` reads stale `dist/` output after a source edit with
no rebuild. Cost a false failure once. Run the build (or `npm test`, which does it for you) before
trusting a red or green result.

**Port 4173 clash**:
The dev server holds port 4173, so `origin-provider.test.mjs` fails six tests with `EADDRINUSE`
while it is up. Stop the dev server before a clean full-suite run.
