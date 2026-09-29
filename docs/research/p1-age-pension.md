# P1 — Age Pension figures for the `enough` forecaster

**Retrieval date: 2026-09-03.** All figures below were retrieved on that date.
**Verdict up front: the 20 September 2026 reindexation IS published. P1-5 can be closed today.**

The DSS rates list for 20 September 2026 was published **20 August 2026** and was retrieved
successfully as a primary source. Deeming rates for the same date were determined by the Minister
for Social Services and published by the Australian Government Actuary on 31 July 2026.

---

## 0. Source access log (fetch reality, 2026-09-03)

| Source | Result |
|---|---|
| `servicesaustralia.gov.au` | **WORKS via `curl`** with a browser User-Agent. `WebFetch` times out (60s). Use `curl`. |
| `dss.gov.au` (main site + `/system/files/` PDFs) | **WORKS via `curl`.** PDFs download cleanly. |
| `aga.gov.au` (Australian Government Actuary) | **WORKS via `curl`.** |
| `dva.gov.au` | **WORKS via `curl`.** |
| `guides.dss.gov.au` (Social Security Guide) | **403 to both `curl` and `WebFetch`.** Content only reachable via search-engine snippets. |
| `ministers.dss.gov.au` | **403 to both `curl` and `WebFetch`.** |
| `austlii.edu.au` (all mirrors) | **403 — Cloudflare block.** |
| `legislation.gov.au` | Fetches, but the consolidated Act is served in volumes; s1195 was not in the volume returned. Not confirmed directly. |

**Practical note for future passes:** the previously-recorded "servicesaustralia.gov.au times out"
is a `WebFetch` limitation, not a site block. `curl -A "<browser UA>"` retrieves it fine. This
materially changes what can be primary-verified in this project.

---

## 1. The three-period structure — read this before coding anything

The concept.md table treats "20 Mar–19 Sep 2026" as one period. **It is two.** Different parameters
index on different dates, so the first period of the forecast contains three distinct parameter sets:

| Indexed thing | Indexation date(s) | Index used |
|---|---|---|
| Maximum basic rate | 20 Mar, 20 Sep | higher of CPI / PBLCI, then MTAWE-benchmarked |
| Pension Supplement | 20 Mar, 20 Sep | CPI only |
| Energy Supplement | **never** | not indexed |
| Income free area | **1 July** | CPI (March quarter ref) |
| Assets free areas (homeowner + non-homeowner) | **1 July** | CPI (December quarter ref) |
| Deeming thresholds | **1 July** | CPI |
| Deeming rates | irregular, by Ministerial determination | AGA recommendation, not an index |
| Income and assets **cut-offs** ("reduction limits") | 20 Mar, 20 Sep, **and move again 1 July** | derived: free area + (rate ÷ taper) |

· source · https://www.dva.gov.au/access-benefits/pensions-and-payments/ready-reckoners/indexation-of-income-support-pensions-and-allowances · retrieved 2026-09-03 · **primary-verified** (Commonwealth department)
· cross-check · https://www.servicesaustralia.gov.au/assets-test-for-age-pension — "The Department of Social Services reviews these limits and cut off points in **March, July and September** each year." · **primary-verified**

So the model needs three parameter sets to cover 20 Mar 2026 → 19 Mar 2027:

1. **20 Mar 2026 – 30 Jun 2026** — new rates, old free areas
2. **1 Jul 2026 – 19 Sep 2026** — same rates, new free areas, new cut-offs, new deeming thresholds
3. **20 Sep 2026 – 19 Mar 2027** — new rates, same free areas, new cut-offs, new deeming rates

---

## 2. P1-5 — Payment rates

### 2.1 Maximum rates, 20 March 2026 – 19 September 2026

All per fortnight. Effective date **2026-03-20**.

| Name | Single | Couple (each) | Couple (combined) | Config constant |
|---|---|---|---|---|
| Maximum basic rate | $1,100.30 | $829.40 | $1,658.80 | `agePension.basicRate` |
| Pension Supplement — maximum | $86.50 | $65.20 | $130.40 | `agePension.pensionSupplementMax` |
| Pension Supplement — basic amount | $30.10 | $24.80 | $49.60 | `agePension.pensionSupplementBasic` |
| Pension Supplement — minimum amount | $46.60 | $35.10 | $70.20 | `agePension.pensionSupplementMin` |
| Energy Supplement | $14.10 | $10.60 | $21.20 | `agePension.energySupplement` |
| **Total** | **$1,200.90** | **$905.20** | **$1,810.40** | `agePension.maxRateTotal` |

· source (primary) · https://www.servicesaustralia.gov.au/how-much-age-pension-you-can-get (page last updated 19 June 2026) · retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.dss.gov.au/system/files/documents/2026-08/rates-list-20-september-2026.pdf — carried as the "Previous Amount" column · **primary-verified**
· cross-check (secondary) · https://www.superguide.com.au/in-retirement/age-pension-rates — matches to the cent

Transitional rate (not applicable to this Household — no pre-2009 pensioner — recorded for completeness):
single $963.60 + $14.10 = $977.70; couple each $778.20 + $10.60 = $788.80.

### 2.2 Maximum rates, from 20 September 2026 — **PUBLISHED**

All per fortnight. Effective date **2026-09-20**.

| Name | Single | Couple (each) | Couple (combined) | Increase (single / each) |
|---|---|---|---|---|
| Maximum basic rate | $1,135.40 | $855.90 | $1,711.80 | +$35.10 / +$26.50 |
| Pension Supplement — maximum | $88.20 | $66.50 | $133.00 | +$1.70 / +$1.30 |
| Pension Supplement — basic amount | $30.70 | $25.30 | $50.60 | +$0.60 / +$0.50 |
| Pension Supplement — minimum amount | $47.50 | $35.80 | $71.60 | +$0.90 / +$0.70 |
| Energy Supplement | $14.10 | $10.60 | $21.20 | nil (not indexed) |
| **Total** | **$1,237.70** | **$933.00** | **$1,866.00** | +$36.80 / +$27.80 |

