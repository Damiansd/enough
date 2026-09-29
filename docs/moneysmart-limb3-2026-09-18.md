# Moneysmart Retirement Planner — P4-7 run 2, the limb-3 scenario, 2026-09-18

The second manual run against ASIC's Moneysmart Retirement Planner, and the first one that has a
**non-super portfolio** to draw. `docs/moneysmart-baseline-2026-09-17.md` is run 1 and is the
methodology precedent for everything here; read it first. The PDF this accompanies is
`docs/ASIC Retirement Planner v2.pdf` (15 pages, summary and assumptions only). The year-by-year
series below was read off the on-screen results table by hand and **must not be silently regenerated
or "corrected"**; it is carried verbatim in `scripts/moneysmart-limb3.mjs` as `MONEYSMART`.

Calculator, engine and July-2026 law stamp: unchanged from run 1.

---

## ⚠️ Read this before you read a number off that tool again

**Run 1's results table was ANNUAL. This run's results table is MONTHLY.** Nothing in the tool, the
export or the PDF says so. Two runs of the same calculator, a day apart, exported the same series in
different units. A figure pasted out of this tool means nothing until its unit is established, and
the only reliable way to establish it is to cross-check against a KPI on page 1.

The cross-checks that establish it here, all three independent:

1. **The target.** Page 2 states the goal as **$101,612 per year**. Page 1's KPI tile states
   "Retirement income target **$8,468**". $101,612 / 12 = $8,467.67, which rounds to $8,468. The
   page-1 tile is therefore monthly, and page 1's other tiles are in the same unit as each other.
2. **The shortfall closes exactly.** Page 1: average estimated income **$7,144**, average amount
   less than target **$1,324**. $7,144 + $1,324 = $8,468 exactly. Annualised,
   $101,612 − $85,728 = $15,884, and $15,884 / 12 = $1,323.67 → $1,324.
3. **The Age-Pension-only tail matches run 1 to within a rounding cent.** From age 87 — where this
   run's assets test stops binding — this table x 12 reproduces run 1's ANNUAL Age Pension series
   and run 1's back-solved rate formula to **±$6 in every year to 100**, which is exactly the error
   a $1 rounding on a monthly figure produces. Ages 87..100, this run x 12 less run 1:
   +1, −5, −4, +4, −6, +3, −6, +3, −5, +5, −4, +6, −2, −14.

**The solved level income is therefore $85,728 a year in today's dollars** ($7,144 x 12), and it is
**not** the $101,612 on page 2 — that is the aspirational goal the solve fell short of.

Row totals across ages 67-91 are $7,143, $7,144 or $7,145, mean $7,144.2. That is monthly rounding
on a flat solve and is treated exactly as run 1 treated its own $64,370/$64,371 wobble: **named as
rounding, not chased.** The single figure used throughout is $7,144 x 12 = **$85,728**.

---

## Inputs (as confirmed on PDF pages 2-5)

