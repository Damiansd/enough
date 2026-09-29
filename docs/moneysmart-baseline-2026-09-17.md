# Moneysmart Retirement Planner — P4-7 baseline run, 2026-09-17

Source of truth for the P4-7 validation gate. The PDF this accompanies is
`docs/ASIC Retirement Planner.pdf` (15 pages, summary + assumptions only — it does **not**
contain the year-by-year series below, which was read off the on-screen results table by hand
and must not be silently regenerated or "corrected").

Calculator: **Retirement planner**, moneysmart.gov.au/plan-for-your-retirement/retirement-planner.
A Willis Towers Watson widget over a closed server-side engine — no API, no URL parameters, no
client-side formulas. A human at the form is the only legitimate route. Laws/figures stamped
**July 2026**.

## Inputs (as confirmed on PDF pages 2-4)

| Field | Value |
| --- | --- |
| Status | Single, no spouse |
| Current age / retirement age / run-out age | 66 / 67 / 92 |
| Salary | $0 (this is the trick — see below) |
| Super balance | $600,000 |
| Investment choice before / after retirement | Balanced / Conservative |
| Employer, salary-sacrifice, after-tax contributions | $0 |
| Personal assets | $0 (overrides their $25,000 default) |
| Shares / cash / investment property | $0 |
| Homeowner / include Age Pension | Yes / Yes |
| Insurance premiums | $0 (overrides their $599 default) |
| Admin fees $ p.a. and fee cap, both accounts | $0 |
| Admin fee % of balance | 0.11% super / 0.14% pension (NOT zeroable) |
| Inflation / wage inflation | 2.5% / 3.7% |
| Deflator before / after retirement | 3.7% / 2.5% |
| Retirement income target | $0 (all fortnightly goal fields left at $0) |

**Why age 66 retiring at 67 with a $0 salary.** The calculator explicitly refuses members already
drawing an account-based pension, so we cannot start at retirement. This shape gives a single,
empty accumulation year: SG, contributions tax and insurance all contribute nil, so the three
things `project()` has no code path for cannot contaminate the comparison.

## Headline outputs (today's dollars)

| Figure | Value |
| --- | --- |
| Estimated balance at retirement (age 67) | $610,657 |
| Retirement income target | $0 |
| Average estimated income | $64,370 p.a. |

## Year-by-year (today's dollars)

| Age | Age pension | Your super | Total |
| --- | --- | --- | --- |
| 67 | 9462 | 54908 | 64370 |
| 68 | 12745 | 51625 | 64370 |
| 69 | 15860 | 48510 | 64370 |
| 70 | 18815 | 45555 | 64370 |
| 71 | 21618 | 42752 | 64370 |
| 72 | 24276 | 40094 | 64370 |
| 73 | 26797 | 37573 | 64370 |
| 74 | 29187 | 35184 | 64371 |
| 75 | 31452 | 32918 | 64370 |
| 76 | 32732 | 31638 | 64370 |
| 77 | 33500 | 30870 | 64370 |
| 78 | 34270 | 30100 | 64370 |
| 79 | 35043 | 29327 | 64370 |
| 80 | 35819 | 28551 | 64370 |
| 81 | 36596 | 27774 | 64370 |
| 82 | 37180 | 27191 | 64371 |
| 83 | 37615 | 26755 | 64370 |
| 84 | 38055 | 26315 | 64370 |
| 85 | 38501 | 25869 | 64370 |
| 86 | 38951 | 25419 | 64370 |
| 87 | 39407 | 24963 | 64370 |
| 88 | 39869 | 24501 | 64370 |
| 89 | 40336 | 24035 | 64371 |
| 90 | 40808 | 23562 | 64370 |
| 91 | 41286 | 23085 | 64371 |
| 92 | 41769 | 93 | 41862 |
| 93 | 42258 | 0 | 42258 |
| 94 | 42753 | 0 | 42753 |
| 95 | 43253 | 0 | 43253 |
| 96 | 43759 | 0 | 43759 |
| 97 | 44272 | 0 | 44272 |
| 98 | 44790 | 0 | 44790 |
| 99 | 45314 | 0 | 45314 |
| 100 | 45854 | 0 | 45854 |

## What this run does and does NOT exercise

**It is a level-income solve, not a minimum drawdown.** Total income is flat at $64,370 from 67 to
91 and the balance is exhausted exactly at the stated run-out age of 92. A $0 income target did
**not** yield minimum-only draws: the super draw at 67 is $54,908 on $610,657 = **8.99%**, against
a 5% minimum, and the ratio only rises. Therefore:

- **The ABP minimum drawdown is never binding in any of the 25 years — this run does not test it.**
- **Deeming and the income test are never binding either.** Deemed income on $610,657 is about
  $12,456; after the income free area that reduces the pension to roughly $27,800, far above the
  $9,462 actually paid. **The assets test binds** every means-tested year.
- What it *does* exercise: the Age Pension assets test, Age Pension indexation, and growth
  compounding.

## Reverse-engineered model (all fits verified numerically, not eyeballed)

**Age Pension maximum rate, in today's dollars:**

    pension(age) = 31223.40 * (1.037 / 1.025) ^ (age - 67)

Exact to the dollar for **every year from age 82 to 100**, where the pension is unabated: age 82
predicts 37,180 against 37,180; age 85, 38,501 against 38,501; age 92, 41,769.4 against 41,769.
Their rate indexes at wage growth 3.7% but is deflated at CPI 2.5%, so **the Age Pension rises
1.1707% per year in REAL terms** across the whole projection. `enough` indexes off
`settings.economicSeries`; if that is not matched deliberately the two diverge a little more every
year and it will look like a means-test defect.

**Assets test, means-tested years (67-81):** free area **≈ $331,670, constant in today's dollars**
(their threshold indexes at 2.5% and the post-retirement deflator is 2.5%, so the two cancel),
taper **$78 per $1,000 per year** ($3/fortnight). Back-solving implied assets from each year's
pension reproduces a smooth declining balance path, so the free area and taper are jointly
confirmed rather than assumed.

## ⚠️ One residual that is NOT closed

The implied balance path grows at **3.150% real** between assessments, where Conservative 5.6%
against a 2.5% deflator predicts **3.024%** — a consistent 0.13-point gap in every year, too
regular to be rounding. Separately, the single accumulation year 66 -> 67 runs +1.776% in today's
dollars where Balanced 6.1% against the 3.7% pre-retirement deflator predicts +2.314%. **The two
gaps point in opposite directions**, so no single fee or timing convention explains both, and an
early hypothesis that they apply pension-phase returns before 67 does not survive the second
figure. Small, but it compounds over 25 years. **Do not treat a divergence of this size in
`enough` as a defect until this is explained.**

## How to use this against `enough`

`enough` has no level-income solver — the Waterfall draws to a stated need — so their solve becomes
an **input** to us, not something to reproduce. Set `SPEND_CHANGE` to **$64,370**, assert the
balance reaches zero at 92, and compare the Age Pension column year by year. Deflate `enough`
output before comparing: every figure above is in today's dollars.
