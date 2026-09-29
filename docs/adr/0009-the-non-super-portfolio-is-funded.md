# The Non-Super Portfolio is first-class and fundable, and taxing it is in scope

Assets held outside superannuation — taxable ETFs, cash in the Offset Account, anything else
the Household owns that is not the home and not a super interest — are modelled as a real,
fundable, drawable pool. The **Liquidity Bridge** they make possible is a first-class scenario:
work stops or reduces before Preservation Age, and non-super assets carry the Household to 60.

**This is a capability requirement, not a description of the balance sheet.** The Household holds
no investments outside super today — the Offset Account is the only non-super money it has — and
that is expected to stay true until a deliberate decision changes it. The pool is therefore built
**first-class and defaulting to empty**: every structure it needs — its place in the Income
Waterfall, its means-test treatment, per-parcel cost base — exists from the start, and a Household
that never funds it projects exactly as it did before. What is decided
here is that ETFs are a vehicle worth pursuing, so the model must be able to hold them the day the
user buys one, rather than have the pool retrofitted around a working engine.

**Capital gains tax comes with them.** It is un-parked by this decision, not left implicit.

*The file name keeps the `…is-funded` slug: an ADR path is an identifier and is cited from
`concept.md`, the README, TODO and ADR-0006. The heading states the decision; the slug does not.*

## Why

Every earlier document in this project rests on one framing fact, stated in `concept.md` §1 and
repeated in the README and in the build order's rationale: **there is nothing outside super.**
From it followed three conclusions that shaped the whole design.

| Framing fact | What it produced |
|---|---|
| No assets outside super | Age Pension accuracy dominates the answer; the means test was promoted above the engine in the build order |
| No bridge asset | "Retiring before a Condition of Release is essentially unfundable" |
| Nothing outside super to tax | CGT and franking credits parked, with that as the entire stated reason |

The mistake was not the fact — it is still true of today's balance sheet — but the tense. Each of
these read as though *nothing outside super* were permanent, and it is a holding, not a law.

The first conclusion is unaffected either way: it was always an argument about *proportion*, and
the Age Pension still dominates for a Household whose non-super holdings would be a bridge rather
than a fortune. The second and third do not survive: both are false the moment the Household buys
its first ETF, and neither is the kind of thing that can be retrofitted quietly.

The user has accepted a mid-horizon extension of scope: a Household in its late forties or early
fifties, fifteen to twenty years out, does not necessarily plan to work until the day super
unlocks. The question it actually asks is *"can I stop at 55?"*, and that question has no answer
in a model where the only pool is inaccessible until 60. Refusing to model a bridge does not make
the bridge unnecessary; it makes the tool unable to price the years it spans.

**And the tool has to be able to price it before the money moves, not after.** The decision to buy
an ETF instead of salary sacrificing is exactly the decision this tool exists to inform — so a
model that only supports non-super assets once they exist can never be consulted about acquiring
them. That is the argument for building the capability into an empty pool.

So the Non-Super Portfolio stops being a zero with a place to sit and becomes a zero with a place
to sit **and a full set of rules attached**. `concept.md` already called it "modelled as a
first-class account so scenarios can populate it" — this decision is the day a scenario is allowed
to populate it, and the day the consequences of that get paid for in advance.

## The consequence nobody gets to skip: CGT

A taxable ETF sold to fund a year of living costs realises a capital gain. Modelling the draw and
not the tax overstates spendable money by the tax, every year of the bridge, in exactly the years
the bridge is the whole answer. That is the same failure this project is organised against — a
fluent, plausible, wrong number — and it is worse here than usual, because the error is largest
in the scenario the user built the feature to run.

**CGT is therefore in scope, and it is un-parked explicitly rather than by implication.** The
Parked list's entry for it read "nothing outside super to tax", and that reasoning is dead. A
substantial rules area does not get to re-enter scope silently on the back of a sentence in a
different section; it gets a dated note, a line in §10, and its own tasks. Those are `concept.md`
§5.12 and TODO **P3-21**.

