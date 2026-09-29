# HEAS advances during an active window for a genuine part-rate pensioner — resolving T137

## Sources retrieved
- SS Act 1991 ss 1133AA, 1134, 1134A, 1135 — classic.austlii.edu.au via Wayback, snapshot `20230322064829`. `https://web.archive.org/web/20230322064829/http://classic.austlii.edu.au/au/legis/cth/consol_act/ssa1991186/s1134.html` (+ `s1134a.html`, `s1133aa.html`, `s1135.html`).
- Services Australia, "Home Equity Access Scheme advance payments" — `https://web.archive.org/web/20251018195752/https://www.servicesaustralia.gov.au/home-equity-access-scheme-advance-payments`.
- Services Australia, "Home Equity Access Scheme advance payment examples" (George/Olli, no third example) — `https://web.archive.org/web/20260213044255/https://www.servicesaustralia.gov.au/home-equity-access-scheme-advance-payment-examples`.
- DSS Guide to Social Security Law **3.4.5.40 "Rate of PLS"** — `https://web.archive.org/web/20160403204938/http://guides.dss.gov.au/guide-social-security-law/3/4/5/40` (guide v1.220, 21 Mar 2016; pre-HEAS-rename, pre-150%-cap era — the ceiling described there is 100%, not 150% — but it is the only primary source with an actual **part-rate worked example** of the top-up mechanic, and it is not superseded on that mechanic). guides.dss.gov.au's current pages return 403 to Wayback for post-2022 content, as the prior gate research already found; no live HEAS-era 3.4.5.4x page was retrievable.

## The formula, term by term
Combined fortnightly HEAS payment (own pension + loan) during an active advance window:
```
combined_fn = pension_fn + max(0, headroom_annual − advances_taken_in_window) / 26
headroom_annual = (1.5 × MPR_fn − pension_fn) × 26        [= heasFortnightlyDraw(...) × 26 in the repo]
```
- **`MPR_fn`** ("maximum payment rate"): s 1133AA(1) — *"'maximum payment rate' means the rate worked out at Step 4 of the Method statement in Module A of the relevant Pension Rate Calculator."* This is the standard ceiling for the person's category (single/couple), **not** their own means-tested rate.
- **`1.5 × MPR_fn`**, no active advance: s 1134(1A)(a)(i) — *"1.5 multiplied by the maximum payment rate."*
- **`pension_fn` subtracted** (loan tops the person's *actual* entitlement up to the ceiling): DSS 3.4.5.40 — *"This amount will 'top up' their entitlement under the normal income and assets test provisions to the equivalent of the maximum rate payable"* — with a genuine part-rate worked example (single, actual assessed pension $61.10/ft topped up by a $610.80 loan to $671.90, the era's 100% ceiling).
- **Annualise, subtract the window's advances, divide by 26**: Services Australia's George example — *"$15,323.10 yearly − $10,000 (advance payment) = $5,323.10 divided by 26 = $204.73 for 26 fortnights."*
- **The floor, active-advance case**: s 1134(1A)(b)(i) — *"the greater of the maximum payment rate and 1.5 multiplied by the maximum payment rate less any amounts of pension loans scheme advance payment received by the person in relation to the period."* Corroborated in plain language: advance-payments page — *"You can always top-up your fortnightly payment to 100% of your maximum pension rate."*
- **The advance cap** that interacts with the floor: s 1134A(3)(a) — *"0.5 multiplied by the maximum payment rate"*; advance-payments page — *"You can advance up to 50% of the maximum pension rate of your qualifying pension in any 26 fortnight period."*

## Is there a floor? — resolved by algebra, not by a third example
Neither Services Australia example is a genuine part-rate case (George is full-rate; Olli is nil), so T137 could not be settled by extension. But the Act's own numbers settle it directly. Given the legislated cap `advances_taken ≤ 0.5 × MPR_fn × 26` (already enforced pre-`project()` by `checkHeasDraws`, `src/core/parsePlan.ts:1721`):

```
combined_fn = pension_fn + max(0, headroom_annual − advances_taken) / 26
            ≥ pension_fn + (headroom_annual − 0.5×MPR_fn×26) / 26      [advances_taken is capped]
            = pension_fn + (1.5×MPR_fn − pension_fn − 0.5×MPR_fn)
            = MPR_fn
```
for **any** `pension_fn` in `[0, MPR_fn]` — full, nil, or genuinely part-rate — with equality exactly when the window's advances are drawn at the legislated maximum, and strictly above `MPR_fn` for any smaller advance. The inner quantity `headroom_annual − advances_taken` is itself `≥ (MPR_fn − pension_fn) × 26 ≥ 0`, so `max(0, …)` is never actually invoked by a lawful advance — the "greater of MPR" floor in s 1134(1A)(b)(i) is **automatically, always satisfied** by the plain unfloored subtraction, provided the 50% cap holds. **The two candidate readings in T137 (lift the combined payment to MPR, vs. floor only the loan at zero) are not actually different outcomes** — they coincide identically at every point the cap permits. No separate floor-lifting code path exists to disambiguate, because none is needed.

## Worked example (hand-built, labelled as such — no official part-rate advance example exists)
Single, `MPR_fn = $1,200.90` (register §4.2 table), `pension_fn = $700.00/ft` (part-rate). `headroom_annual = (1.5×1200.90 − 700)×26 = 1101.35×26 = $28,635.10`. Cap = `0.5×31,223.40 = $15,611.70`.
- Advance $15,611.70 (the legal maximum): `headroom_remaining = 28,635.10 − 15,611.70 = 13,023.40`; `loan_fn = 500.90`; `combined = 700 + 500.90 = $1,200.90 = MPR_fn` exactly — the floor binds with equality, produced by the plain formula alone.
- Advance $5,000: `loan_fn = (28,635.10−5,000)/26 = 909.04`; `combined = $1,609.04`, comfortably above `MPR_fn`, again with no separate floor step.

## T137 verdict
**The refusal can be lifted.** `heasFortnightlyDrawDuringAdvancePeriod` (`src/data/assumptions/heas.ts:235-241`) is *already* the correct implementation for a genuine part-rate pensioner — it needs no change. The only change needed is to **delete the guard at `src/core/projection.ts:9698-9702`** (the `RangeError` naming T137) and let execution fall through to the existing call at line 9703, *conditional on* `checkHeasDraws` continuing to enforce the 50% annual cap at parse time (`parsePlan.ts:1721`) — the proof above depends on that invariant, not on anything new. Recommend adding a test fixture using the hand-built numbers above (or similar) to `test/core-projection-heas.test.mjs`, since no official part-rate example exists to pin cents against; this doc's numbers are derived, not sourced, and should be labelled as such in the fixture comment.

## UNCONFIRMED
- No official Services Australia or DSS worked example of a part-rate pensioner during an active advance window exists (checked the examples page in full — only George/full-rate and Olli/nil). The resolution above is a derivation from the Act's own defined quantities (MPR, 1.5×, 0.5× cap), not a third cited example — flag this provenance in any commit/register update.
- DSS Guide 3.4.5's current (post-2022, HEAS-era) pages are not retrievable via Wayback (403/no snapshot found for the modern URL structure); 3.4.5.40 used above is the pre-2022 PLS-era guide (100% ceiling, not 150%) and is cited only for the general top-up mechanic, not for advance-period specifics, which it predates.
- The proof assumes `checkHeasDraws`'s cap enforcement has no bypass (e.g. a plan file hand-edited to skip validation reaching `project()` directly); not re-verified here — out of scope for this research pass.