· source (primary) · https://www.dss.gov.au/system/files/documents/2026-08/rates-list-20-september-2026.pdf — "Social Security Payment Parameters, 20 September 2026 indexation, Rates", published 20 Aug 2026 · retrieved 2026-09-03 · **primary-verified**
· source page (primary) · https://www.dss.gov.au/income-support-payments/resource/indexation-rates-september-2026 — "Date published: 20 August 2026" · **primary-verified**
· cross-check (secondary) · https://www.superguide.com.au/in-retirement/age-pension-rates — matches to the cent

**Terminology warning against concept.md §5.5.** The concept.md row labelled "Couple rate (each /
combined) $905.20 / $1,810.40" is the **total including supplements**, not the maximum basic rate.
The maximum basic rate is $829.40 / $1,658.80. Because only the basic rate is MTAWE-benchmarked and
only the Pension Supplement is CPI-indexed, the model must hold these as **three separate
constants**, not one blended number, or the 40-year projection will drift.

**Non-resident note (not applicable now, relevant to any "move overseas" Scenario):** from
20 September 2026 pensioners paid outside Australia lose the Pension Supplement basic amount
entirely ($30.10 → $0.00 single). · same DSS PDF · **primary-verified**

---

## 3. P1-5 — Income test

### 3.1 Free areas — effective 2026-07-01, unchanged on 20 Sep 2026

| Name | Value | Config constant |
|---|---|---|
| Income free area — single | $226.00 / fortnight | `agePension.incomeFreeArea.single` |
| Income free area — couple combined | $396.00 / fortnight | `agePension.incomeFreeArea.coupleCombined` |

· source (primary) · https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf ("Pension — Income free areas": single $218.00 → $226.00; couple combined $380.00 → $396.00) · retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/income-test-for-age-pension (page last updated 1 July 2026) · **primary-verified**

Previous values, effective 2026-03-20 to 2026-06-30: single **$218.00**, couple combined **$380.00**.

### 3.2 Taper rate

| Name | Value | Config constant |
|---|---|---|
| Income taper — single | **50 cents per $1** over the free area | `agePension.incomeTaper` |
| Income taper — couple | **50 cents per $1** of *combined* income over the combined free area, i.e. **25 cents per $1 reducing each person's payment** | same constant, applied combined-then-halved |

· source (primary) · https://www.servicesaustralia.gov.au/income-test-for-age-pension — verbatim: single "Over $226 | 50 cents for each dollar over $226"; couple "Combined income per fortnight | **Amount each person's pension will reduce by** | Over $396 | 25 cents for each dollar over $396" · retrieved 2026-09-03 · **primary-verified**

This is the direct primary confirmation of concept.md's "combined means, then halved" rule. Encode
the taper as 50c on combined income producing a combined reduction; halving is a presentation step.

(Transitional rate taper is 40c single / 20c each — not applicable.)

### 3.3 Income cut-off (disqualifying limit)

| Effective | Single | Couple combined | Couple illness-separated |
|---|---|---|---|
| 2026-03-20 | $2,619.80 | $4,000.80 | $5,183.60 |
| 2026-07-01 | $2,627.80 | $4,016.80 | $5,199.60 |
| **2026-09-20** | **$2,701.40** | **$4,128.00** | **$5,346.80** |

· source (primary) · DSS rates lists for 1 July 2026 and 20 September 2026 (URLs above) · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/income-test-for-age-pension for the current (1 Jul) values · **primary-verified**

**Arithmetic check (passes exactly):** ($2,701.40 − $226.00) × 0.50 = $1,237.70 = the single total
rate. ($4,128.00 − $396.00) × 0.50 = $1,866.00 = the couple combined total rate. The cut-off is a
derived value, not an independent constant — **derive it in the engine, do not hard-code it.**

---

## 4. P1-5 — Assets test

### 4.1 Free areas — effective 2026-07-01, unchanged on 20 Sep 2026

| Name | Homeowner | Non-homeowner | Config constant |
|---|---|---|---|
| Assets free area — single | $333,000 | $600,000 | `agePension.assetsFreeArea.single.*` |
| Assets free area — couple combined | $499,000 | $766,000 | `agePension.assetsFreeArea.coupleCombined.*` |
| Assets free area — couple, one partner eligible, combined | $499,000 | $766,000 | same as couple combined |

· source (primary) · https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf ("Pension — Assets free areas — Homeowner": single $321,500 → $333,000; couple $481,500 → $499,000. "Non-homeowner": single $579,500 → $600,000; couple $739,500 → $766,000) · retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/assets-test-for-age-pension (page last updated 1 July 2026) — identical · **primary-verified**

Previous values, effective 2026-03-20 to 2026-06-30: homeowner single **$321,500**, couple
**$481,500**; non-homeowner single **$579,500**, couple **$739,500**.

### 4.2 Taper rate — CONFIRMED

| Name | Value | Config constant |
|---|---|---|
| Assets taper | **$3.00 per fortnight per $1,000** of combined assets above the free area | `agePension.assetsTaper` |

· source (primary, derived) · exact arithmetic against the published 20 Sep 2026 figures:
  · single: ($745,750 − $333,000) = $412,750 excess → ÷1000 × $3.00 = $1,238.25, and the cut-off is the rounded-up-to-$250 point at which the $1,237.70 total rate is extinguished ($1,237.70 ÷ 3 × 1000 = $412,566.67 → $412,750). ✔
  · couple: ($1,121,000 − $499,000) = $622,000 excess → ÷1000 × $3.00 = **$1,866.00 exactly** = the couple combined total rate. ✔
