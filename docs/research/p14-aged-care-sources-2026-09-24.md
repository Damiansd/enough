# Phase 14 research — P14-1, P14-2, P14-3 (primary sources, 2026-09-24)

All figures below fetched directly from health.gov.au via `curl -A "<Chrome UA>"` (WebFetch itself
timed out on health.gov.au, confirming concept.md §5.11's earlier note). No legislation.gov.au text
was reached (not attempted — the health.gov.au schedules already cite Aged Care Rules 2025 section
numbers, which is as close to the primary legal text as this pass got).

## P14-1 — the three figure discrepancies: RESOLVED, but superseded by a later indexation

Source: "Schedule of fees and charges for residential care" — health.gov.au publishes a new PDF
every 20 March / 1 July / 20 September. Two relevant versions fetched:
- 1 Jul 2026: https://www.health.gov.au/sites/default/files/2026-07/schedule_of_fees_and_charges_for_residential_care_1_july_2026_v2_0.pdf
- **20 Sep 2026 (current as of today, 2026-09-24)**: https://www.health.gov.au/sites/default/files/2026-09/schedule_of_fees_and_charges_for_residential_care_20_september_2026.pdf

| Figure | concept.md's two candidates | 1 Jul 2026 (confirms which candidate) | **20 Sep 2026 — current today** |
|---|---|---|---|
| Income free area (single) | $35,521.20 vs $35,313.20 | **$35,521.20 was right** | **$36,454.60** |
| Home exemption cap | $214,884 vs $210,555 | **$214,884.00 was right** | **$219,858.40** |
| NCCC daily rate | $107.32 vs $105.30 | **$107.32 was right** | **$109.45** |

So: concept.md's first-listed figure in each pair was already correct as of 1 Jul 2026 — but a
further pension-linked indexation landed **20 Sep 2026** (four days before today), so none of the
three numbers above is what Phase 14 should hard-code today. Use the 20 Sep 2026 column. No repo
config file yet holds these (`grep` across `src/` found nothing — Phase 14 is unbuilt), so there is
nothing to overwrite in code, only in concept.md/register prose.

Quote (20 Sep 2026 PDF, "Rates for 1 November 2025 fee and accommodation arrangements"):
> Basic daily fee $68.93 · Hotelling contribution $22.15 · Non-clinical care contribution $109.45
> ... Income free area (single) $36,454.60 ... First asset threshold / Home exemption cap $219,858.40

## P14-2 — 1 Oct 2026 reclassification: CONFIRMED, but scoped narrower than concept.md implies

Primary sources (both fetched via curl, both live pages):
- https://www.health.gov.au/news/personal-care-to-be-fully-funded-under-support-at-home-from-october?language=en — published 23 April 2026
- https://www.myagedcare.gov.au/news-and-updates/support-home-personal-care-contribution-changes — last updated 16 June 2026

Quote (health.gov.au):
> "From 1 October 2026, personal care will move from the 'independence' category to the 'clinical
> supports' category under Support at Home. This change means participants who have the personal
> care service type approved in their support plan... can receive personal care services at no
> out-of-pocket cost. Personal care services include: showering, dressing, non-clinical continence
> management. The change starts on 1 October 2026. It does not apply to services delivered before
> this date."

**What it changes and what it doesn't:**
- **Support at Home only.** Personal care moves from the Independence bucket (5–50% contribution)
  to the Clinical bucket (0% contribution). This is the only bucket move.
- **Residential care is explicitly untouched.** myagedcare's page on this is under Support at Home
  news; nothing in the 20 Sep 2026 residential fee schedule mentions a personal-care carve-out, and
  a MinterEllison secondary source (search snippet only, not fetched as primary) states residential
  care's "non-clinical care" classification (showering, dressing, continence — i.e. the NCCC) is
  unchanged by this reform.
- **So: hotelling contribution — unaffected. NCCC — unaffected. Support at Home buckets — personal
  care moves Independence → Clinical (0%).** concept.md §5.11's framing ("reclassifying personal
  care to clinical... one month away," listed as an open question against all three fee types) is
  now resolved: it is a Support-at-Home-only change, not a residential-care one.
- Not confirmed: whether CHSP (not yet transitioned into Support at Home) is affected — the
  myagedcare page states explicitly it is not ("The Commonwealth Home Support Programme is not
  expected to transition into Support at Home until at least July 2027" — this line is from a
  WebSearch snippet, not independently re-verified on a fetched page; flag as **secondary-only**
  for that one clause).

## P14-3 — current rates as of 20 Sep 2026 indexation

All from the 20 Sep 2026 residential schedule PDF above unless noted.

**Residential care:**
- Basic daily fee: **$68.93/day**
- Hotelling contribution: **$22.15/day max, no cap** (unchanged from 1 Jul 2026 — did not move with
  this indexation round; confirmed by identical figure in both PDFs)
- NCCC: **$109.45/day max/cap**; lifetime cap **$140,652.80**; **4-year cap also applies** — quote:
  "A four-year cap also applies to the non-clinical care contribution. The fee ceases after a person
  pays it for four years, even if they have not reached the lifetime cap amount." (matches TODO's
  "$130k indexed?" question — the actual figure is $140,652.80, not $130k; $130k appears to be a
  round-number guess that should be dropped)
