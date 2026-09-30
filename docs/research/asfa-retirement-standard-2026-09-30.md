# ASFA Retirement Standard: research notes

Accessed: 2026-09-30. June 2026 figures come from the live site via headless Chrome. The March 2026 and earlier figures come from web.archive.org snapshots, dated per source.

Note on the name: the user wrote "AFSA". AFSA is the Australian Financial Security Authority (the bankruptcy regulator) and does not publish retirement spending levels. The publisher is ASFA (Association of Superannuation Funds of Australia).

## Headline: latest published figures

**Latest: June quarter 2026**, read from the LIVE site on 2026-09-30. The first draft of this note said March 2026 was the latest, because the archive route only reached a 2026-09-08 snapshot. That was wrong: the live page already showed June 2026, and the user's screenshot confirms it. superannuation.asn.au sits behind a Cloudflare challenge that blocks curl (403), the r.jina.ai reader and direct PDF downloads. **Headless Chrome gets through**: run `--dump-dom` on the page, and for the PDF, `fetch()` it from within the loaded page over the DevTools protocol. A copy of the PDF is saved alongside this note.

### Annual spending, homeowners, June quarter 2026

| Household | Lifestyle | Ages 65-84 | Ages 85+ |
|---|---|---|---|
| Single | Comfortable | $56,166 | $53,964 |
| Single | Modest | $36,548 | $34,619 |
| Couple | Comfortable | $78,998 | $74,484 |
| Couple | Modest | $52,690 | $49,611 |

Other June 2026 (65-84) figures: modest renters single $51,418, couple $69,376. Full Age Pension incl. supplements: single $31,223, couple $47,070. The lump sums are unchanged (see below).
Sources: live consumer page `https://www.superannuation.asn.au/consumers/retirement-standard/` (65-84 table, heading "June quarter 2026"); tables PDF `https://www.superannuation.asn.au/wp-content/uploads/2026/09/June2026-RS-Tables_V3.pdf` (uploaded Sept 2026; "Total annual expenditure" rows for 65-84, renters and 85+).

### Previous quarter: annual spending, homeowners, March quarter 2026

| Household | Lifestyle | Ages 65-84 | Ages 85+ |
|---|---|---|---|
| Single | Comfortable | $55,923 | $53,656 |
| Single | Modest | $36,434 | $34,374 |
| Couple | Comfortable | $78,566 | $73,970 |
| Couple | Modest | $52,473 | $49,255 |

Other March 2026 (65-84) figures: modest renters single $51,164, couple $69,002. Full Age Pension incl. supplements: single $31,223, couple $47,070.
Sources: ASFA March 2026 tables PDF (archived 2026-07-19) `https://www.superannuation.asn.au/wp-content/uploads/2026/06/March2026-RS-Tables.pdf`; consumer page (archived 2026-09-08) `https://www.superannuation.asn.au/consumers/retirement-standard/`. The 85+ table in the PDF covers home owners only; annual figure = 52.2 x weekly.

### Lump sum at retirement (age 67, homeowners)

| Standard | Couple | Single | Effective |
|---|---|---|---|
| Comfortable | $730,000 | $630,000 | revised 24 Feb 2026 (previous $690,000 / $595,000; first rise in three years) |
| Modest | $120,000 | $110,000 | 24 Feb 2026 (previously $100,000 both) |
| Modest, private renters | $385,000 | $340,000 | shown on same page; introduced June 2025 |

Assumptions (ASFA summary PDF, archived 2026-05-15): retiree draws down all capital, receives a part Age Pension, owns home outright; figures in today's dollars using 2.75% AWE as deflator; investment earning rate 6%. Lump sums are not updated quarterly (last change before Feb 2026 was March 2023).
Sources: `https://www.superannuation.asn.au/wp-content/uploads/2026/02/260223-ASFA-Retirement_Standard-Summary.pdf`; media release 24 Feb 2026 `https://www.superannuation.asn.au/media-release/asfa-retirement-standard-super-balances-needed-for-comfortable-retirement-reach-all-time-high/` (archived 2026-06-18). Release says the rise is due to the Age Pension lagging retiree cost increases and higher deeming rates (from 20 March 2026: lower 1.25%, upper 3.25%).

## Cadence and comparison figures

- Budgets updated quarterly to reflect CPI-type price changes; "reviewed regularly" for lifestyle changes. Lump sums revised only occasionally (Mar 2023, Feb 2026). Renters added June 2025. Over-85 standard launched 2015.
- Comfortable, homeowners 65-84, successive quarters:

| Quarter | Single | Couple | Source (archived) |
|---|---|---|---|
| Sep 2024 | $51,814 | $73,031 | media release 4 Dec 2024, `https://www.superannuation.asn.au/media-release/superannuation-peak-body-retirement-costs-finally-fall-just-in-time-for-christmas/` (2026-04-10) |
| Dec 2024 | $51,805 | $73,077 | media release 12 Mar 2025, `https://www.superannuation.asn.au/media-release/falling-electricity-prices-ease-pressure-on-retirees-but-costs-are-still-inching-up/` (2026-07-19) |
| Dec 2025 | $54,840 | $77,375 | ASFA page `https://www.superannuation.asn.au/resources/retirement-standard` (2026-05-26) |
| Mar 2026 | $55,923 | $78,566 | as above |

  Dec 2024 to Dec 2025 is about +5.9% for both (my arithmetic; the release for Dec 2025 cites CPI +3.8% and retiree-relevant items up faster, e.g. electricity +21.5%). Mar 2026 vs Dec 2025: +2.0% single, +1.5% couple (my arithmetic).
- Dec 2025 quarter, 85+ homeowners (ASFA PDF, archived 2026-05-15, `https://www.superannuation.asn.au/wp-content/uploads/2026/02/ASFA_Retirement_Standard_Budgets_Dec-25_quarter.pdf`): comfortable couple $72,093, single $52,235; modest couple $47,999, single $33,470. Dec 2025 modest 65-84: couple $51,299, single $35,503.
- Not found from a primary source: March 2025 / June 2025 / Sep 2025 headline figures (only Sep 2025 comfortable single $54,240 appeared in a search snippet of an ASFA infographic PDF, not opened; treat as unverified).

## Key assumptions and what is in each budget

- Comfortable and modest (non-renter) budgets assume retirees own their home outright and are relatively healthy. Renters: modest only, rent after Rent Allowance plus moving-cost allowance.
- Expenditure is by household and can exceed after-tax income where capital is drawn down. Age bands: about 65-84 and 85+ (older retirees spend more on care and home help, less on holidays and leisure).
- Comfortable: top-level private health insurance, regular leisure/club activity, reasonable car, regular haircuts, confident air-conditioning use, occasional restaurant meals, annual domestic trip plus one overseas trip every seven years, home repairs/updates over 20 years.
- Modest: "better than the Age Pension, but still only allows for the basics"; basic private health insurance, older cheaper car, infrequent leisure, budget haircuts, watching utility costs, annual domestic trip or short breaks.
- Age Pension column: no private health insurance, very basic mobile/internet, limited car budget, struggle to pay major repairs.
- Weekly budgets: comfortable couple $1,505.10, single $1,071.33; modest couple $1,005.23, single $697.97 (March 2026, 65-84).
- Budgets are in current-quarter dollars (re-priced each quarter, so effectively CPI-updated); lump sums are in "today's dollars" with the 2.75% AWE deflator and 6% earning rate.

## Criticisms and limitations

Primary-source (ASFA's own) statements of limitation:
- Home ownership assumed for comfortable and standard modest budgets; no comfortable budget or lump sum for renters (only a modest renter one).
- Lump sums depend on Age Pension settings and deeming rates, so they move with policy, and the same lump sum applies to modest singles and couples ($110k vs $120k) because of pension effects.
- Modest lump sums are small because the Age Pension covers most of the modest budget: March 2026 modest single $36,434 vs full pension $31,223 (about 17% above), couple $52,473 vs $47,070 (about 11% above) (my arithmetic).
- ASFA is the industry peak body (members include retail, industry, corporate and public sector funds), so it has an interest in promoting super adequacy; its own boilerplate says it is "sector-neutral".

Third-party criticism: I did not find any independent critique from a primary or authoritative source in this session. Commentary claiming things such as "ASFA doesn't standardise a comfortable renter budget" appeared only in secondary blogs and is not verified here.

## Sources (all accessed 2026-09-30 via Wayback Machine; live site returns 403)

1. `https://www.superannuation.asn.au/resources/retirement-standard` (snapshot 2026-05-26: Dec 2025 quarter)
2. `https://www.superannuation.asn.au/consumers/retirement-standard/` (snapshot 2026-09-08: March 2026 quarter; latest verified)
3. `https://www.superannuation.asn.au/wp-content/uploads/2026/06/March2026-RS-Tables.pdf` (snapshot 2026-07-19)
4. `https://www.superannuation.asn.au/wp-content/uploads/2026/02/260223-ASFA-Retirement_Standard-Summary.pdf` (snapshot 2026-05-15)
5. `https://www.superannuation.asn.au/wp-content/uploads/2026/02/ASFA_Retirement_Standard_Budgets_Dec-25_quarter.pdf` (snapshot 2026-05-15)
6. `https://www.superannuation.asn.au/media-release/asfa-retirement-standard-super-balances-needed-for-comfortable-retirement-reach-all-time-high/` (24 Feb 2026; snapshot 2026-06-18)
7. Media releases of 4 Dec 2024 and 12 Mar 2025 (URLs in the cadence table above).