· note · Services Australia does **not** state the $3.00 figure on the assets test page; the Social Security Guide (4.2.3) does but is 403-blocked. The arithmetic above closes it beyond reasonable doubt against two primary-published numbers, so this is recorded as **primary-verified (by exact derivation)**. A verbatim primary quotation of "$3.00 per $1,000" remains outstanding — see unverified list.

### 4.3 Assets cut-off (disqualifying limit)

| Effective | | Single | Couple combined | Couple, one eligible | Couple illness-sep. |
|---|---|---|---|---|---|
| 2026-03-20 | Homeowner | $722,000 | $1,085,000 | $1,085,000 | $1,282,500 |
| 2026-03-20 | Non-homeowner | $980,000 | $1,343,000 | $1,343,000 | $1,540,500 |
| 2026-07-01 | Homeowner | $733,500 | $1,102,500 | $1,102,500 | $1,300,000 |
| 2026-07-01 | Non-homeowner | $1,000,500 | $1,369,500 | $1,369,500 | $1,567,000 |
| **2026-09-20** | **Homeowner** | **$745,750** | **$1,121,000** | **$1,121,000** | **$1,324,500** |
| **2026-09-20** | **Non-homeowner** | **$1,012,750** | **$1,388,000** | **$1,388,000** | **$1,591,500** |

· source (primary) · DSS rates lists for 1 July 2026 and 20 September 2026 · retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/assets-test-for-age-pension for the 1 Jul values · **primary-verified**
· cross-check (secondary) · SuperGuide — matches the 20 Sep 2026 set exactly

concept.md's $1,121,000 couple homeowner cut-off from 20 Sep 2026 is **confirmed correct**.
Again: derive, don't hard-code. Cut-offs are higher if Rent Assistance is payable (not applicable —
owner-occupier).

---

## 5. P1-9 — Non-homeowner thresholds and homeowner status

### 5.1 The differential — CONFIRMED, and concept.md's estimate is stale

| Name | Value | Effective | Config constant |
|---|---|---|---|
| Extra allowable amount (non-homeowner minus homeowner assets free area) | **$267,000** | 2026-07-01 | `agePension.extraAllowableAmount` |

Previous value: **$258,000** (to 2026-06-30).

· source (primary) · https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf — "Pension — Retirement village and granny flat residents — Extra allowable amount: $258,000 → $267,000". Verbatim note in the PDF: *"non-homeowners have a higher assets test free area than homeowners. The difference between the two free areas is the extra allowable amount. It is used to assess homeownership in retirement villages and granny flat arrangements."* · retrieved 2026-09-03 · **primary-verified**

concept.md's "~$250k" is **wrong for the current period** — it is $267,000, and it moved $9,000 on
1 July 2026. It is a single indexed constant that drives both non-homeowner free areas
($333,000 + $267,000 = $600,000; $499,000 + $267,000 = $766,000 — both exact). Model it as one
constant plus an offset, not as two independent series.

### 5.2 What defines homeowner status

A person is a homeowner if they (or their partner) have a right or interest in the home they occupy
that gives reasonable security of tenure. The principal home and up to the first **2 hectares** of
adjacent land on the same title are **exempt** from the assets test.

· source (primary) · https://www.servicesaustralia.gov.au/assets-test-for-age-pension — "We include most real estate assets you own in your assets test. This generally doesn't include your principal home and up to the first 2 hectares of land it's on." · retrieved 2026-09-03 · **primary-verified**
· note · The retirement-village / granny-flat homeowner test (entry contribution above/below the extra allowable amount) is the specific rule the extra allowable amount serves; the general test (security of tenure) is stated in Social Security Guide 4.6.3, which is 403-blocked. See unverified list.

**Relevance to this Household:** owner-occupied with a mortgage → **homeowner**, free area $499,000
combined, home exempt, mortgage debt is *not* deductible from other assets (it is only netted
against the asset it secures, which is itself exempt). This is the correct and important asymmetry.

---

## 6. P1-5 — Deeming

### 6.1 Thresholds — effective 2026-07-01 (indexed 1 July, CPI)

| Name | Value | Config constant |
|---|---|---|
| Deeming threshold — single | $66,800 | `agePension.deemingThreshold.single` |
| Deeming threshold — couple combined (at least one on a pension) | $110,600 | `agePension.deemingThreshold.coupleCombined` |
| Deeming threshold — member of a couple, **neither** on a pension | $55,300 each | `agePension.deemingThreshold.coupleNeitherPensioner` |

· source (primary) · https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf — "Deeming Thresholds: Single $64,200 → $66,800; Couple (combined) $106,200 → $110,600" · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/deeming (page last updated 1 July 2026) — states all three, including $55,300 · **primary-verified**

Previous values, to 2026-06-30: single **$64,200**, couple combined **$106,200**.
concept.md's $110,600 couple threshold is **confirmed correct**.

### 6.2 Rates

| Effective | Lower rate (below threshold) | Upper rate (above threshold) |
|---|---|---|
| 2020-05-01 – 2025-09-19 | 0.25% | 2.25% |
| 2025-09-20 – 2026-03-19 | 0.75% | 2.75% |
| 2026-03-20 – 2026-09-19 | 1.25% | 3.25% |
| **2026-09-20 onward** | **1.75%** | **3.75%** |

Config constants: `agePension.deemingRate.lower`, `agePension.deemingRate.upper`.