Franking credits stay parked, but the old reason is gone and a new one is stated in its place:
distributions are modelled as cash received, without imputation. The cost is that after-tax return
on an Australian equity ETF is understated by the credit — real money, and it is understated in
the conservative direction. Reinstating it means the gross-up, the offset and refundability, which
is a second rules area for a second-order figure. If the Non-Super Portfolio ever becomes the
Household's main holding rather than a bridge, that argument is worth reopening.

**Amended 2026-09-04** ([ADR-0010](./0010-franking-credits-are-in-scope-on-both-sides.md)): **the
paragraph above is overturned the same day it was written, and franking credits are in v1 scope.**
Two things in it are wrong. "Second-order" understates the size — the bias is of the order of
1.0–1.5% a year on Australian equity and is systematic in one direction, so it does not wash out
over the horizon; and "conservative" is the wrong test, because the figure it understates is the
non-super side of the sacrifice-versus-invest comparison this ADR exists to enable. Erring
conservative is sound for a figure nobody is deciding on and wrong for the one being decided.

⚠️ And the correction is **not** confined to the pool this ADR is about. Franking attaches to
Australian equity income inside superannuation too, where a fund in Retirement Phase pays 0% and
has the credits refunded in cash, and a fund in Accumulation Phase offsets 15%. Modelling only the
non-super side would over-correct and bias the same comparison the other way. That requirement
belongs to super rather than to the Non-Super Portfolio, which is why the reversal is its own ADR
rather than a longer amendment here. See `concept.md` §5.14 and TODO P3-22, P3-7a/b, P6-8d.

## The question this unlocks: sacrifice into super, or invest outside it

If ETFs are a vehicle worth pursuing, the tool has to answer *why* — and against what. The
comparison is **salary sacrifice into super versus invest the same dollar outside it**, and it now
sits alongside "discharge the mortgage from super" as a central question rather than a scenario
somebody might run. Three forces pull against each other and no two of them point the same way:

| | Super | Non-Super Portfolio |
|---|---|---|
| On the way in | 15% contributions tax, against a marginal rate up to 47% | Paid from after-tax income at the full marginal rate |
| While held | 15% on earnings; nil in Retirement Phase | Earnings taxed at the Person's marginal rate every year |
| On the way out | Tax-free from 60 from a taxed source | CGT on the gain, halved after 12 months |
| Access | Locked to a Condition of Release | Available on any day |
| Age Pension | Exempt in a younger Person's accumulation account | Assessable and deemed from the first dollar |

The first three rows favour super in most cases and the last two are what is being bought with the
difference. Naming the trade is not the same as pricing it, which is the whole reason it belongs in
the engine rather than in a paragraph.

### The trap: the answer flips on the younger partner's age

The last row is the one a spreadsheet gets wrong, and it is **already implemented and tested** —
`splitAssets` in `src/core/household.ts`, consumed by `agePensionEntitlement` in
`src/core/agePension.ts`:

- A Person's `financialAssets` are classified `assessable` **and** `deemed` unconditionally. There
  is no age gate and no phase gate on that branch; the dollar is counted the day it is bought.
- Superannuation in **Accumulation Phase** held by a Person under Age Pension age (67) is
  classified `protected` and not deemed, so it lands in neither `assessableAssets` nor
  `deemedFinancialAssets` — the only two figures the entitlement calculation consumes. It is
  invisible to **both** tests, not merely discounted in one.

While the younger partner is under 67, therefore, a dollar in their accumulation account is
means-test-free and the same dollar in an ETF is deemed and assessed. At the couple assets taper of
$3.00 per fortnight per $1,000, $50,000 held outside super costs $150 a fortnight — about $3,900 a
year — where $50,000 in that partner's accumulation account costs nothing at all. On the day they
turn 67 the shelter ends in one step (P3-13 measures that cliff at $1,203.00 a fortnight on the
synthetic fixture), and it ends early and permanently if that Person starts **any** income stream,
including a TTR (T27).