| Field | Value |
| --- | --- |
| Status | Single, no spouse, homeowner, Age Pension included |
| Current age / retirement age / run-out age ("Age for super to last") | 66 / 67 / 92 |
| Salary | $0 |
| Super balance | $600,000 |
| Shares or managed funds (today's value) | **$500,000** |
| Cash in savings / investment property | $0 / $0 |
| Investment choice before / after retirement | Balanced / Conservative |
| Employer, salary-sacrifice, after-tax contributions | $0 |
| Personal assets | $0 |
| Insurance premiums, adviser fees, one-off advice | $0 |
| Admin fees $ p.a., both accounts | $0 |
| Admin fee % of balance, both accounts | **0%** |
| Admin fee cap p.a. | $0 super, **$900 pension** |
| Inflation / wage inflation | 2.5% / 3.7% |
| Deflator before / after retirement | 3.7% / 2.5% |
| Regular income in retirement (goal) | $101,612 per year |

Two notes on the fee rows, because both are traps.

- **The 0% admin fee is new.** Run 1 recorded the % of balance as "NOT zeroable" — 0.11% super /
  0.14% pension. This run got it to 0% on both accounts. Whatever run 1 hit, it was not a hard floor.
- **The $900 pension fee cap is inert, not an applied fee.** A cap on a fee of $0 p.a. and 0% of
  balance charges nothing. Separately, page 5 of the PDF carries the tool's *generic* default
  disclosure ($59/0.11%/$710 super, $69/0.14%/$900 pension). **That page is boilerplate and is not
  this run's applied values** — the same text appears in run 1's PDF. Read fees off the
  "Administration fees" input page (page 4), never off the disclosure page.

### The two investment returns, which is the biggest single difference from run 1

| Pool | Moneysmart rate | `enough` rate |
| --- | --- | --- |
| Pension account, Conservative | **5.6%** p.a. | `nominalReturn`, 5.6% |
| Shares / managed funds | **7.0%** p.a. | `nominalReturn`, 5.6% |

`enough` has one `nominalReturn` for every asset. Moneysmart has two, and the outside-super pool is
the fast one. This is the residual that dominates the comparison; see below.

## Headline outputs (today's dollars)

| Figure | Value | Note |
| --- | --- | --- |
| Estimated balance at retirement (age 67) | $1,123,552 | super + shares |
| Retirement income target | $8,468 / month = $101,612 / year | |
| Average estimated income | $7,144 / month = **$85,728 / year** | the level solve |
| Average amount less than target | $1,324 / month = $15,884 / year | |
| Depletion | age **92** | pension 3,481, super 10, investment 67 |

---

## How their solve becomes an `enough` input

Same rule as run 1: **`enough` has no level-income solver** — the Waterfall draws to a stated need —
so their solved level income is an input to us and never something to reproduce.

> ⚠️ **SUPERSEDED IN PART, 2026-09-21 (register O85).** The paragraph below is true of the engine as
> it stood on 2026-09-18 and is kept because it is the reasoning this run was made under. It is no
> longer true that *"the engine never indexes it"*: the user ruled `SpendChangeParams.annualSpend` a
> REAL figure, and `project()` now raises the stated level to each month's price level. **So
> `--spend-basis real` double-indexes as at that date** and the script carries the warning; the next
> run of this comparison must decide whether to keep the 1.037 kink in the deflator chain, which the
> engine's own factor does not have. Every figure in this document was produced before that ruling.

**But run 1's closing instruction does not carry over, and following it literally would wreck this
comparison.** Run 1 said "Set `SPEND_CHANGE` to $64,370" as a single entry. `SpendChangeParams.annualSpend`
is a **level in NOMINAL cents** (`plan.ts`: "a level, not a delta") and `projection.ts` holds it
standing until the next `SPEND_CHANGE` — the engine never indexes it. Moneysmart's target is the
opposite: PDF page 8, *"Your retirement spending goals including both regular income needs and
lifestyle goals are inflated over time in the projection in line with the today's dollar adjustment
/ deflator assumptions."* Their $85,728 is **flat in today's dollars** and rises at 2.5% nominal.

So matching a flat REAL target requires **one `SPEND_CHANGE` per 1 July**, set to
`85728 x deflatorA(age)` where `deflatorA(age) = 1.037 x 1.025^(age-67)` is run 1's deflator chain
unchanged. That is `--spend-basis real`, which is now the script's default. It is self-checking: the
today's-dollars `spend` column comes out at exactly $85,728 in every funded year, which it could not
do if the indexation and the deflator disagreed by a cent.

Run 1's single-entry instruction was written for a run whose income target was $0, where nothing
turned on it. Against a level real target it under-spends by the whole compounded deflator.

---

## Year-by-year, today's dollars

`enough` on the left, Moneysmart on the right. The command is

    npm run build && node scripts/moneysmart-limb3.mjs --pension-basis wage

`--pension-basis wage` is the deliberate match run 1 demanded: their Age Pension rate indexes at wage
growth and is deflated at CPI, so it rises ~1.17% a year in real terms, and a CPI-indexed rate
diverges a little more every year. The CPI variant is shown after.

| Age | ABP draw | portfolio | CGT | Age Pension | **total** | MS pension | MS super | MS inv | **MS total** | diff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 67 | 85,728 | 0 | 0 | 0 | **85,728** | 0 | 59,784 | 25,944 | **85,728** | 0 |
| 68 | 85,728 | 0 | 0 | 0 | **85,728** | 0 | 57,912 | 27,828 | **85,740** | −12 |
| 69 | 85,728 | 0 | 0 | 0 | **85,728** | 0 | 55,980 | 29,748 | **85,728** | 0 |
| 70 | 85,728 | 0 | 0 | 0 | **85,728** | 0 | 54,012 | 31,728 | **85,740** | −12 |
| 71 | 85,728 | 0 | 0 | 0 | **85,728** | 0 | 51,996 | 33,732 | **85,728** | 0 |
| 72 | 85,700 | 0 | 0 | 28 | **85,728** | 0 | 49,944 | 35,784 | **85,728** | 0 |
| 73 | 82,351 | 0 | 0 | 3,378 | **85,728** | 0 | 47,868 | 37,860 | **85,728** | 0 |
| 74 | 60,793 | 16,536 | 0 | 8,400 | **85,728** | 0 | 45,768 | 39,960 | **85,728** | 0 |
| 75 | 0 | 72,551 | 0 | 13,177 | **85,728** | 4,128 | 43,608 | 37,980 | **85,716** | +12 |
| 76 | 0 | 68,006 | 0 | 17,722 | **85,728** | 8,796 | 39,432 | 37,512 | **85,740** | −12 |
| 77 | 0 | 63,683 | 0 | 22,045 | **85,728** | 13,248 | 35,544 | 36,936 | **85,728** | 0 |
| 78 | 0 | 59,572 | 0 | 26,156 | **85,728** | 17,508 | 31,956 | 36,276 | **85,740** | −12 |
| 79 | 0 | 55,663 | 0 | 30,066 | **85,728** | 21,564 | 28,644 | 35,520 | **85,728** | 0 |
| 80 | 0 | 51,945 | 0 | 33,783 | **85,728** | 25,452 | 26,556 | 33,732 | **85,740** | −12 |
| 81 | 0 | 48,579 | 0 | 37,149 | **85,728** | 29,160 | 23,496 | 33,072 | **85,728** | 0 |
| 82 | 0 | 47,597 | 0 | 38,131 | **85,728** | 32,700 | 20,712 | 32,316 | **85,728** | 0 |
| 83 | 0 | 47,159 | 0 | 38,569 | **85,728** | 35,640 | 18,300 | 31,788 | **85,728** | 0 |
| 84 | 0 | 46,717 | 0 | 39,011 | **85,728** | 36,684 | 16,536 | 32,508 | **85,728** | 0 |
| 85 | 0 | 46,268 | 0 | 39,460 | **85,728** | 37,740 | 15,780 | 32,220 | **85,740** | −12 |
| 86 | 0 | 45,815 | 0 | 39,914 | **85,728** | 38,796 | 13,824 | 33,108 | **85,728** | 0 |
| 87 | 0 | 45,355 | 0 | 40,373 | **85,728** | 39,408 | 12,108 | 34,212 | **85,728** | 0 |
| 88 | 0 | 44,890 | 0 | 40,838 | **85,728** | 39,864 | 10,548 | 35,316 | **85,728** | 0 |
| 89 | 0 | 25,091 | 0 | 41,308 | **66,399** | 40,332 | 9,108 | 36,288 | **85,728** | −19,329 |
| 90 | 0 | 0 | 0 | 41,784 | **41,784** | 40,812 | 7,908 | 37,008 | **85,728** | −43,944 |
| 91 | 0 | 0 | 0 | 42,266 | **42,266** | 41,280 | 6,480 | 37,968 | **85,728** | −43,462 |
| 92 | 0 | 0 | 0 | 42,754 | **42,754** | 41,772 | 120 | 804 | **42,696** | +58 |
| 93 | 0 | 0 | 0 | 43,248 | **43,248** | 42,252 | 0 | 0 | **42,252** | +996 |
| 94 | 0 | 0 | 0 | 43,747 | **43,747** | 42,756 | 0 | 0 | **42,756** | +991 |
| 95 | 0 | 0 | 0 | 44,253 | **44,253** | 43,248 | 0 | 0 | **43,248** | +1,005 |
| 96 | 0 | 0 | 0 | 44,765 | **44,765** | 43,764 | 0 | 0 | **43,764** | +1,001 |
| 97 | 0 | 0 | 0 | 45,282 | **45,282** | 44,268 | 0 | 0 | **44,268** | +1,014 |
| 98 | 0 | 0 | 0 | 45,807 | **45,807** | 44,796 | 0 | 0 | **44,796** | +1,011 |
| 99 | 0 | 0 | 0 | 46,337 | **46,337** | 45,312 | 0 | 0 | **45,312** | +1,025 |

Age 66 is the pre-retirement year and has no Moneysmart comparand in this table (their year 66 is an
accumulation year; ours is Retirement Phase from month 0 — the declared divergence run 1 also had).
`enough` draws the $30,000 minimum in it and spends nothing, which is why a $30,000 cash offset
stands on the books from age 66 onward.

**Three readings, in order of size.**

1. **Ages 67-88 the totals agree to ±$12 a year**, which is the monthly-rounding band and nothing
   more. Twenty-two years of a funded level income, matched.
2. **Assets run out at 89 here and at 92 there — three years short.** Explained below; it is
   overwhelmingly the 7.0% vs 5.6% portfolio return, not a Waterfall defect.
3. **From 92, `enough`'s Age Pension is about $1,000 a year (2.3%) HIGH** and the gap is flat in
   percentage terms, not growing. That is the run-1 rate-formula residual seen from the other side;
   see "what is not closed".

### The same run with `--pension-basis cpi`

CPI-indexing the rate is the *wrong* configuration and is recorded only so the size of the error is
on the page. The Age Pension flattens at about $31,660 real instead of rising, the household is
poorer from 75 onward, the portfolio is consumed faster, and assets are gone by **87** rather than 89.
By age 99 the pension is $31,609 against Moneysmart's $45,312 — a **30% understatement**. Run 1's
warning that "if that is not matched deliberately the two diverge a little more every year and it
will look like a means-test defect" is confirmed, and at this horizon the consequence is not a
cosmetic pension line but a three-year difference in when the money runs out.

---

## Reverse-engineered model — run 1's fits re-tested, and they hold

**Age Pension maximum rate.** Run 1 back-solved

    pension(age) = 31223.40 * (1.037 / 1.025) ^ (age - 67)

This run's unabated years are 87-100 (later than run 1's 82, because this household carries $500,000
more assets and the assets test binds five years longer). Over those fourteen years the formula
predicts this run's table x 12 to **±$6**, i.e. to the monthly rounding. The fit is confirmed on a
second, independent scenario.