· source for 20 Sep 2026 (primary) · https://aga.gov.au/publications/deeming-rate-recommendation-september-2026 — verbatim: *"From 20 September 2026, the AGA recommended, and the Minister for Social Service determined that the new deeming rates are: 1.75% for financial assets below the threshold; 3.75% for financial assets above the threshold."* · retrieved 2026-09-03 · **primary-verified** (Minister's determination confirmed, not merely a recommendation)
· source (primary) · https://aga.gov.au/sites/aga.gov.au/files/sites/aga.gov.au/files/publications/2026-08/p2026-799305.pdf — AGA letter to the Minister for Social Services dated 31 July 2026, tabulating "Applicable to 19 September 2026: 1.25% / 3.25%" against "Recommended from 20 September 2026: 1.75% / 3.75%" · **primary-verified**
· source for current (primary) · https://www.servicesaustralia.gov.au/deeming (page last updated 1 July 2026) — 1.25% / 3.25% · **primary-verified**
· cross-check for the freeze history (secondary, adviser-grade) · https://www.challenger.com.au/adviser/knowledge-hub/Articles/The-new-deeming-rates — confirms the 1 May 2020 freeze at 0.25%/2.25% and the 20 Sep 2025 step to 0.75%/2.75% · **secondary-only** for the 2020–2025 rows above

concept.md's "1.75% / 3.75% from 20 Sep 2026" is **confirmed correct and now primary-verified.**

### 6.3 The freeze — status and forward mechanism (the part that matters for 40 years)

- Rates were frozen at 0.25% / 2.25% from **1 May 2020** as a COVID measure, with a Government
  commitment to hold them **until 30 June 2025**. **The freeze has ended.**
- Since then the Government has committed to a **gradual reset**. Three steps have occurred, each
  **+0.50% to both rates**: 20 Sep 2025, 20 Mar 2026, 20 Sep 2026.
- **From 2026 the Australian Government Actuary reviews the rates at least every six months** and
  recommends to the Minister, guided by the published *Objectives and Principles for Advice on the
  Deeming Rates*. **The Minister retains the power to set the rates by legislative instrument under
  the Social Security Act 1991; the AGA cannot change them.**
- The AGA states it has **capped each recommended increase at 0.5%**, and that the upper rate
  remains "well below the estimated overall earning rate", explicitly to honour the gradual-reset
  commitment. It also warns: *"Current earning rates are not necessarily an indication of where the
  deeming rates may settle in the longer term."*

· source (primary) · AGA letter + explanatory statement, 31 July 2026 (URL above) · **primary-verified**
· source (primary) · https://www.dss.gov.au/income-support-payments/social-security-deeming-rates — *"The Minister for Social Services sets the deeming rates. From 2026 onwards, the Australian Government Actuary makes recommendations to the Minister on future deeming rates."* · **primary-verified**
· source (primary) · https://www.dss.gov.au/system/files/documents/2026-01/objectives-and-principles-advice-deeming-rates-19-01-2026.pdf (referenced, not fetched)

**Modelling implication.** There is **no legislated formula and no announced terminal rate**. The
deeming rate is a discretionary political input on a six-monthly review cycle currently trending
+0.5% per step. It must be a **user-editable Setting with a scenario lever**, not a hard-coded
constant and not an indexed series. For this Household — whose entire assessable wealth becomes
deemed financial assets once both reach 67 — the deeming rate is arguably the single most
sensitive Age Pension input in the model.

---

## 7. P1-5 — The indexation mechanism (project this, not the dollar figure)

**The rule, in order:**

1. Take the **combined couple maximum basic rate**. Index it by the **higher of the CPI and the
   PBLCI** movement for the period.
2. Compare the result to the **combined couple benchmark = 41.76% of the annualised MTAWE figure**.
   If it is lower, raise it to that benchmark.
3. Set the **single ("not a member of a couple") maximum basic rate at 66.33% of the combined
   couple rate**. This ratio is maintained over time and through indexation.
4. Index the **Pension Supplement by CPI only** — it is *not* MTAWE-benchmarked.
5. The **Energy Supplement is not indexed at all.**

| Name | Value | Config constant |
|---|---|---|
| Combined couple MTAWE benchmark | **41.76%** of annualised MTAWE | `agePension.mtaweBenchmarkCouple` |
| Single-to-combined-couple basic rate ratio | **0.6633** (66.33%) | `agePension.singleCoupleRatio` |
| Effective single benchmark | ~27.7% of MTAWE (derived: 0.4176 × 0.6633) | derived, do not store |
| Annualised MTAWE figure | 52 × the ABS *Average Weekly Earnings, States and Australia* MTAWE amount | input series |
| MTAWE reference quarter | December quarter for the 20 March indexation; June quarter for the 20 September indexation | — |
| CPI/PBLCI reference quarters | December (for 20 Mar) and June (for 20 Sep); base quarter is the **highest** June or December quarter before the reference quarter | — |

· source (primary) · https://www.dva.gov.au/access-benefits/pensions-and-payments/ready-reckoners/indexation-of-income-support-pensions-and-allowances — verbatim: *"The MBR is first increased in line with movements in the CPI and the PBLCI. The index that shows the higher increase is used to increase the MBR of the 'combined couple' rate of pension. The 'combined couple' rate is then compared to **41.76% of MTAWE**, and increased if necessary to equal that amount. The 'not a member of a couple' rate of pension is then fixed at **66.33%** of the 'combined couple' rate."* and *"The pension supplement is indexed in line with movements in the CPI only."* · retrieved 2026-09-03 · **primary-verified** (Commonwealth department; the Age Pension and DVA service pension share the identical indexation machinery in the Social Security Act 1991)
· source (primary-in-substance, reached only via search snippet — direct fetch 403) · Social Security Act 1991 s1195, "the combined couple benchmark for an indexation day is 41.76% of the annualised MTAWE figure"; DSS Social Security Guide 5.1.8.50 and 5.2.2.10, *"From 20 September 2009, pensioners in the family situations above received a maximum basic rate (MBR) equal to 66.33% of that paid to a couple combined… so that the new single to couple ratio of 0.6633… is maintained over time and after indexation."* · **secondary-only** as retrieved (see Discrepancies/Unverified)

