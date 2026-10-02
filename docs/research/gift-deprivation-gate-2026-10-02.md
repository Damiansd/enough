# GIFT entry (deprived assets) — read-only gate, 2026-10-02

Verdict: **GO**. None of the four NO-GO conditions is met. Two things the brief did not name need a design decision before building (section 5, J7 and the "wealth readers" hazard in 2.2). Nothing in the repo was edited; this is the only file written.

How the sources were fetched: Services Australia 403s `WebFetch`, and `--headless=new` Chrome returned an Akamai "Error" page. Plain `curl` with a desktop Chrome `User-Agent` and `Accept-Language: en-AU` returned HTTP 200 for every page quoted below, and `--headless=old` Chrome also rendered pages. Legislation came from the Federal Register OData API (`api.prod.legislation.gov.au/v1`, Word download, `asatspecification='Latest'`): Social Security Act 1991 `C2004A04121` compilation 233 (registered 19 Sep 2026, `C2026C00427`), Aged Care Rules 2025 `F2025L01173`, Aged Care Act 2024 `C2024A00104` (`C2026C00301`, from 1 Jul 2026). A further SSA version starting 2026-12-18 exists on the register and was not read.

## 1. The rule, sourced live

Primary sources, all retrieved 2026-10-02:
- https://www.servicesaustralia.gov.au/how-much-you-can-gift?context=22526 (page last updated 3 Feb 2025)
- https://www.servicesaustralia.gov.au/how-gifting-can-affect-your-payment?context=22526 (3 Feb 2025)
- https://www.servicesaustralia.gov.au/what-gifts-we-include-income-and-assets-tests?context=22526 and https://www.servicesaustralia.gov.au/when-gifting-exceptions-apply?context=22526 (19 Dec 2022)
- SSA 1991 ss 9(1), 9(4), 1123, 1124, 1126AA-1126AD, 1126E, 1127 (volumes 1 and 3 of compilation 233)
- https://www.myagedcare.gov.au/income-and-assets-assessments-support-home; Aged Care Act 2024 s 330; Aged Care Rules 2025 s 32315

**Free areas.** Services Australia: "The value of the gifting free areas are the same if you're a single person or a couple. They are both: $10,000 in one financial year; $30,000 over 5 financial years - this can't include more than $10,000 in a single financial year." Statute: s 1126AA(2) "exceeds $10,000"; s 1126AB(2) "exceeds $30,000" (singles), s 1126AC(2) and s 1126AD(2) (couples).

**Excess, both tests.** Services Australia: "If you gift over the value of the gifting free areas we'll do both of these: count the excess in your assets test; apply deeming and include it in your income test. This applies for 5 years from the date you make the gift." Statute: s 9(1) "financial asset means: (a) a financial investment; or (b) a deprived asset", and s 9(4) makes an asset "deprived" when its value is included in a person's assets by s 1126AA/AB/AC/AD. Because it is a financial asset it is deemed under ss 1076-1078.

**Does a couple share one limit? Yes.** The Services Australia page only says the areas are "the same", but the Act is explicit. s 1126AC(2): "the amount of the relevant disposal, or the sum of that amount and the amounts (if any) of other disposals of assets previously made by the person, the person's partner, or the person and the person's partner, during the income year ... exceeds $10,000, then ... the lesser of the following amounts is to be included in the value of the assets of the person and in the value of the assets of the partner for the period of 5 years starting on the day on which the relevant disposal took place: (a) one-half of the amount of the relevant disposal; (b) one-half of the amount by which the sum ... exceeds $10,000." Each partner carries half, so the household carries the whole excess.

**Both limits breached.** s 1126AD(2) for a couple, s 1126AB(2) for a single person:
- (a) the relevant disposal plus all previous disposals in the rolling period, less
- (b) the amounts already included under ss 1126AA, 1126AB, 1126AC, 1126AD in the rolling period,
- if the result exceeds $30,000, the lesser of the excess and the amount of the disposal is included (couple: one-half each).
- The rolling period is "the income year in which the relevant disposal took place and ... the 4 previous income years" (s 1126AB(4), s 1126AD(6)), and only years after 30 June 2002.