**Assets test.** Run 1 back-solved a free area of **≈ $331,670 constant in today's dollars** and a
taper of **$78 per $1,000 per year**. Back-solving implied assets out of this run's means-tested
years on those two constants — `assets = 331,670 + (maxRate − pension) / 0.078` — gives:

| Age | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| implied assets | 718,111 | 663,409 | 611,536 | 562,185 | 515,512 | 471,055 | 428,968 | 389,100 | 356,988 | 349,249 | 341,422 | 333,662 | 331,663 |

The path is smooth and monotonically declining, and at age 87 — the first unabated year — it lands on
**$331,663 against a predicted free area of $331,670, a $7 miss**. The free area and the taper are
jointly confirmed a second time, on a scenario that reaches the cutoff from a very different asset
level.

**Deeming and the income test never bind**, same as run 1: at age 75 the implied assets of $718,111
deem to roughly $15,000, which after the income free area leaves a pension far above the $4,128
actually paid. **The assets test binds every means-tested year.**

---

## What this run CANNOT validate

### 1. Sequencing — the balance PATHS are not comparable, and a shape mismatch is not a defect

PDF page 13: *"The calculator assumes that you and your spouse (if any) drawdown your respective
accounts/investments **in proportion to your respective balance**, subject to minimum drawdown
requirements."* Moneysmart draws super and the outside-super pool **alongside each other, pro rata**.
`enough` draws the Account-Based Pension to zero **first**, then the portfolio — limb 2 before limb 3,
our own ruled and tested behaviour.