- MPIR: **8.43%** for 1 Jul–30 Sep 2026, rising to **8.51%** from 1 Oct–31 Dec 2026 (both in the
  same PDF's interest-rate table). As of today, 8.43% is current; 8.51% takes effect in 6 days.
- Means-assessment thresholds (residential, single person): income free area $36,454.60; asset free
  area $66,500.00; first asset threshold / home exemption cap $219,858.40; max RAD without pricing
  approval $789,686.
- Deeming (residential): thresholds $66,800 single / $110,600 couple (from 1 Jul 2026); rates 1.75%
  lower / 3.75% higher (from 20 Sep 2026).
- **Grandfathering, primary-confirmed via the same PDF's own three-tier structure**: the schedule
  itself is split into "Rates for 1 November 2025 fee and accommodation arrangements" (new,
  hotelling + NCCC), "Rates for post 1 July 2014 fee and accommodation arrangements" (old means
  tested care fee, for anyone who entered 1 Jul 2014–31 Oct 2025 and didn't opt in — lifetime cap
  **$88,934.57**, annual cap **$37,055.98**, both indexed 20 Sep 2026), and "Rates for pre 1 July
  2014 fee and accommodation arrangements" (a third, older tier still running). This is a stronger,
  more precise primary confirmation than concept.md's "$86,185.23 / $35,910.43" pair, which were the
  1 Jul 2026 (not 20 Sep 2026) values for the same two caps — those numbers were right for their
  date, now superseded.
- **RAD retention**: confirmed primary, https://www.health.gov.au/our-work/residential-aged-care/charging/rad-and-rac-retention
  — quote: "The amount to be deducted is calculated daily at a rate of 2% per annum and it is
  limited to 5 years." (Legal basis cited on-page as the Aged Care Act 2024, no section number
  given; Aged Care Rules 2025 s 287-155 is cited elsewhere in the schedule PDF for a related interest
  provision, not this one.) Retention only applies to residents on 1-Nov-2025 arrangements who
  entered on/after 1 Nov 2025 (or opted in) — confirms concept.md's "applies to new entrants" but
  the primary page phrases it by arrangement/entry-date, not simply "new entrants."
  concept.md's "max 10%" (5 years × 2%) is arithmetically consistent but not stated verbatim on the
  page — flag as **derived, not quoted**.