Services Australia's worked example confirms that the annual excess and the five-year excess add. A 1 May 2022 gift of $11,000 gives $6,000 until 30 April 2027, which is "(($11,000 - $10,000) + ($35,000 - $30,000))". The same example gives $0 on 1 May 2019, $3,000 until 31 May 2025 on 1 Jun 2020, and $0 on 1 Apr 2021. It works under the statute: the 2022 five-year test is 8+13+7+11 = 39, less included amounts 3+1 = 4, so 35, an excess of 5. This is the golden test.

**5-year period.** s 1126AA(2): "for the period of 5 years starting on the day on which the relevant disposal took place". The example's end dates ("until 31 May 2025" for a 1 Jun 2020 gift) show the last day is the day before the fifth anniversary.

**Pre-plan gifts still count.** Services Australia: "Any gifts you made in the past 5 years may be included in your income and assets tests." s 1127 disregards only a disposal made "more than 5 years before" the person (or partner) became qualified. A gift less than 5 years before qualification counts, and it counts for the unexpired remainder of its own 5 years.

**Indexation: not indexed.** `$10,000` and `$30,000` are literals in ss 1126AA-AD. The indexation table in Part 3.16 (s 1190/1191, volume 4) contains no `1126` item. The Services Australia page, updated Feb 2025, still states $10,000 and $30,000.

**Aged care counts deprived assets: yes.**
- Aged Care Act 2024 s 330(1): "the value of an individual's assets is the value worked out in accordance with Division 1 of Part 3.12 of the Social Security Act 1991".
- s 330(4)(b): the value "is taken to include the amount that the System Governor determines to be the amount ... that would be included ... if Division 2 of Part 3.12 and Division 8 of Part 3.18 of the Social Security Act 1991 applied for the purposes of this Act". The Note adds that Division 2 of Part 3.12 deals with disposal of assets.
- s 330(10): couples are assessed at 50% each.
- myagedcare, Support at Home assessments: "deemed income from excess gifting" is in the income list, and "gifted assets: gifted amounts above $10,000 in the last financial year or above $30,000 in the last five financial years (or amounts above $10,000 in any of those financial years) are included as a financial asset."
- Aged Care Rules s 32315 only prescribes pre-21 Aug 1996 gifts; the $10,000/$30,000 text in Rules Part 3 (ss 1975 etc.) is a separate fee-reduction-supplement hardship test and is not modelled here.
- Other deprivation provisions that do not apply to a pure GIFT: s 1106(3) (income from a deprived asset is not separately "disposed" income, so no double count), ss 1123(1)(b) and 1124 (no consideration, so the amount is the full value).

## 2. Code map