**Arithmetic check against the published figures (passes):**
20 Sep 2026 single basic $1,135.40 ÷ combined couple basic $1,711.80 = **0.66327** → 66.33% ✔
20 Mar 2026: $1,100.30 ÷ $1,658.80 = **0.66332** ✔

**Which components are and are not benchmarked — this is the load-bearing bit for a 40-year run:**

| Component | Indexed by | MTAWE-benchmarked? | Long-run real behaviour |
|---|---|---|---|
| Maximum basic rate | higher of CPI/PBLCI, floored at 41.76% MTAWE (combined) | **Yes** | tracks **wages** in the long run — grows in real terms if wages outpace CPI |
| Pension Supplement | CPI only | **No** | flat in real terms |
| Energy Supplement | nothing | **No** | **decays to nothing in real terms** |
| Income & assets free areas | CPI (1 July) | **No** | flat in real terms |
| Deeming thresholds | CPI (1 July) | **No** | flat in real terms |
| Deeming rates | Ministerial discretion | n/a | unmodellable from a formula |

**Consequence the forecaster must get right:** over 40 years, if the model indexes the whole Age
Pension payment at CPI it will **understate** it (the basic rate, ~92% of the payment, follows
MTAWE). If it indexes the whole payment at wage growth it will **overstate** it (the supplements do
not). And because the **free areas and deeming thresholds are CPI-only while the payment is
wage-linked**, the means tests bite progressively harder in real terms every year — the taper
starts at a real income/asset level that falls relative to wages, indefinitely. That structural
drift is a first-order effect over a 40-year horizon and cannot be captured by a single
"indexation" Setting.

**Observation, flagged as an observation not a finding:** the 20 Sep 2026 maximum basic rate rose
**3.20%** in six months ($829.40 → $855.90). That is well above plausible six-month CPI, which
suggests the MTAWE benchmark (step 2) was the binding constraint at this indexation rather than
CPI/PBLCI. Not confirmed — the DSS resource publishes rates, not the factors used. See unverified list.

---

## 8. P1-8 — Work Bonus — CLOSED

| Name | Value | Effective | Config constant |
|---|---|---|---|
| Starting balance, new claimant of an eligible payment | **$4,000** | current (page updated 2026-07-21) | `workBonus.startingBalance` |
| Fortnightly accrual | **$300** per fortnight | current | `workBonus.fortnightlyAccrual` |
| Maximum accumulated balance | **$11,800** | current | `workBonus.maxBalance` |
| Applies per | **Person**, never per Household | current | — |

· source (primary) · https://www.servicesaustralia.gov.au/work-bonus-balance (page last updated 21 July 2026) — verbatim: *"When you claim an eligible payment for the first time, you'll start with a Work Bonus balance of $4,000."* and *"You'll accrue $300 to your Work Bonus balance each fortnight, up to a maximum of $11,800."* · retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/how-work-bonus-works — *"You'll have $300 credit added to your Work Bonus balance each fortnight. The maximum Work Bonus balance you can accrue is $11,800 credit."* · **primary-verified**

**concept.md's open TODO "Work Bonus $4,000 starting balance for new pensioners not re-confirmed" is now closed — the figure is correct.**

### 8.1 What income it applies to

- **Applies to: employment income and self-employment income "earned from active participation".**
  Work Bonus eligible income *"includes wages, salary and other employment income."*
- **Does NOT apply to investment income.** Investment income is assessed under deeming and is
  outside the definition of Work Bonus eligible income. The "active participation" qualifier on
  self-employment income exists precisely to exclude passive/investment returns.
- Accrues **whether or not you work** — an eligible pensioner who never works still banks $300/ft to
  the $11,800 ceiling, available if they later start work.
- If eligible income in a fortnight is **less than $300**, it is reduced to zero and the remainder
  of that fortnight's $300 is added to the balance.
- The balance is applied to eligible income **before** the income test.

· source (primary) · https://www.servicesaustralia.gov.au/how-work-bonus-works — *"We apply the Work Bonus to employment and self-employment income."*; *"If you work, we'll apply your Work Bonus balance to offset your Work Bonus eligible income. We'll do this before we apply the income test."*; *"If you don't work, you'll have $300 credit added to your Work Bonus balance each fortnight until it reaches the maximum of $11,800."* · **primary-verified**

### 8.2 Per person, not per couple — CONFIRMED

· source (primary) · https://www.servicesaustralia.gov.au/work-bonus-and-your-partners-income (page last updated 10 March 2026) — verbatim: *"**You can't use your Work Bonus for your partner's wages or partner's self-employment income earned from active participation.** However, applying the Work Bonus to your wages or self-employment income earned from active participation will affect your combined income. This means your partner may benefit from the reduced amount of your assessable income for the income test."* · **primary-verified**

Each Person has their own balance. The *benefit* flows to the Household because the income test is
combined — but the balance is never poolable. Same shape as every other per-Person cap in this model.

### 8.3 Eligibility

Must be **of Age Pension age** and receiving Age Pension, Carer Payment, or Disability Support
Pension. **Not available on the transitional rate of pension.**

· source (primary) · https://www.servicesaustralia.gov.au/who-can-get-work-bonus · **primary-verified**

### 8.4 Historical note (do not apply to future claims)

A separate **one-off $4,000 boost** applied to claims lodged between 1 December 2022 and
30 June 2024. It is spent. A re-claimant's existing balance carries over and may be topped up to
$4,000 if it has not been topped up in the last 2 years. Neither affects a first-time claim, which
simply starts at $4,000. · same source · **primary-verified**

---

## 9. Account-Based Pension treatment — CONFIRMED