**Support at Home** (all from https://www.health.gov.au/sites/default/files/2026-09/schedule-of-contributions-for-support-at-home-services_0.pdf, "from 20 September 2026", and https://www.health.gov.au/our-work/support-at-home/funding-for-support-at-home/funding-classifications-for-support-at-home — "Current as of 1 July 2026"):
- **8 classifications, annual budgets (current as of 1 Jul 2026, next indexed 1 Jul 2027)**:
  1: $11,010.01 · 2: $16,451.35 · 3: $22,536.81 · 4: $30,468.51 · 5: $40,729.53 · 6: $49,365.27 ·
  7: $59,660.00 · 8: $80,137.12 — this **updates concept.md's "$10,731 to $78,106"**, which was the
  1 Nov 2025 launch figure; both are primary-sourced, just for different dates.
- **Three contribution buckets, standard rates**: Clinical 0% (everyone); Independence 5%–50% (full
  pensioner 5%, part pensioner/CSHC holder 5–50% on assessment, self-funded retiree 50%); Everyday
  Living 17.5%–80% (full pensioner 17.5%, part pensioner/CSHC 17.5–80%, self-funded retiree 80%).
  Matches concept.md's "5–50% / 17.5–80%" ranges exactly, primary-confirmed.
- **NWOP (no-worse-off, pre-12-Sep-2024 HCP-approved) rates**: Clinical 0%, Independence 0–25%,
  Everyday Living 0–25%, all pensioner tiers — a materially cheaper track than standard, not
  mentioned in concept.md at all. **This is new information Phase 14 should register.**
- **Lifetime cap, standard rates**: $140,652.80 — and this is explicitly **the same combined cap**
  as the residential NCCC lifetime cap (quote, health.gov.au participant-contributions page: "This
  is a combined cap with the non-clinical care contribution for residential aged care"). This
  resolves TODO's "$130k indexed?" question for Support at Home too — no $130k figure exists in any
  primary source found; it appears to have been a placeholder guess.
- **NWOP lifetime cap**: $88,934.57 — same figure as the grandfathered residential means-tested-care-fee
  lifetime cap (same combined-cap logic, not independently re-quoted but numerically identical,
  consistent with one combined cap per grandfathering track).
- Support at Home income/asset thresholds for Independence/Everyday Living contributions and
  deeming rates: captured in full in the fetched schedule (single non-pension income threshold
  $5,876–$105,048; single homeowner asset threshold $333,000–$968,717.95; deeming 1.75%/3.75% on
  $66,800 single / $110,600 couple-with-pension / $55,300 couple-no-pension).
- **Grandfathering for pre-1 Nov 2025 entrants (Support at Home)**: primary-confirmed as the NWOP
  track above — applies to anyone "receiving a Home Care Package, on the National Priority System,
  or approved as eligible for a package" on 12 Sep 2024, not simply "entered before 1 Nov 2025." The
  cutoff date that matters is **12 Sep 2024** (approval/waitlist status), not 1 Nov 2025 — a
  correction to how TODO P14-12 currently frames the grandfathering date.

## Unconfirmed / not reached this pass

- **Aged Care Act 2024 / Aged Care Rules 2025 full text on legislation.gov.au** — not fetched; every
  figure above comes from health.gov.au administrative schedules that cite the Rules by section
  number in places, not from the primary legal text itself. Treat rate figures as confirmed-by-
  regulator-publication, not confirmed-against-statute-text.
- **CHSP exclusion from the 1 Oct 2026 change** — secondary-only (WebSearch snippet), not
  independently verified on a fetched primary page.
- **RAD retention "max 10%"** — arithmetic inference (2%/yr × 5yr), not a quoted primary figure.
- servicesaustralia.gov.au was not queried this pass (health.gov.au and myagedcare.gov.au covered
  every figure needed); no gap currently traces back to a missing Services Australia figure.

## What Phase 14 can safely build now vs. what's still open

**Buildable now, primary-sourced, dated 20 Sep 2026 (today's effective rates):**
basic daily fee, hotelling rate (uncapped), NCCC rate/lifetime cap/4-year cap, MPIR (current +
next-quarter), residential means-assessment income/asset thresholds and home exemption cap, the
three-tier grandfathering structure and its two old-regime caps, RAD retention rate/duration/who-
it-applies-to, all three Support at Home contribution buckets (standard and NWOP) with their
income/asset thresholds and both lifetime caps, and the 8 classification budgets (1 Jul 2026
vintage). The 1 Oct 2026 reclassification is confirmed and scoped: Support at Home only, moves
personal care Independence→Clinical, leaves residential hotelling/NCCC untouched.

**Still open before coding:**
statute-level confirmation from legislation.gov.au (only administrative schedules were used); the
CHSP-exclusion clause (secondary-only); and a decision on how the model will re-source these
figures going forward, since three indexation dates a year (20 Mar / 1 Jul / 20 Sep) means whatever
is hard-coded today is stale again within months — the repo will need the same kind of dated-config
+ indexation-function pattern already used for the Age Pension thresholds (register O74), not a
one-time constant.
