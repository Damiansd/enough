# P3-18 contribution splitting: sources, mechanic, gate (2026-09-25)

**Verdict: GO.** Both 2026-09-22 NO-GO conditions are cleared. (1) The 85% limit is now cited from the primary text (SISR reg 6.40). (2) No generic "next year, someone else's account" machinery is needed: the walk already sums each Person's concessional contributions per FY, so the build keeps the completed year's two arrays and adds one entry loop modelled on `SPOUSE_CONTRIBUTION`. Caveat: TODO measured this as worth about $0 on the real plan (2026-09-24). The user has chosen to ship it anyway.

## Rules (fetched 2026-09-25; SISR text from the ATO Legal Database, CCH compilation)
| Rule | Primary source |
|---|---|
| Max for taxed splittable contributions = the lesser of 85% of the FY's concessional contributions and that FY's concessional cap | SISR reg 6.40 "maximum splittable amount" (a): https://www.ato.gov.au/law/view/document?docid=REG/19940057/reg6.40 |
| Taxed splittable = contributions taxed under Subdiv 295-C (employer, salary sacrifice, deductible personal). Not rollovers or amounts already split | SISR regs 6.41, 6.42: .../docid=REG/19940057/reg6.41, .../reg6.42 |
| Apply in FY N+1 for FY N's contributions (6.44(1)(a)). Same-FY split only if the member's whole benefit is rolled over, transferred or cashed that year (6.44(1)(b)). One application per FY (6.44(2)(a)). Invalid above the max (6.44(2)(b)) | SISR reg 6.44: .../docid=REG/19940057/reg6.44 |
| Receiver: invalid if 65+, or between preservation age and 65 and meeting Sch 1 item 101 (retirement). Valid if under preservation age, or preservation age to 64 and not retired (6.44(3)) | SISR reg 6.44(2)(c), (3) |
| Trustee may accept (discretionary; funds need not offer it). Pays within 30 days. Taxed amount must be no more than the element taxed in the fund if the whole benefit were withdrawn | SISR reg 6.45(1), (2), (4): .../reg6.45 |
| Split still counts in full against the ORIGINAL member's caps and is reported as the member's contributions | ATO, Contributions splitting for members (updated 12 Nov 2025): https://www.ato.gov.au/tax-and-super-professionals/for-superannuation-professionals/apra-regulated-funds/managing-member-benefits/managing-and-calculating-member-benefits/contributions-splitting-for-members ; ATO form NAT 15237 guidance: https://www.ato.gov.au/forms-and-instructions/superannuation-contributions-splitting |
| Arrives as a rollover super benefit, not a contribution: the RBS "contributions amounts" are always nil and the rollover amount is always taxable component | ATO "for members" page above |
| Not taxed again: a rollover is not assessable income of the receiver (s 306-5). The receiving fund is assessed only on the element untaxed (s 295-190(1) item 2), and a taxed split has none | ITAA 1997 s 306-5: https://www.ato.gov.au/law/view/document?docid=PAC/19970038/306-5 ; s 295-190: .../PAC/19970038/295-190 |

**Not sourced, flagged:** SISR reg 6.01(7), the definition of "retired", has still not been retrieved (O59/U28). Receiver eligibility therefore reuses the walk's existing proxy, "ceased gainful employment at or after preservation age" (`conditionOfRelease`). The ATO "for members" page ties the cap in the max to the carry-forward-increased cap. This walk runs only the general cap (`projection.ts:10470`), so its max is a LOWER bound. That errs toward refusing a legal split, never toward allowing an illegal one.

