# P3-17b — income protection (IP) premiums in super (2026-09-28)

**Source.** Aware Super, *Insurance Handbook — Employer Sponsored and Personal*, forming part of the
Future Saver PDS **dated 30 April 2026** (cover page, p.1; footer "Prepared and issued by Aware Super
Pty Ltd ABN 11 118 202 672, AFSL 293340", p.2):
`https://aware.com.au/content/dam/aware/au/en/documents/member/disclosure/pds/Insurance-Handbook-Employer-sponsored-and-Personal.pdf`
(fetched 2026-09-28 via `curl` with a browser User-Agent — no archive fallback was needed, the URL
served directly). This is the same document already used for P3-17a's Death/TPD tables (fetched
2026-09-24); the IP material is later in the same PDF.

## 1. The premium table

**Table 4: Income Protection annual premium rates (90 days waiting period)** (p.20 in the PDF's own
numbering, "20" printed at page bottom) — *"the annual cost (before the tax deduction benefit) for
$1,000 of annual IP cover with a 90 days waiting period, before applying the relevant insurance
category and waiting period factors and any premium loading."* Age last birthday, three benefit
periods side by side:

| Age | 2 years | 5 years | To age 65 | Age | 2 years | 5 years | To age 65 |
|---|---|---|---|---|---|---|---|
| 15 | $0.97 | $2.29 | $4.53 | 40 | $1.65 | $3.90 | $11.00 |
| 16 | $0.98 | $2.31 | $4.53 | 41 | $1.78 | $4.20 | $11.98 |
| 17 | $1.03 | $2.43 | $4.53 | 42 | $1.90 | $4.48 | $13.06 |
| 18 | $1.04 | $2.44 | $4.53 | 43 | $2.08 | $4.91 | $14.27 |
| 19 | $1.04 | $2.44 | $4.53 | 44 | $2.25 | $5.30 | $15.57 |
| 20 | $1.08 | $2.56 | $4.53 | 45 | $2.44 | $5.78 | $16.99 |
| 21 | $1.03 | $2.43 | $4.55 | 46 | $2.69 | $6.36 | $18.49 |
| 22 | $1.00 | $2.35 | $4.61 | 47 | $2.95 | $6.96 | $20.05 |
| 23 | $0.97 | $2.29 | $4.68 | 48 | $3.29 | $7.77 | $21.71 |
| 24 | $0.96 | $2.28 | $4.75 | 49 | $3.66 | $8.65 | $23.40 |
| 25 | $0.92 | $2.19 | $4.82 | 50 | $4.09 | $9.65 | $25.11 |
| 26 | $0.92 | $2.19 | $5.09 | 51 | $4.59 | $10.84 | $26.84 |
| 27 | $0.96 | $2.28 | $5.35 | 52 | $5.15 | $12.17 | $28.49 |
| 28 | $0.97 | $2.29 | $5.58 | 53 | $5.79 | $13.68 | $30.09 |
| 29 | $0.97 | $2.29 | $5.80 | 54 | $6.54 | $15.45 | $31.56 |
| 30 | $0.98 | $2.31 | $6.04 | 55 | $7.37 | $17.42 | $32.89 |
| 31 | $1.02 | $2.41 | $6.28 | 56 | $8.35 | $19.71 | $33.90 |
| 32 | $1.05 | $2.48 | $6.53 | 57 | $9.46 | $22.35 | $34.52 |
| 33 | $1.11 | $2.62 | $6.84 | 58 | $10.73 | $25.36 | $34.59 |
| 34 | $1.14 | $2.69 | $7.20 | 59 | $12.10 | $28.20 | $33.93 |
| 35 | $1.20 | $2.84 | $7.62 | 60 | $13.65 | $26.92 | $32.39 |
| 36 | $1.28 | $3.03 | $8.11 | 61 | $15.39 | $24.63 | $29.64 |
| 37 | $1.39 | $3.27 | $8.69 | 62 | $17.31 | $20.94 | $25.20 |
| 38 | $1.45 | $3.42 | $9.36 | 63 | $15.20 | $15.86 | $19.09 |
| 39 | $1.54 | $3.63 | $10.13 | 64 | $5.48 | $5.72 | $6.88 |