**So the sacrifice-versus-ETF answer flips with the younger partner's age**, and it flips on a
known date. The tool must show the flip rather than leave the user to find it: a comparison that
reports only the tax difference is a confidently wrong answer during precisely the years the
exemption is running. That is TODO **P6-8**, and the exemption itself is P3-13, not restated here.

## Consequences

- **The pool defaults to empty, and empty is a supported state, not a special case.** A Household
  holding no investments outside super must project identically to one modelled before this
  decision: no waterfall step that fires on zero, no asset line in the means-test split, no CGT
  event. The seam
  already exists — `Person.financialAssets` is a field with a zero in it, and `splitAssets` emits
  no line when it is zero — and the rest is built to the same standard.
- **The synthetic demo couple keeps zero non-super assets** (P2-8, P13-4). The fixture is the
  golden-file baseline and the Moneysmart comparison subject, and it should stay representative of
  the Household it stands for. Populating it because the capability now exists would quietly change
  what every regression test is measuring. The bridge and the CGT disposal get their own fixtures.
- **The Non-Super Portfolio is drawable, and it enters the Income Waterfall.** Before Preservation
  Age it is the only lever besides salary and a TTR. The waterfall order is decided in
  `concept.md` §5.12, not here.
- **It is assessable and deemed.** Unlike the home and unlike a younger Person's accumulation
  interest, money outside super is counted by both Age Pension tests from the first dollar. A
  bridge built too large is an Age Pension problem later, and the tool must be able to show that
  trade rather than assert it.
- **Cost base is tracked per parcel, not per account.** A single average cost base cannot express
  the 12-month discount rule or parcel selection, and both change the tax on a partial sale
  materially. This is the one place where "just track the balance" produces a wrong answer that
  looks right.
- **v1 grows, and that is the price.** The bridge and its tax are not deferrable to v2: a
  liquidity bridge without its tax is the misleading half. Aged care stays in v2 for its own
  reasons. Nothing here reopens the Monte Carlo decision (see below).
- **The Offset Account is now doing three jobs**, not two: liquid buffer, mortgage reduction, and
  bridge funding. Its treatment does not change — offset cash is assessable and deemed exactly as
  it always was — but the reason to hold it is no longer purely defensive.
- **This does not reopen sequencing risk.** A phased return glide path (§5.13) is a *deterministic*
  assumption that changes by age band. It answers a different question to Monte Carlo, produces a
  single reproducible projection rather than a distribution, and costs nothing in verifiability.
  The Parked entry for Monte Carlo and sequencing risk stands on its original reasoning:
  deterministic answers the questions actually being asked, and a distribution invites reading a
  confidence interval that the input assumptions do not support.
- **The refusal behaviour is untouched.** `UnvaluedAssessableHomeError` and the ADR-0005 ruling
  are unaffected — the home's market value is still read by HEAS capacity alone. Assets outside
  super are a different pool with a different treatment, and nothing here gives the means test a
  path to a house price.
- **ADR-0001 gains an exception.** Its consequence that "a retiree drawing only super income is
  nearly bracket-insensitive" holds only while the Household holds only super. Distributions and a
  discounted capital gain are ordinary taxable income, so a retiree drawing a non-super portfolio is
  bracket-sensitive again — against brackets that have never been indexed, on a cost base that is
  not indexed either, which means the engine's nominal gains include inflation and tax it. Noted
  there rather than reasoned about twice.
- Anyone reading `concept.md` §1's "there is no bridge asset" in an old revision, or the README's
  "with no assets outside super", should read this first. Those sentences were true when written
  and are the reason several decisions look the way they do. They describe a holding, though, not a
  constraint — which is the correction this ADR is careful to make.