### 2.1 The means-test chokepoint (condition (b): GO)
- `splitAssets` in `src/core/household.ts:1307` is the only function that builds the assessable figure and the deemed figure. Lines are pushed with `treatment` and `deemed` flags: person lines, then `sharedLines.push` at `:1376` (Offset), `:1392` (set-aside) and `:1410` (vacated home); `total()` at `:1429`; `assessableAssets` and `deemedFinancialAssets` at `:1436-1437`. A deprived amount is one more shared line with `treatment: 'assessable', deemed: true`. It then reaches both tests with no other edit. The pooled `deemedFinancialAssets` is exactly what s 1076-1078 deems, and `byPerson` ignores shared lines (the Offset precedent), so the halves are not needed.
- It already has the optional-parameter precedent: `careVacatedHomeAssessment` (3rd) and `saleProceedsSetAside` (4th). Add a 5th, `deprivedAssets`. Forwarded through `AgePensionInput` (`src/core/agePension.ts:99`, call at `:361`).
- Both tests read `splitAssets`: deeming `agePension.ts:390` (`assets.deemedFinancialAssets`) and the assets test `agePension.ts:412-413` (`assets.assessableAssets`).
- `src/core/projection.ts` has exactly three call sites to feed with the same figure: the main entitlement `:7995-8003`, the reporting split `:8024-8025` (otherwise ADR-0005's assertion at `:8031` trips), and the couple-had-they-lived call `:8115`. Nothing else in `src/` calls `splitAssets` or `agePensionEntitlement` (grep, `src/core` and `src/app`).
- **Aged care needs zero edits.** `projection.ts:11492-11497` takes `assets.assessableAssets` (less the RAD) as `combinedAssessableAssetsExcludingHomeAndRad`, and income as `entitlement.incomeTest.assessed * 26` (`:11487`), which already contains the deemed amount. The Act's treatment (s 330(1)+(4)(b), 50% each) matches `agedCare.ts`'s halving. The deprived figure flows through automatically and consistently.
- Thresholds: the Age Pension period tables in `src/data/assumptions/agePension.ts` are `Constant<...>` objects with `source`, `retrieved`, `confidence`, `registerSection` (see `saleProceedsExemptionMonths`, `:961`, and the source blocks at `:92` and `:115`). The gifting areas belong there as a new `gifting` block (annual 10,000, rolling 30,000, years 5; `indexed` not applicable; stamp `primary-verified`). They need adding to the consumed-provenance list near `projection.ts:5135` and to the provenance map in `test/assumptions-register.test.mjs:117`.

**Hazard the brief did not name: "wealth readers".** `plan.ts:2714` documents `protectedAssets + assessableAssets` as TOTAL WEALTH. It is summed as wealth at `src/app/comparisonSeries.ts:335`, `src/app/chat/tools/runProjection.ts:91` (`totalBalances`) and `financialYearSummary.ts:192`/`getMonth.ts:115-122`. `src/core/outcomes.ts:420` also tests `assessableAssets === 0 || === openingBalance` for the Pension-Only Age. Putting the phantom amount into the reported `Month.assessableAssets` (`projection.ts:12274`) would make those readers overstate wealth by the gifted excess and could break the Pension-Only Age marker. So the means-test input must carry the phantom but the reported Month fields must stay real: add `deprivedAssets` to `AssetSplit`, report `assessableAssets: assets.assessableAssets - assets.deprivedAssets` at `:12274`, and add an optional `Month.deprivedAssets` (key omitted when nil, the repo's byte-identical-keys convention) that the threshold chart (`monthsToSeries.ts:629-640`) and the assets-test rows add back. This is about 6 display-side sites, none of which compute the means test. It does not change the verdict on (b), which is about the means-test inputs, but it must be in slice 2.

### 2.2 Entry types (how a new one is added)
- `src/core/plan.ts`: `ENTRY_TYPES` `:331-358`; `ENTRY_KIND` `:403` (exhaustive, `ONE_OFF_EXPENSE: 'event'` `:492`, so a new type fails the build until classified); params interface (`OneOffExpenseParams` `:1068`); `Entry` union `:1648`.
- Door: `src/core/parsePlan.ts` `ONE_OFF_EXPENSE` params parser `:1252`; owner parsed `:1713`. A giver outside the household is refused the way contributions are, `:1883-1889`.
- UI: `src/app/entryForm.ts` boxes `:490`, builder `:642`, edit/summary `:967`; `src/app/planEdits.ts:1251` candidate builder; `src/app/entryLabels.ts:51`; `src/app/flowSeries.ts` line-to-category map (`:262`, plus an exhaustiveness table at `:481`).
- Chat: `src/app/chat/toolCatalogue.ts:64` (`PARAMS`), `tools/listEntries.ts:47`, `tools/proposeEntries.ts:182`.
- Cash side: `projection.ts:9899` (`oneOffs`) feeds the spending `target` at `:9984`; one outflow line per entry at `:11126-11130` (`ONE_OFF_EXPENSE_LINE`, `:2121`; provenance `UNLEGISLATED.oneOff` `:4784`). A GIFT can reuse the target path with its own line name, e.g. `GIFT_LINE`.

### 2.3 Pre-plan entries (condition (c): GO)
- `projection.ts:5935-5938` is the only place `ENTRY_KIND` is consulted: an `event` dated before the walk is `continue`d, so a pre-plan GIFT never reaches `applied`. The out-of-horizon refusal at `:5927-5931` runs before it and still applies.
- A pre-plan GIFT does not need that loop to change. Classify GIFT as `'event'` (cash already gone, balances stated as at `asAtDate`, same as `ONE_OFF_EXPENSE`). The deprived amount is a pure function of `(all enabled GIFT entries in the plan, month-start date, couple)`, computed from the `entries` argument, not from `applied`. So pre-plan gifts reach the means test without any change to what any other entry type means, and with no new branch in the shared loop. The deprived inclusion window handles expiry.
- `ENTRY_KIND` is not touched for any other type. Disabled gifts must be excluded by the same `enabled` filter.

### 2.4 Control (condition (d): GO)
- `fixtures/demo-couple.plan.json` and `fixtures/userguide-pip-jo.plan.json` contain only SPEND_CHANGE x7, MORTGAGE_REFINANCE, RETIRE, MORTGAGE_PAYOFF. `src/app/demoHousehold.ts:106-114` has one ONE_OFF_EXPENSE (new-roof, 2029-11-01, $38,000), which is not a gift and does not change. `grep -ri gift` over `fixtures`, `test/fixtures`, `server`, `demoHousehold.ts` finds nothing. In `src`, `test` and `docs` it only hits the transaction category "Gifts" (`test/app-categorisation-rules.test.mjs`), an unrelated import label, and `SPOUSE_CONTRIBUTION` test variable names.
- A GIFT is a new type, so the door refuses it today and no saved plan can hold one. With zero GIFT entries the new parameter is omitted and the new `Month.deprivedAssets` key is omitted, so every existing figure, and the golden `fixtures/golden/demo-couple.golden.json`, stays byte-identical.
- What will move: structural counters, not figures. `test/app-entry-form.test.mjs:513-514` (24 constructible, 23 offered) and `test/app-chat-catalogue-params.test.mjs:92` (23 offered) pin the type counts and must be bumped. This is expected and is the build's own checklist, not a figure moving. I did not run the suite.

## 3. Condition table

| Condition | Result | Evidence |
|---|---|---|
| (a) rule not confirmable from primary source | GO | Services Australia pages and SSA ss 9, 1126AA-AD, 1127 quoted live; aged care via Act s 330 and myagedcare |
| (b) no single chokepoint | GO | `household.ts:1307` `splitAssets`, forwarded by `agePension.ts:361`; 3 call sites in `projection.ts` (7995, 8024-25, 8115); aged care inherits (`projection.ts:11487, 11497`). Display-side wealth readers need care (2.1), but they are not means-test sites |
| (c) pre-plan gifts need event-semantics change | GO | Compute the deprived amount from all enabled GIFT entries independent of `applied` (`projection.ts:5938` untouched); GIFT stays `'event'` |
| (d) an existing figure moves | GO | No fixture or demo GIFT; parameter and Month key omitted when nil |

## 4. Smallest honest build plan

**Slice 1: engine.**
1. New pure module `src/core/deprivedAssets.ts`: `deprivedAmount(gifts, monthStartDate, couple)`. Gifts are `{ date, amount, ownerIndex }`, sorted by date then entry order. For each gift: `AA = lesser(amount, max(0, FYsum_to_date - 10,000))`; `AB = lesser(amount, max(0, (rolling-period total) - (AA/AB/AC/AD amounts already included in the rolling period, this gift's AA included) - 30,000))`. Excess lives for `[gift month + 1, gift.date + 5y)` at month starts. Couple uses the combined pool and the household total equals the full excess.
2. Constants in `src/data/assumptions/agePension.ts` (new `gifting` block: 10,000, 30,000, 5 years, `indexed: false`, source and quote per section 1, `primary-verified`, `retrieved 2026-10-02`); register row in `docs/assumptions-register.md` (§4.x), consumed-provenance entry at `projection.ts:5135`.
3. `splitAssets` 5th param and `AssetSplit.deprivedAssets` (shared line `'Deprived assets (gifts)'`, assessable + deemed); forward via `AgePensionInput`; feed the 3 projection call sites. Do NOT edit `agedCare.ts`.
4. `Month.deprivedAssets` (optional key) and subtract it at `projection.ts:12274` so total-wealth readers stay real.
5. Cash side: GIFT in the target at `:9899/:9984`, outflow line at `:11126` with a `GIFT_LINE` constant. Add the type to `plan.ts` (list, kind `'event'`, params `{ amount }` with owner = giver, union). A temporary parse stub is enough for slice 1 tests.

Tests slice 1 must fail under mutation (all in a new `test/core-deprived-assets.test.mjs`, plus additions to existing files):
- The Services Australia example: 0, 3,000, 0, 6,000 and the expiry dates. Fails if the `- included` subtraction is dropped, the 5-FY window is 4 or 6 years, `lesser(…, amount)` is dropped, or `$10,000`/`$30,000` are swapped.
- Boundaries: a gift on 30 Jun vs 1 Jul (financial year), 1 May 2022 off at 2027-05-01, `<` vs `<=`.
- A couple's two partners' gifts in one FY share one $10,000 (fails if per-person); the household total equals the full excess, not half.
- `splitAssets` test: line appears in `assessableAssets` AND `deemedFinancialAssets` (fails if `deemed: false` or `treatment: 'protected'`), and `byPerson` is unchanged.
- `agePensionEntitlement` test: pension falls by exactly the assets-test taper for the amount, and the deeming figure rises by the lower-rate formula (fails if only one test sees it).
- Walk tests: month of gift has cash out and no deprived amount (no double count, fails if "from month 0"); the month after has both; reported `assessableAssets + protectedAssets` falls by exactly the gift (fails if phantom leaks to wealth); a pre-plan gift reaches month 0 and expires on schedule (fails if filtered through `applied`); a disabled gift has no effect; a gift older than 5 years has no effect.
- Aged care: with `ENTER_CARE`, `AgedCarePersonMeans.totalAssessableAssets` includes half the deprived amount per partner (fails if the aged-care path reads real assets).
- Control: `golden-demo-couple` and `demo-couple-fixture` unchanged; a plan without gifts has no `deprivedAssets` key.

**Slice 2: door, UI, guide, chat.**
- `parsePlan.ts` params (amount a positive integer, `giver` is a person in the household; refuse a giver not in the file as `:1883-1889` does; `household` allowed for a joint gift; a single person's gift is theirs).
- `entryForm.ts` (box labelled "as it will cost on the day $" style, an info button with the free-area statement), `planEdits.ts`, `entryLabels.ts`, `flowSeries.ts` (new category or "spending" with a table row), `toolCatalogue.ts`, `listEntries.ts`, `proposeEntries.ts`, `plan-money-basis-inventory` (nominal).
- `userguide.md` chapter and `scripts/build-guide.mjs`, `README.md`, TODO.
- Tests that fail on mutation: the door refuses a zero or negative amount, a fractional-cent amount and an out-of-household giver; the form round-trips (`app-entry-form`); catalogue params match the door (`app-chat-catalogue-params`); the counters 24/23 become 25/24; `userguide-figures` and `assumptions-prose-figures` pass with `$10,000`/`$30,000`; the chat-golden fixtures are unchanged.

## 5. Judgement calls (not settled by the register; `docs/assumptions-register.md` has only a "gift" mention in a home-sale row at `:4374`, and TODO.md has no gifting item)

- **J1: timing at month grain.** The assessment date is the 1st of each month (`projection.ts:7034`). Count deprived from the first month-start after the gift's month (the split reads opening cash, so counting in the gift's own month double-counts, as RAD does, `:11463`), up to a month-start strictly before gift date + 5 years. Matches Services Australia's "until 30 April 2027" for a 1 May gift; a mid-month gift runs half a month long.
- **J2: giver, death and `household` owner.** s 1126AC(4)-(5): if the giver dies the partner's inclusion ends; if the partner dies the survivor carries the whole amount. A `household`-owned gift is a joint disposal ((1)(b)); who is "the person" is unspecified. Suggest: giver dies and drops, non-giver dies and carries in full, `household` carries on to the survivor. Needs your ruling, or refuse GIFT in a plan that also has a DEATH.
- **J3: couple reading of the `(b)` subtraction.** Per-person halves are both "included in the assets of the person or of the partner"; use the household amount once, the reading the Services Australia example implies.
- **J4: exceptions are not modelled and the model counts every gift.** `s 1127(b)` unforeseen circumstances (first claim only, discretionary), granny flat interest, forgone wages, Special Disability Trust ($500,000), "give-back" under s 1126E, and sale for inadequate consideration. A door note should say so. The direction is conservative (pension lower).
- **J5: nominal.** The gift and the $10,000/$30,000 are nominal and never indexed (same ruling as register O86 for `ONE_OFF_EXPENSE`, and the statute itself). The deprived amount is held flat for its 5 years.
- **J6: gift too big for the cash.** Falls to the existing `Unfunded shortfall` path (the one-off precedent). The deprived amount still counts, since the disposal occurred.
- **J7: the reporting split in 2.1 (new `Month.deprivedAssets`).** The alternative, putting the phantom in `Month.assessableAssets`, is simpler but corrupts total wealth and the Pension-Only Age; not recommended.
- **J8: gifts by someone below Age Pension age.** They count only when the pension test runs (s 1127 only drops gifts more than 5 years before qualification). No special handling needed.

## Addendum, 2026-10-02: the after-death free areas (TODO GIFT-3 (a))

Source: Social Security Act 1991 `C2004A04121`, latest compilation (No. 233, compilation date 19 September 2026), volume 3, fetched again from the Federal Register API (`documents/find(... asatspecification='Latest' ... volumeNumber=3 ...)`, curl with a desktop Chrome UA, HTTP 200).

**A single person's tests count only that person's own disposals.**
- s 1126AA(1): "This section applies to a disposal (the relevant disposal) on or after 1 July 2002 of an asset by a person who is not a member of a couple at the time of the relevant disposal."
- s 1126AA(2): "If the amount of the relevant disposal, or the sum of that amount and the amounts (if any) of other disposals of assets previously made by the person during the income year in which the relevant disposal took place, exceeds $10,000, ..."
- s 1126AB(1) is the same as s 1126AA(1). s 1126AB(2): "(a) the sum of the amount of the relevant disposal and the amounts of any previous disposals of assets made during the rolling period by the person; less (b) the sum of any amounts included in the value of the person's assets during the rolling period under section 1126AA, 1126AC or 1126AD or any previous application or applications of this section; exceeds $30,000, ..."

**Transition from couple to single (joint disposals).**
- s 1126AA(3): "If, during the income year in which the relevant disposal took place but before the time of the relevant disposal, the person was a member of a couple who jointly disposed of an asset, a reference in subsection (2) to the amounts (if any) of other disposals of assets previously made by the person during that income year includes a reference to one-half of the amount of the joint disposal."
- s 1126AB(3): the same for the rolling period, "one-half of the amount of the joint disposal".
- The reverse direction is s 1126AC(2): a couple's test counts disposals "(whether before or after they became members of the couple)".

**Death (already built as ruling J2, unchanged).**
- s 1126AC(4) / s 1126AD(4): "If, after the disposal referred to in paragraph (1)(a), the person dies, no amount is to be included in the value of the assets of the person's partner because of that disposal."
- s 1126AC(5) / s 1126AD(5): "If, after the disposal referred to in paragraph (1)(a), the person's partner dies, any amount that, if the partner had not died, would have been included in the value of the assets of the partner because of that disposal is to be included in the value of the assets of the person."

**What is built, and where it departs from the text (both conservative, a lower or equal pension).**
- A gift dated after the death month is tested as a single person's: the pool is every earlier gift owned by the survivor or by `household`, including ones made before the death, inside the year / rolling period. The deceased's own gifts no longer use up the free areas.
- **Revised in review (LIZ), 2026-10-02:** a `household` (joint) gift is counted at ONE-HALF in that pool, as s 1126AA(3)/1126AB(3) say (the first build counted it in full; the user asked for the death implications fixed, and the text is clear, so the conservative fallback did not apply). Odd cents halve UP.
- The s 1126AB(2)(b) subtraction takes the SURVIVOR's share of what those pooled gifts included: one-half of a pre-death gift's included amount (a couple carries it one-half each), all of a post-death one; odd cents halve DOWN. The first build subtracted the whole household figure, which subtracts too much and OVER-STATES the pension — the opposite of its stated direction. The survivor's half of the deceased's own gifts, which the text would arguably also subtract, is still left out — the reading that cannot over-state.
- Gifts in or before the death month keep the couple test (s 1126AC/AD) and the J2 carry rules.