Table stops at age 64 (cover ends at 65 — see §3). Note the "To age 65" column's shape: it rises
through the 50s, peaks near 58 ($34.59), then falls sharply from 60 as the remaining benefit period
shortens — a genuine age-rated **and** term-shortening curve, not monotonic like Table 2's Death/TPD
rates.

## 2. Waiting-period and category factors, and the formula

**Table 5: Income Protection insurance category factors** (p.20): Professional 0.75, Low Risk 1.00,
Medium Risk 1.25, High Risk 1.50.

**Table 6: Income Protection waiting period factors** (p.20): 14 days (2-year benefit period only)
2.50, 30 days 2.00, 60 days 1.50, 90 days 1.00.

**Formula (p.19, "Step 2 – Apply the formula")**, verbatim steps: *"1. Divide your cover amount by
1,000. 2. Multiply the result by the premium rate from Table 4. 3. Multiply that result by your
insurance category factor from Table 5. 4. Multiple [sic] that result by your waiting period factor
from Table 6. 5. If the insurer has applied a premium loading to your cover, increase your result by
the percentage of premium loading."*

Worked example 1 (p.19): 36-year-old, $36,000/yr cover, 2-year benefit period, 90-day wait, Low Risk
category: `36 × $1.28 × 1.00 × 1.00 = $46.08`/yr. Example 2: 30-year-old, $60,000/yr cover, 5-year
benefit period, 30-day wait, Medium Risk, 75% loading: `60 × $2.31 × 1.25 × 2.00 = $346.50`, `+75% =
$606.38`/yr.

**Waiting-period × benefit-period availability grid (p.27):** 14 days only with a 2-year benefit
period (and requires full underwriting); 30/60/90 days available with 2 or 5 years; "To age 65" is
**not available** with 14 or 30 days in the table shown, only reachable via full underwriting per the
text. IP taken up under Basic Plus Cover or "IP Express" (the two easy paths) is restricted to a
60- or 90-day wait and a 2- or 5-year benefit period only (p.27) — "to age 65" and 14/30-day waits
need full underwriting.