| Test | Treatment | Config |
|---|---|---|
| **Assets test** | Assessed at the **account balance** | `abp.assetsTest = 'accountBalance'` |
| **Income test** | Assessed as a **financial asset under the deeming rules** | `abp.incomeTest = 'deemed'` |

· source (primary) · https://www.servicesaustralia.gov.au/income-streams (page last updated 26 May 2026) — Assets test: *"If the income stream has an account balance, the assessable asset value is the account balance."* Income test: *"we treat account based income streams as financial assets and use the deeming rules if you either: purchased the income stream on or after 1 January 2015; didn't get your pension or allowance payments from us for any reason after 31 December 2014."* · retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/superannuation — *"We count your superannuation both: in the assets test - the value is the balance on your latest statement; in the income test under the deeming rules."* · **primary-verified**

concept.md §5.5 is **confirmed correct** on this point.

### 9.1 Grandfathering — the exact test (both limbs required)

An Account-Based Pension is assessed on the old **deductible amount** basis (gross payment less the
deduction amount) **only if BOTH**:

1. the income stream **started before 1 January 2015**, **and**
2. the recipient has been **on a pension or allowance without a break since 31 December 2014**.

If either limb fails — commenced on/after 1 Jan 2015, **or** any break in payment after
31 Dec 2014 — deeming applies.

· source (primary) · https://www.servicesaustralia.gov.au/income-streams · **primary-verified**

**Applies to this Household: no.** Neither Person can hold a pre-2015 Account-Based Pension while
also having been continuously on an income support payment since 2014. Grandfathering is
**structurally unreachable** here. It should be modelled as a **hard `false`, not a Setting** —
exposing it as a toggle invites a silent, undetectable overstatement of Age Pension.

---

## 10. Younger-partner exemption — CONFIRMED, and the trigger is Age Pension age

**The rule.** Superannuation in **Accumulation Phase** held by a Person **under Age Pension age** is
exempt from **both** the assets test and the income test — **including where the couple's means are
being assessed for the older partner's claim.**

**The trigger is the earlier of:**
- the younger Person reaching **Age Pension age (67)** — *not* 60, not preservation age, not 65; **or**
- the fund **starting to pay them a superannuation income stream** (at which point it is assessed as
  an income stream regardless of their age).

**It applies to both tests.** Confirmed explicitly, in both directions.

· source (primary) · https://www.servicesaustralia.gov.au/superannuation — verbatim:
  *"**While you're under Age Pension age** — We don't count you or your partner's superannuation in the **income and assets tests**, if your fund isn't paying you a superannuation pension. If your fund is paying you a superannuation pension, it is assessable as an income stream. How it is assessed depends on the type of income stream."*
  *"**When you reach Age Pension age** — We count your superannuation both: in the assets test - the value is the balance on your latest statement; in the income test under the deeming rules. **The same rules apply to your partner and their super when they are Age Pension age, even if they are not getting a payment from us.**"*
· retrieved 2026-09-03 · **primary-verified**
· cross-check (primary) · https://www.servicesaustralia.gov.au/asset-types — assessable assets include *"superannuation if you're over Age Pension age or you receive payment from it"*; and financial investments (the deemed class) include *"superannuation investments if you are over Age Pension age"* · **primary-verified**

**concept.md §5.5 is confirmed correct**, and the trigger is unambiguously **Age Pension age**, not
65 and not a Condition of Release. But note the **second trigger concept.md does not mention**:
commencing *any* income stream — including a **TTR** — makes that super assessable immediately,
even at age 60. Given §5.2 of concept.md models a TTR, **starting a TTR for the younger Person
before the older Person's Age Pension claim would destroy the exemption early.** That interaction is
a genuine trap and is exactly the kind of silent couple bug §8 of concept.md warns about.

**Second rule confirmed:** where only one Person has reached Age Pension age, means are assessed on
**combined** Household assets and income, at the couple thresholds. The DSS rates list and Services
Australia both carry an explicit "**Couple (combined), including where only one partner is
eligible**" row, at the same $499,000 free area / $1,121,000 cut-off as any other couple.
· source (primary) · DSS rates list 20 Sep 2026; https://www.servicesaustralia.gov.au/assets-test-for-age-pension · **primary-verified**

---

## 11. Qualifying age and residency — CONFIRMED

| Name | Value | Config constant |
|---|---|---|
| Age Pension qualifying age, 2026-27 | **67** | `agePension.qualifyingAge` |
| Minimum total Australian residence | **10 years** | `agePension.residencyYears` |
| Of which, unbroken | **5 years** | `agePension.residencyUnbrokenYears` |

· source (primary) · https://www.servicesaustralia.gov.au/who-can-get-age-pension — *"Age Pension age is 67 years or older. **There are no plans to change this.**"* · retrieved 2026-09-03 · **primary-verified**
· source (primary) · https://www.servicesaustralia.gov.au/residence-rules-for-age-pension (page last updated 27 July 2026) — *"To get Age Pension you generally need to have been an Australian resident for at least 10 years in total. For at least 5 of these years, there must be no break in your residence."* Must also be an Australian resident **on the day of claim**. · **primary-verified**

The staged increase to 67 completed on 1 July 2023. **No further legislated increase exists.** For a
40-year projection, model 67 as the current law with an explicit note that this is a policy risk,
not an indexed parameter.

---

## 12. Energy Supplement — a finding concept.md does not cover

The Energy Supplement **is** payable to a new Age Pension claimant today and in future. The
19 September 2016 closure applies **only** to Family Tax Benefit and the Commonwealth Seniors
Health Card, **not** to income support payments.

