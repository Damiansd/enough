# P14-2 — 1 Oct 2026 reclassification: verified 2026-09-25 (re-confirms 2026-09-24 pass)

**1) Real, exact date.** Confirmed, effective **1 October 2026**. Re-fetched live via curl
today (HTTP 200 both):
- https://www.health.gov.au/news/personal-care-to-be-fully-funded-under-support-at-home-from-october?language=en
  (published 23 Apr 2026) — quote: "From 1 October 2026, personal care will move from the
  'independence' category to the 'clinical supports' category under Support at Home."
- https://www.myagedcare.gov.au/news-and-updates/support-home-personal-care-contribution-changes
  (last updated 16 June 2026) — same date confirmed.

**2) Scope.** Support at Home only. Personal care (showering, dressing, non-clinical continence
management) moves from the Independence contribution bucket (5–50%) to the Clinical bucket (0%),
so it becomes no-out-of-pocket-cost for participants with it in their support plan. No residential
fee type is named on either page. The 20 Sep 2026 residential fee schedule PDF (checked in the
prior pass) carries no personal-care carve-out — basic daily fee, hotelling contribution, and NCCC
are untouched. CHSP exclusion is still secondary-only (not re-verified against a primary page
today).

**3) Codebase.** Already captured, data-only, not yet wired into any computation:
- `src/data/assumptions/agedCare.ts:337-343` — `SUPPORT_AT_HOME_RECLASSIFICATION_1_OCT_2026`
  config record, `effective: '2026-10-01'`, value is a descriptive string (not a rate), citing
  both URLs above. Comment: "DATA ONLY (P14-2 scope) — no contribution-bucket arithmetic in this
  slice; P14-11 builds the three buckets."
- `src/core/agedCare.ts` and `src/core/projection.ts`: `grep -rn "supportAtHome|reclassification"
  src/core/*.ts` returns nothing — no engine code reads this record. Residential engine functions
  (`agedCareFees`, `agedCareMeansAssessment`, `agedCareRadRetentionDeduction`,
  `agedCareAccommodationPayment`) only consume `AGED_CARE.residentialSchedule`/`mpir`/etc., never
  `supportAtHome`.
- No figure in `agedCare.ts` changes because of this reclassification — it's a bucket move, not a
  rate change, and Support at Home contribution arithmetic isn't built yet (P14-11).

**Verdict**
- changes residential engine: **no**
- changes Support at Home only: **yes** (and only as an unconsumed data note today; no live
  arithmetic exists yet for P14-2 to affect)
