# P14-11 (Support at Home: 8 levels, 3 buckets) gate — 2026-09-25, NO-GO

Read-only. Re-fetched live (Chrome UA, HTTP 200, archive.org not needed) rather than trusting the
2026-09-24 research doc's prose.

**1) Sourcing.** `schedule-of-contributions-for-support-at-home-services_0.pdf` (health.gov.au,
"from 20 September 2026") reproduces every figure the prior doc quoted, to the cent: 8 budgets
($11,010.01 … $80,137.12, matches `agedCare.ts:324-331`), standard buckets (Clinical 0% /
Independence 5%–50% / Everyday Living 17.5%–80%, min/max by pensioner tier), NWOP buckets (0% /
0–25% / 0–25%), both lifetime caps ($140,652.80 / $88,934.57), all income/asset thresholds.
`charging-for-support-at-home-services` re-confirms P14-2's text verbatim. Two things are NOT
sourced, even now: the **taper formula** — unlike residential (a quoted 5-band waterfall with two
worked examples, `agedCare.ts:44-51`), this PDF gives only min/max threshold and min/max rate per
bucket, no interpolation rule, no worked example, so a rate inside the range can't be reproduced to
the cent — and the **combined-cap claim** — yesterday's doc attributed "this is a combined cap with
the NCCC" to a "participant-contributions" page; every guessed URL for it 404s today. The identical
$140,652.80 in both schedules is suggestive, not a re-fetched quote.

**2) Engine need.** A new entry (`START_HOME_CARE`: Person, classification 1–8, pensioner tier, a
stated service mix across the three buckets — one $ budget can't fund three differently-rated
buckets without it), per-bucket contribution arithmetic (blocked on the taper formula), a
lifetime-cap balance carried the way `AgedCareNcccCapBalance` already is (`agedCare.ts:156-168`,
P4-10's pattern), and its interaction with `ENTER_CARE`'s own NCCC cap — today two separate,
unlinked balances (`projection.ts:5399`). `grep -rn "supportAtHome" src/core` returns nothing: no
entry, `Constant`, or means test touches it yet.

**3) Stated, no defaults** (ADR-0005 pattern — RAD price, home value, care entry age): classification
level, pensioner/CSHC/self-funded tier, per-bucket service mix, NWOP eligibility (12 Sep 2024
status), entry date.

**4) Absent `START_HOME_CARE`:** byte-identical — the same discipline `ENTER_CARE`/`SELL_HOME`/
`RENT_OUT_HOME` each shipped under. No golden/digest fixture at risk from this gate.

**5) Verdict: NO-GO**, on two of the three named conditions: the contribution rate is sourced only
at its two boundary values, not as a computable function, and the lifetime-cap/residential
interaction is unsourced today. No build follows. Re-run once a worked example or the combined-cap
page is found.