· source (primary) · https://www.servicesaustralia.gov.au/who-can-get-energy-supplement — *"You can get it if you live in Australia and get either: an income support payment; ABSTUDY Living Allowance. You might get it, if you became eligible for either of these **on or before 19 September 2016**: Family Tax Benefit; Commonwealth Seniors Health Card."* · retrieved 2026-09-03 · **primary-verified**

**But it has never been indexed** — $14.10 single / $10.60 each has been fixed since 2014 and the
DSS 20 Sep 2026 rates list shows a "-" increase. Over the model's 40-year Planning Horizon it
decays to approximately nothing in real terms. It must be held as a **nominal constant that is
never indexed** — not folded into the indexed total. It is worth about 1.2% of the single payment
today and will be worth roughly a third of that by the end of the Planning Horizon.

There is a further interaction worth recording for the "minimal eligibility" goal in concept.md
§5.5: if Age Pension entitlement is lost and the Household moves to a Commonwealth Seniors Health
Card, the Energy Supplement continues **only if the CSHC is claimed within 6 weeks** of the Age
Pension stopping (and only for people on an income support payment on or before 19 Sep 2016 — so
not this Household). · same source · **primary-verified**

---

## 13. Corrections to concept.md

| Location | Says | Should say |
|---|---|---|
| §5.5 table, "Couple rate (each / combined)" | $905.20 / $1,810.40 | Correct **as a total**, but mislabelled. Maximum **basic** rate is $829.40 / $1,658.80. Store basic rate, Pension Supplement and Energy Supplement separately — they index differently. |
| §5.5 table, period columns | Two periods | **Three.** Free areas, assets thresholds and deeming thresholds all moved on **1 July 2026**, mid-period. |
| §6, "Non-homeowner assets-test threshold (~$250k higher)" | ~$250k | **$267,000** as at 1 Jul 2026 (was $258,000). |
| §6, "Work Bonus $4,000 starting balance not re-confirmed" | unresolved | **Confirmed $4,000**, primary-verified. Close it. |
| §6, "Age Pension indexation lands 20 September 2026 — unresolved" | unresolved | **Published 20 Aug 2026.** Close it. |
| §6, fetch note "servicesaustralia.gov.au timed out" | site unavailable | Site is available via `curl` with a browser UA. The timeout was a `WebFetch` limitation. Most figures in §5.5 can now be primary-verified. |
| §5.5, younger-partner exemption | "until they turn 67" | Correct, **but incomplete**: the exemption also ends if the fund starts paying **any** income stream, including a **TTR**, at any age. |
| §5.5, Account-Based Pension grandfathering | "started from 1 Jan 2015" | Two limbs, not one: started before 1 Jan 2015 **AND** continuously on a pension/allowance since 31 Dec 2014. Unreachable for this Household — hard-code `false`. |

---

## 14. UNVERIFIED LIST

| Item | Status | What would close it |
|---|---|---|
| Assets taper stated verbatim as "$3.00 per $1,000 per fortnight" | Derived exactly from two published primary figures (couple: $622,000 excess × $3/$1,000 = $1,866.00 = the exact couple rate). No verbatim primary quotation obtained. | DSS Social Security Guide **4.2.3** — currently 403. Try a residential IP, a different UA, or the National Library Australian Government Web Archive mirror of guides.dss.gov.au. |
| SSA 1991 s1195 (41.76% MTAWE) and s1197 quoted from the Act itself | Confirmed from DVA (Commonwealth) verbatim and from a search-engine snippet of the Act; the Act text itself was not retrieved (legislation.gov.au volume paging; AustLII Cloudflare 403). | Fetch legislation.gov.au Compilation of the Social Security Act 1991, **Volume 5 / Chapter 3 Part 3.16 Division 2**, or the Federal Register series page for the current compilation. |
| Which index bound the 20 Sep 2026 basic rate (CPI, PBLCI, or the MTAWE benchmark) | Not published in the DSS rates resource. The 3.20% six-month rise is suggestive of MTAWE binding, but this is **inference, not fact**. | ABS *Average Weekly Earnings, States and Australia* June 2026 MTAWE figure, compared against $1,711.80 × 26 ÷ 0.4176; or the Minister's media release (`ministers.dss.gov.au` — 403). |
| The Minister's media release for 20 Sep 2026 | `ministers.dss.gov.au/media-releases/18361` returns **403** to both `curl` and `WebFetch`. Not needed — the DSS rates list and AGA publication both close the substance. | Manual browser retrieval, or the AGA/DSS pages already obtained (sufficient). |
| The general (non-retirement-village) legal test for homeowner status | Stated in substance from Services Australia (principal home + 2 ha exempt) but the "reasonable security of tenure" test lives in Guide **4.6.3** — 403. | Same as row 1. Not load-bearing: this Household is unambiguously a homeowner. |
| Deeming rates beyond 20 Sep 2026 | **Genuinely unknowable.** No formula, no announced terminal rate, discretionary Ministerial instrument on a 6-monthly AGA review. | Nothing can close this. Must be a user-editable Setting with a scenario lever. |
| Whether Age Pension age rises beyond 67 | Services Australia states *"There are no plans to change this."* No legislation exists. | Nothing can close this. Policy risk, not a parameter. |
| CPI, PBLCI, MTAWE and wage-growth forward series | Out of scope of this pass. | A separate P1 task. These are Settings, not legislated constants. |
| Deeming rates 2020–2025 history rows | Sourced from Challenger (secondary, adviser-grade) plus the AGA's own reference to the 20 Sep 2025 and 20 Mar 2026 steps (primary). The 1 May 2020 0.25%/2.25% figure is **secondary-only**. | Historic DSS rates lists (available on the same `/system/files/` pattern) — only matters if the model backtests. |

---

## 15. DISCREPANCIES

**No source disagreed with any other on any figure.** Every 20 Sep 2026 and 1 Jul 2026 value was
obtained from at least two independent sources and matched to the cent. Specifically:

- DSS rates list (20 Sep 2026 PDF) vs SuperGuide — all rates, all supplements, all income and
  assets cut-offs: **identical**.
- DSS rates list (1 Jul 2026 PDF) vs Services Australia live pages — all free areas, all cut-offs,
  deeming thresholds: **identical**.
- Services Australia "how much you can get" vs the DSS 20 Sep 2026 PDF "Previous Amount" column for
  the 20 Mar 2026 period: **identical**.
- 66.33% single/couple ratio (DVA + Social Security Guide) vs the published dollar figures:
  matches to 5 decimal places in both the March and September sets.
- Assets taper $3.00/$1,000/ft vs published free areas and cut-offs: **exact** in the couple case.

**One apparent discrepancy, resolved.** Services Australia's assets test page shows $1,151,000 for a
couple separated due to illness where the DSS list shows $1,300,000. These are **different rows** —
$1,151,000 is the **transitional rate** cut-off, $1,300,000 is the normal rate. Not a conflict.

**One item in concept.md that was materially wrong** (not a source disagreement): the non-homeowner
differential recorded as "~$250k" is **$267,000**.

**One search-engine artefact worth recording.** A `WebSearch` summariser asserted that the actual
determined September 2026 deeming rates "appear to be different" from 1.75%/3.75%. This was wrong —
the AGA publication page states the Minister determined exactly 1.75%/3.75%. Search summaries were
treated as pointers to sources throughout, never as sources.

---

## 16. VERDICT ON P1-5

# ✅ P1-5 CAN BE CLOSED TODAY (2026-09-03).

The 20 September 2026 reindexation is **published**, 17 days ahead of effect:

- **Payment rates** — DSS *Social Security Payment Parameters, 20 September 2026 indexation*,
  published **20 August 2026**. Primary, complete, retrieved in full.
- **Income and assets cut-offs** — same document. Primary, complete.
- **Deeming rates** — **determined by the Minister for Social Services**, published by the
  Australian Government Actuary. Not a proposal, not a projection. Primary.
- **Free areas and deeming thresholds** — unchanged on 20 Sep 2026 (they indexed on 1 July 2026);
  primary-verified from the DSS 1 July 2026 list and Services Australia.
- **Indexation mechanism** — 41.76% MTAWE combined-couple benchmark, 66.33% single ratio, CPI-only
  Pension Supplement, unindexed Energy Supplement. Primary-verified from DVA and confirmed
  arithmetically against the published rates.

**P1-8 (Work Bonus): CLOSED.** $4,000 / $300 / $11,800, per Person, employment and active
self-employment income only. Primary-verified.

**P1-9 (non-homeowner thresholds): CLOSED.** $600,000 single / $766,000 couple combined,
differential **$267,000** (not the ~$250k recorded). Primary-verified.

**Nothing needs revisiting before 20 September 2026.** The next dates that change anything:

| Date | What changes |
|---|---|
| **2026-09-20** | Rates, cut-offs, deeming rates take effect as recorded above |
| **~2027-02-20** | DSS publishes the 20 March 2027 rates list; AGA publishes its next deeming recommendation (~late Jan 2027) |
| **2027-03-20** | Next rate indexation and next likely deeming step |
| **~2027-05** | DSS publishes the 1 July 2027 list — free areas, assets thresholds, deeming thresholds |
| **2027-07-01** | Free areas, assets free areas, deeming thresholds reindex |

**Recommended cadence for the project:** re-fetch the DSS `/system/files/documents/<YYYY-MM>/`
rates list **four times a year** (late Feb, late May, late Aug, late Nov). The URL pattern is
stable and the PDFs parse cleanly.

---

## 17. Primary source URLs (all retrieved 2026-09-03)

- https://www.dss.gov.au/system/files/documents/2026-08/rates-list-20-september-2026.pdf
- https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf
- https://www.dss.gov.au/system/files/documents/2026-03/20-march-2026-rates-list_1.pdf
- https://www.dss.gov.au/income-support-payments/resource/indexation-rates-september-2026
- https://www.dss.gov.au/income-support-payments/social-security-indexation
- https://www.dss.gov.au/income-support-payments/social-security-deeming-rates
- https://aga.gov.au/publications/deeming-rate-recommendation-september-2026
- https://aga.gov.au/sites/aga.gov.au/files/sites/aga.gov.au/files/publications/2026-08/p2026-799305.pdf
- https://www.servicesaustralia.gov.au/how-much-age-pension-you-can-get
- https://www.servicesaustralia.gov.au/income-test-for-age-pension
- https://www.servicesaustralia.gov.au/assets-test-for-age-pension
- https://www.servicesaustralia.gov.au/deeming
- https://www.servicesaustralia.gov.au/work-bonus-balance
- https://www.servicesaustralia.gov.au/how-work-bonus-works
- https://www.servicesaustralia.gov.au/who-can-get-work-bonus
- https://www.servicesaustralia.gov.au/work-bonus-and-your-partners-income
- https://www.servicesaustralia.gov.au/superannuation
- https://www.servicesaustralia.gov.au/income-streams
- https://www.servicesaustralia.gov.au/asset-types
- https://www.servicesaustralia.gov.au/who-can-get-age-pension
- https://www.servicesaustralia.gov.au/residence-rules-for-age-pension
- https://www.servicesaustralia.gov.au/who-can-get-energy-supplement
- https://www.dva.gov.au/access-benefits/pensions-and-payments/ready-reckoners/indexation-of-income-support-pensions-and-allowances

**Secondary sources used (labelled as such throughout):**
- https://www.superguide.com.au/in-retirement/age-pension-rates — cross-check only, matched primary exactly
- https://www.challenger.com.au/adviser/knowledge-hub/Articles/The-new-deeming-rates — deeming freeze history 2020–2025 only