The table makes this visible and it is stark:

| | ABP / super exhausted | portfolio first sold |
| --- | --- | --- |
| `enough` | age **74** | age **74** |
| Moneysmart | age 92 (both together) | age 67 |

Their "MS super" and "MS inv" columns are therefore **not comparable to ours line for line, in any
year**. The comparands are the **total** and the **Age Pension**. Nothing in this run tests whether
the Waterfall's ordering is right; it tests that the ordering still produces the right total.

There is a second-order consequence that is NOT neutral and should not be waved away: the means test
reads total assessable assets, and both engines hold the same total, so the Age Pension is
*first-order* insensitive to the split. But the two pools earn different returns in their model
(5.6% vs 7.0%), so their proportional draw keeps more in the fast pool for longer than a
super-first draw would. Their asset total therefore decays more slowly than ours for reasons that
are **partly** sequencing and not only the rate. That interaction is not separable from this run.

### 2. CGT — there is no comparand, and this run happens to charge none

PDF page 9: *"The calculator does not explicitly allow for any associated taxes on these income or
capital gains attributable to these assets"*, and page 13 repeats it: *"It does not take into account
... capital gains tax that may be applicable on any drawdowns from other investments."* **Moneysmart
charges zero CGT on this pool. No comparand exists for that line.**

What `enough` does at this target is worth recording precisely, because it is nil for a reason that
is *not* "limb 3 doesn't realise gains":

- The portfolio realises a **net capital gain (s 102-5, post-discount) peaking at $37,618** in the
  age-75 year, and over $27,000 in every year from 75 to 89.