**Why this is a ratio trick like P3-17a, and why it still works.** IP cover is *fixed*, not age-based
(§3): *"Income protection (IP) cover is optional and can only be fixed cover... This amount... won't
automatically change as you get older"* (p.6). The category factor, waiting-period factor and any
loading are all constant over time for a given policy, so they cancel in a same-benefit-period ratio
exactly as Table 2's category factor/loading cancelled for Death/TPD:
`premium_m = stated_annual × Table4[benefitPeriod][age_m] / Table4[benefitPeriod][age_0]`, nil from 65.
**The one new structural input Table 4 forces that Table 2 didn't**: which of the three benefit-period
columns applies, because the three curves are not proportional to each other (the "to age 65" column
falls away near the end while 2-year and 5-year don't) — unlike category factor/loading this does not
cancel, so it cannot be inferred from the stated premium alone.

## 3. When IP ends; default cover; retirement-phase availability

**End age: 65**, stated twice — "When your insurance ends" (p.10): *"you reach the benefit ceasing age
(70 for death and TPD cover, 65 for income protection cover)"*; and again on p.6: cover *"will end when
you reach age 65."* (Table 4 itself stops at age-last-birthday 64, confirming this.)

**Not automatic / not default.** Unlike Basic Cover (death/TPD), which many members get automatically
on joining through an employer, IP is explicitly opt-in: *"You do not automatically receive IP cover
when you become a member of Aware Super. If you apply for IP cover, you must make some choices..."*
(p.27, "About income protection (IP) cover"). Eligibility to apply: Australian resident, *"at least 15
years old but less than 65"*, gainfully employed ≥15 hrs/week, at work on the application date (p.27).
Cover amount: 15%–87% of normal monthly income, subject to policy maximum (p.27); insurer pays out at
most 75% of pre-disability income as a benefit, with any excess (for cover above 75%, up to 87%) paid
into the Future Saver account as a super contribution instead of to the member (p.27–28).

**Retirement-phase / TTR accounts: not mentioned anywhere in this Handbook.** A full-text search of
the extracted PDF (3,130 lines) for "Retirement Income", "TTR", "Transition to Retirement", "retirement
phase" and "pension account" returns **zero matches**. Every provision — eligibility, premium
deduction, cover cessation — is scoped to the **Future Saver account** by name (e.g. p.20, "Paying for
your insurance": *"We deduct insurance premiums from your Future Saver account..."*; p.4, cover ceases
if the account balance can't fund it). Aware's Future Saver product is the accumulation product; this
document does not cover a Retirement Income (account-based pension) product at all — that product has
its own, separate PDS which was not fetched. The absence is consistent with the general rule that
super insurance (Death/TPD/IP) attaches to accumulation interests, not pension-phase interests: the
codebase's `SuperInterest.phase` is `'accumulation' | 'accountBasedPension' | 'ttr'`
(`src/core/household.ts:168`), and P3-17a's existing Death/TPD fields (`statedInsuranceCoverKind`,
`statedDeathPremiumPerYear`, etc., `src/core/household.ts:538-553`) carry no phase check today — this
is a pre-existing gap in P3-17a, not new to IP, but the IP build should either add the same
accumulation-only assumption explicitly or inherit whatever P3-17a eventually does about it.

## Verdict: **GO** for a build structurally identical to P3-17a slice 1

The IP table, factors and formula are all primary and cited above (Table 4/5/6, pp.19-20; end age p.6
and p.10). The ratio idiom already in `src/core/superInsurance.ts` (`scaledPremium`/`ageFactor`)
extends directly: add a third `benefitPeriod: '2y' | '5y' | 'to65'` axis to Table 4, cap the walk at
age 65 instead of 70, and reuse the fixed-cover branch (`kind === 'fixed'`) since IP is always fixed
cover — no age-based-cover branch is needed for IP.

**Facts only the user can supply (none derivable from any published table):**
1. **Whether they (or their partner) hold IP cover in super at all**, and on which `SuperInterest`
   (Aware fund, accumulation phase) — absence must remain a distinct "nobody was asked" state, per
   the codebase's own convention for `statedInsuranceCoverKind` etc.
2. **The stated annual (or monthly) IP premium off their current statement** — the ratio's seed value,
   exactly like `statedDeathPremiumPerYear`/`statedTpdPremiumPerYear`.
3. **Which benefit period their cover uses — 2 years, 5 years, or "to age 65"** — this is the one new
   structural fact IP needs beyond P3-17a, because (unlike the category factor, waiting-period factor
   and any loading, which cancel in the ratio) the three Table 4 columns are not proportional to one
   another and the choice cannot be inferred from the premium amount alone.

**Not needed as user inputs** (cancel in the ratio, same reasoning as P3-17a's category
factor/loading): the waiting period (14/30/60/90 days) and any insurance category or premium loading —
these are constant over the member's life for a given policy and drop out of `premium_m/premium_0`.

**Not modelled, carried over as a known limitation (as P3-17a already flags analogous gaps):** the
inactive/low-balance switch-off and any account-balance shortfall that would force cover to lapse; the
"excess benefit above 75% redirected to the Future Saver account as a contribution" mechanic (p.27-28)
if a claim is ever modelled; the fact that "to age 65" and 14/30-day waits require full underwriting
(irrelevant to premium *sizing*, only to whether a hypothetical new application would be accepted).