## Mechanic (smallest)
- **Params** (`plan.ts:1517`, off `UnspecifiedParams`): `owner` = the splitting Person (the receiver is the other Person, as in `SPOUSE_CONTRIBUTION`; the `plan.ts:1490` doc must be amended). Fields: `sourceInterestIndex`, `receivingInterestIndex`, `amount: Cents | 'maximum'`. `date` = the transfer month. No FY field: reg 6.44(1)(a) fixes the split year to `fy(date) - 1`. The same-FY limb 6.44(1)(b) is out of scope.
- **State (the only new state):** one `let priorYear: {fy, guarantee[], sacrificed[], months} | undefined`, assigned from `completed` at `projection.ts:7950`, where `taxYearToDate` is retired. The arrays already exist: `guarantee`/`sacrificed` are declared at 6040-6054, initialised at 8360-8376 and summed monthly at ~8393-8398. The cap note already reads them the same way at 8420-8426. `concessionalComponentsOf` (789) plus `concessionalContributions` gives the total. `concessionalContributionsCap(fy, awoteIndexNumbers)` (`superCaps.ts`) gives the cap; use `concessionalContributionsOverGeneralCap`'s base-amount floor trick (`superConcessional.ts:555`) so no index number is needed when 85% of the total is at or below the base amount.
- **Pure function** (`superConcessional.ts`): `maximumSplittableAmount({fy, components, indexNumbers})` = min(85% × total, cap). The 85% goes in a new `super.ts` record citing reg 6.40.
- **Transfer idiom:** the `SPOUSE_CONTRIBUTION` loop (`projection.ts:9750-9810`) supplies the owner→other resolution, the positional interest, `refuseContributionAfterSwitch` (5682, reworded for a rollover) and the direct `superInterestBalances[slot]` write before growth. The debit side is the Division 293 release (10859-10864: `refuseReleaseAboveBalance` then `subCents`). Two `effect: 'wealth'` lines (out of the owner, into the receiver), so household wealth nets to nil. Nothing is added to the receiver's `taxYearToDate` accumulators (a rollover is not a contribution), and nothing is subtracted from the owner's (the cap counts the full amount). No 15% is charged on arrival.

## Refusals (named RangeErrors, door plus walk defence in depth)
1. `ContributionSplitReceiverIneligible`: `conditionOfRelease({receiver.dateOfBirth, on: date, gainfulEmployment from retiredOn})` (`conditionOfRelease.ts:229`, `projection.ts:5274`) has `met === true`, meaning 65+ or retired after preservation age. Reg 6.44(2)(c).
2. `ContributionSplitAboveMaximum`: amount > `maximumSplittableAmount(prior FY)`. Reg 6.44(2)(b). If `priorYear.months < 12` (the walk opened mid-year), the message says the max is a lower bound.
3. `ContributionSplitNoPriorYearContributions`: `priorYear` is undefined (the split falls in the first walked FY) or `priorYear.fy !== fy(date) - 1`, or the prior FY's total is nil.
4. Also: a second split by the same owner in one FY (6.44(2)(a)); amount > the source interest's balance (the balance stands in for 6.45(4)); a receiving interest already switched to pension; owner `household` or no spouse (P3-19's wording).
- **Open (not inferred):** the accumulators are per Person, not per interest. If the prior FY's Guarantee destination (O82) and the sacrifice went to different interests, the per-fund limit in 6.44(1) ("made to that fund") is overstated. Slice 3 should refuse a split whose owner had concessional contributions to more than one interest that year, or it must be a user ruling.

## Byte-identical when absent
Yes. `priorYear` is written but read only inside the `CONTRIBUTION_SPLIT` loop, and that loop `continue`s for every other type. No accumulator, line or ordering changes. The existing `core-parse-plan.test.mjs` walk canary stays untouched and should be asserted.

## Slices
1. `super.ts` record (85%, reg 6.40/6.44/6.45 citations) plus `maximumSplittableAmount` and fixtures: the ATO form's John ($7,000 ≤ 85% of $10,000) and Marita ($25,500 > $25,000 cap, refused).
2. `ContributionSplitParams` in `plan.ts`, and door refusals in `parsePlan.ts`. Sequence after the in-flight parsePlan/entryForm work.
3. Walk: `priorYear` at 7950, the entry loop after `SPOUSE_CONTRIBUTION`, refusals 1-4, the two wealth lines, and the form plus `OFFERED_ENTRY_TYPES` in the SAME commit (P3-19 precedent: `test/app-entry-form.test.mjs` fails a type the walk honours but the form does not offer).
4. Later: P6-5b equalisation template.
