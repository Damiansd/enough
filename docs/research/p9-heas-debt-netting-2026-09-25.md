# HEAS debt against a former home that has become assessable (2026-09-25)

Closes `p1-heas.md` UNVERIFIED item 2 and the ADR-0005 2026-09-25 "not built" gap. Fetched today; snapshot dates given.

## Sources (quoted)
- **SS Act s 1121(5)** (AustLII via Wayback 20230320): if a person "is or was participating in the pension loans scheme" and their (or the couple's) real assets are "subject to a charge under section 1138", "the value of those real assets ... is to be reduced by the amount of the debt owed by the person under section 1135". s 1121(1A) keeps the general s 1121(1) rule off a s 1138 charge. s 1121 sits in **Part 3.12 Division 1** (Act ToC, Wayback 20250528).
- **DSS Guide 3.4.5.20** (v1.333, 3 Nov 2025; last reviewed 4 Jan 2022): "the amount owed ... under the HEAS is allowed as a deduction from the value of the recipient's assessable assets used as security"; "NO reduction ... if the pensioner's principal home is the ONLY security ... The principal home is an exempt or non-assessable asset"; "the full value of the loan is deducted"; "apportionment of encumbrances rules do not apply to HEAS loans".
- **Aged Care Act 2024 s 330** (compilation 2, 1 Jul 2026, legislation API): (1) asset value "is the value worked out in accordance with Division 1 of Part 3.12 of the Social Security Act 1991"; (7) "disregard the value of a home to the extent that it exceeded the amount prescribed by the rules"; **(8) "For subsection (7), the value of a home is the value worked out after applying subsections (1), (12) and (13)."** (13) switches s 1121(1) off only for a charge over a refundable deposit, so it does not touch s 1121(5).
- **Aged Care Rules 2025 s 330-5** (compilation 10, 1 Aug 2026): "the amount is $214,884.00" (that compilation predates the $219,858.40 figure for 20 Sep 2026). The Rules say nothing about HEAS in the means test. s 280-10(e)(ii) names HEAS only as a hardship matter.
- **No agency guidance either way.** Services Australia "You own your home" (last updated 1 Nov 2025), myagedcare "Income and means assessments" and the Services Australia HEAS pages don't mention a HEAS debt in the aged care assessment. The aged care verdict rests on the statute's wording alone.

## Verdicts
| Test | Verdict |
|---|---|
| Age Pension, home still exempt (<24 months in care, or a protected person) | **not deducted** (3.4.5.20: the debt offsets an exempt asset) |
| Age Pension, past the s 11A(9)(b) 2-year cliff | **deducted in full** (no cap exists here), s 1121(5) |
| Aged care means assessment, home not protected | **deducted before cap**: s 330(8) caps the value "after applying subsection (1)", and (1) imports Div 1, including s 1121(5) |
| Debt larger than the home (can it reduce other assets?) | **UNSOURCED**. s 1121(5) reduces "those real assets" only. Keep the existing `Math.max(0, …)` floor and flag it |
| Whether debt growth alone triggers an aged care re-determination (s 331) | **UNSOURCED**. The walk reassesses every month anyway |

## Design (`src/core/projection.ts`)
- Add one walk-local sum, `heasDebtOpening = Σ heasDebt[i]`, read before the HEAS draw block (~10224) runs, so it's the month's OPENING debt, the same timing as `mortgageBalance`. Use it for both couple members: s 1121(5)(b)(ii) covers a couple's jointly charged real assets.
- **Age Pension, ~6715** `careVacatedHomeAssessment`: `Math.max(0, inflateStated(...) - mortgageBalance - heasDebtOpening)`. Only reached past the cliff, so the exempt case stays at nil, as 3.4.5.20 requires.
- **Aged care, ~9999** `homeNetValue`: `Math.max(0, atTodaysMoney(...) - mortgageBalance - heasDebtOpening)`. `agedCare.ts:129-130` then halves it for a couple and applies `minCents(…, homeExemptionCap)`, so the deduction lands before the cap with no change to `agedCare.ts`. Asymmetry to state: this home value is frozen at entry, but the debt keeps growing.
- **Byte-identical without HEAS_DRAW:** yes. `heasDebt[i]` starts at `toCents(0)` (5448) and only the HEAS block writes to it, so the new term is 0. The demo fixture has no HEAS_DRAW or ENTER_CARE, and no existing `project()` test has both entries together (grep of `test/*.mjs`). The golden file and existing outputs are unchanged.

## Hand-worked tests (`test/core-projection-aged-care.test.mjs`)
1. **Age Pension cliff, netted.** Use P14-5a's lone-survivor fixture plus `HEAS_DRAW` for personA (stated `fortnightlyAmount`, dated 2026-10-01). Months before the cliff still pass `noHomeJump`. Then pin `mar.assessableAssets === feb.closingBalance + CPI_CARRIED_HOME_TO_MARCH_2027 - feb.heasDebt`. Mutation to check: drop the term and it fails by exactly `feb.heasDebt`.
2. **Aged care, before the cap.** A single resident, not protected, with `homeValue` just over the cap (e.g. $230,000 on the entry day) and a debt D > $10,141.60 by the test month. The three readings then differ: V−D (before cap), cap−D (after cap) and cap (not deducted). Compose it the way the test at ~864 does: `agedCareMeansAssessment` with `netValue: V − prev.heasDebt`, then check the hotelling and NCCC lines to the cent. Keep other assets low so the fees stay below their maximums, or the three readings look the same. Mutations to check: subtract after `minCents`, and omit the subtraction. Both should fail.