- **`enough` charges $0.00 of capital gains tax across the entire walk.** The gain stacks on a $0
  salary, and the offset stack the engine applies to a single retiree absorbs all of it.
- The margin is thin. Bisecting the spend target, CGT first appears at a net capital gain of about
  **$38,100** — roughly $500 above this run's peak. The `05dbfbe` run at a $140,000 nominal target
  charges **$9,472.59** (reproduced exactly), and $120,000 charges $1,778.44.

So the honest statement is: **this run does not exercise the CGT charge at all**, and it is a
coincidence of the target that it does not. The `--pension-basis cpi` variant of the same run, which
draws the portfolio harder, charges $382.40. Anyone reading a $0 CGT line here as evidence that limb
3's tax is wired up is reading it backwards.

### 3. The residuals that are NOT closed

**(a) The portfolio return — 7.0% against 5.6%, and it is worth three years of money.**
This is the largest divergence in the comparison and it is a **known model difference, not a
mystery**: `enough` has a single `nominalReturn` and Moneysmart has a per-asset-class rate. It is
recorded as unclosed because P4-7 has no mechanism to close it — the fix is per-asset returns, and
that is not this ticket.

Its size is measurable. Holding everything else fixed and sweeping `nominalReturn`:

| `nominalReturn` | portfolio exhausted | total CGT |
| --- | --- | --- |
| 5.6% (this run) | age 89 | $0 |
| 6.1% | age 90 | $666.36 |
| **6.5%** | **age 92** | $1,502.93 |
| 7.0% | age 94 | $5,143.85 |

**A single blended 6.5% reproduces their run-out age of 92 exactly.** Moneysmart's own weighted
opening blend is $600,000 at 5.6% plus $500,000 at 7.0% = 6.24%, drifting toward 7.0% as the super
side drains under their proportional draw. A life-weighted blend of about 6.5% is exactly what that
predicts. **The three-year gap is fully accounted for by the return difference, with nothing left
over.** That is a closure of the *explanation* but not of the *model*; the script still runs at 5.6%
because 5.6% is the honest input, and 6.5% is a diagnostic and must not be adopted as a setting.

**(b) The unabated Age Pension is ~2.3% high from age 92, flat, and it is run 1's residual.**
`enough` on `--pension-basis wage` pays about $1,000 a year more than Moneysmart in every unabated
year 92-100, and the gap is a constant *percentage*, so it is a level difference in the base rate
and not a drift in the indexation. Run 1's formula base is $31,223.40 in today's dollars; `enough`'s
own base comes from `settings.economicSeries` and the September-2026 rate register. This is the same
unclosed object as run 1's 0.13-point growth gap — a small, constant, unexplained level offset — and
it is named here rather than dissolved into a tolerance. **Do not treat a divergence of this size in
`enough` as a defect until it is explained.**

**(c) Run 1's 0.13-point real-growth residual is neither confirmed nor refuted here.** Run 1 closed on
it by back-solving an implied balance path out of the pension series. That is only possible while the
assets test binds *and* the asset total is a single pool at a single rate. Here the asset total spans
two pools at two different rates and the split is unobservable from the income table, so the implied
balance path cannot be decomposed and the growth rate cannot be recovered. **Not attempted, for that
reason.**

---

## On the HTML snapshot, which is not committed

`Retirement planner - Moneysmart.gov.au.html` and its `_files/` folder (23 files, 13 MB) were saved
alongside the PDF and are **deliberately not in the repository**. The page is a dead client-rendered
Angular SPA snapshot: the bundles are `main.*.js`, `polyfills.*.js`, `runtime.*.js`, `scripts.*.js`
and the WTW widget, and there is **no embedded state JSON, no results series and no engine**. The
only figure recoverable from the whole snapshot is `aria-valuenow="101612"` on the income-goal
slider, which is already on page 2 of the PDF. It offers no precision the PDF does not, and 13 MB of
vendored dead assets is not worth the tree. The PDF is committed; the snapshot is not.

---

## How to use this against `enough`

1. `npm run build`, then `node scripts/moneysmart-limb3.mjs --pension-basis wage`.
2. The comparand is the **today's-dollars total** and the **Age Pension**, never the super/portfolio
   split — see "Sequencing".
3. Expect ±$12 a year on the totals to age 88, an assets-exhausted age of 89 against their 92, and a
   ~2.3% high Age Pension from 92. All three are accounted for above.
4. Do not tune anything in `src/` against this run. Every gap that remains has a named cause, and
   two of them (per-asset returns, the rate base) are model gaps whose fixes live elsewhere.
