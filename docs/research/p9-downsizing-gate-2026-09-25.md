# Downsizing cluster read-only gate — 2026-09-25

Scope: P9-3 DOWNSIZE, P9-4 (exemption + deeming), P9-5 DOWNSIZER_CONTRIBUTION, P9-6 (trade-off framing), P14-19 BUY_HOME. Read-only.

## 1. Built vs. needed
- **P9-4 is ALREADY DONE**, shipped inside `SELL_HOME` (P14-13c, 2026-09-25): `newHomeAmount` set-aside, 24-month `noHomeSaleProceedsExempt` window (still `homeowner: true` for the assets free area), lower-rate-only deeming separate from the pooled threshold (`agePension.ts:396-399`, `household.ts:1297-1373`, `AgePensionEntitlement.saleProceedsSetAsideDeemedPerFortnight`). Nothing to gate here.
- `DOWNSIZE`/`DOWNSIZER_CONTRIBUTION` are still `UnspecifiedParams` in `ENTRY_TYPES` (`plan.ts:346-348`) — no `parsePlan.ts` branch, no `projection.ts` branch, refused whole today.
- `plan.ts`'s own `DOWNSIZE` doc reads "sell and rebuy cheaper" — sale + repurchase + equity release. `SELL_HOME` is already the sale half; `newHomePurchaseDate` sits reserved and refused by name on `SellHomeParams` pending `BUY_HOME` (`parsePlan.ts:1301-1311`). **DOWNSIZE is therefore just SELL_HOME + BUY_HOME (+ optional DOWNSIZER_CONTRIBUTION) — no fifth entry type needed**; three honest facts beat one entry hiding them.

## 2. Sources
- Downsizer rules — live-fetched today (`dcterms.modified` 2026-01-19): age 55+ at contribution, 10+ years' ownership, main-residence CGT exemption, one per person per lifetime, NAT 75073 form, within 90 days of proceeds (or an ATO extension), $300k cap per person capped further by net proceeds, EXCLUDED from CC/NCC caps, INCLUDED in TSB "when it is calculated at the end of the financial year" (not on the contribution date), counts to TBC once moved to retirement phase — https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/how-to-save-more-in-your-super/downsizer-super-contributions
- Age Pension treatment once in super — already primary-sourced, not re-fetched: `p1-age-pension.md` line 451, https://www.servicesaustralia.gov.au/superannuation, primary-verified 2026-09-03; no downsizer carve-out exists, it is ordinary assessable super the month it lands.
- 24-month exemption/deeming — DSS Guide 4.6.3.90 (wayback 2025-11-16), already cited at P14-13c.
- TSB/TBC constants — `super.ts`, `p1-super-caps.md` §2/§6.5. **Gap**: the repo's own TSB timing (contribution date vs. next 30 June) is not yet recorded against the downsizer case above.

## 3. Smallest honest slices, in order, needing (no defaults)
1. **P14-19 BUY_HOME** — purchase price, purchase date (checked against an open window).
2. **P9-5 DOWNSIZER_CONTRIBUTION** — amount per person, contribution date, which sale's proceeds.
3. **P9-6 trade-off framing** — once P9-5 exists: a stated fact, `MORTGAGE_TARGET`'s "stillOwing" precedent, not a score.
4. **P9-3 DOWNSIZE** — retire the placeholder; do not build a composite entry.

## 4. Fixtures
No golden/digest fixture holds `DOWNSIZE`/`DOWNSIZER_CONTRIBUTION`/`BUY_HOME` — byte-identical on build, `HEAS_DRAW`/`SELL_HOME`'s own precedent. One fixture WOULD move if `DOWNSIZE` were ever specified: `test/fixtures/chat-golden/refusal.jsonl` (lines 3-5) uses it as its canned refused-type example — leaving it unspecified (§1, §3.4) keeps this untouched.

## 5. Verdict
- **P9-4**: done, not gated. **P9-3 DOWNSIZE-as-entry: NO-GO** — superseded, and building it is the one thing that moves a fixture.
- **P14-19 BUY_HOME: GO** — sourced, purchase price is a stated entry fact like `salePrice`/`securityValue`, no ADR-0005 market-value read, no fixture moves.
- **P9-5: CONDITIONAL GO** — rules sourced, but the TSB-timing gap (§2) must be resolved in writing first — named NO-GO until then.
- **P9-6: GO, after P9-5** — nothing to frame before it exists.
- Named NO-GO conditions per the brief: any rule unsourced (none here); an ADR-0005 market-value read (none of these four need one, all are user-stated point-in-time prices like every home entry since P9-1c); a moved golden/digest fixture (only DOWNSIZE-as-composite risks this — scoped out at §1/§3.4). "Leave it" is respected: nothing in `src/`, tests, or plan files is edited by this gate.
