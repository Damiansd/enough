// Franking and dividend imputation — register §5A. P3-28.
//
// **Read this first: ONE RECORD IN THIS FILE HAS A RUNTIME CONSUMER, and that is declared here
// rather than discovered later.** Since 2026-09-30 `src/core/individualFranking.ts` reads the VALUE
// of `smallShareholder.ceiling` (the frozen $5,000), so the rules-in-force panel and the gate share
// one record; nothing else below is read by a computation. `src/core/superFranking.ts` computes the whole super side of
// §5A — gross-up, offset, refundability, the three fact gates — and it reads **not one record
// below**. It does not import this module and must not: see "The one thing this module may never
// become", at the foot of this header.
//
// Why the records exist anyway, and why that is not the "recorded and consumed by nothing"
// failure this project keeps finding. §7 of the register lists twelve franking constants. Until
// this file, **none of the twelve was carried in code at all** — §5A was the only domain section
// of the register with no module under `src/data/assumptions/`, so `explainAssumption` answered a
// miss for every §5A figure and a §5A.3.1 refusal row citing a §5A figure was citing prose rather
// than a record. That is what this closes, and it closes nothing else. Franking is not "now
// modelled" because this file exists.
//
// Why no consumer exists, which is a decision and not an oversight. **Ten of the twelve** feed the
// **day-level qualification machinery** — 45-day counting, the primary/secondary windows, the 0.30
// net-delta at-risk test, LIFO parcel matching, the two $5,000 reliefs — and that machinery is out
// of scope by an explicit prior ruling, **P3-22e**: the engine assumes qualification, states the
// assumption on screen, and flags a disposal landing inside the window. `superFranking.ts` takes
// `qualifiedPerson` as a caller-stated boolean for exactly that reason. The **eleventh**, the 100%
// maximum franking percentage, is enforced by `superFranking.ts` as a *shape* — it validates
// `f ∈ [0,1]` — and the shape is written out there rather than read from here. The **twelfth**, the
// three refundability booleans, arrives as `FundFrankingFacts` **input**, also caller-stated.
// So these records are the *provenance* of rules the engine applies on a stated fact, and they are
// reachable through `explainAssumption` so that "why is a non-complying fund refused" has an
// answer with a source on it. **Precedent: O72 / P3-38** — a data layer ahead of its consumer is
// acceptable in this codebase **when declared**, never when discovered.
//
// **What is deliberately NOT here: §5A.2's corporate rates** — the 30% full company rate, the 25%
// base rate entity rate, the base rate entity test, the $50,000,000 aggregated turnover threshold
// and the previous-year imputation rule. Ruled out 2026-09-15 (P3-28, R-B), with the reason
// recorded so nobody adds them as an oversight fix. Two grounds. (1) §5A.2's own closing sentence:
// *"The model only ever needs the imputation column — and, per T43, normally does not need even
// that, because the credit arrives as a dollar figure on a statement."* Under the preferred route
// `grossed_up = franked + credit` and no rate is needed at all. (2) They are **config**, not
// constants: §5A.2 types every one of them `config` or `config (derived)` and stamps them
// `2026-27`, so §7's own rule — "everything not on this list is config and must be year-stamped" —
// excludes them structurally, the same way it excludes the general transfer balance cap. **The
// superseded claim, quoted once so it cannot come back unlabelled: §5A.3.1 said "§5A.2's 25% and
// 30% appear in §7's constants list and nowhere in the data layer". They do not appear in §7 at
// all, under any tag.** Building rates the register itself says the engine does not need is the
// speculative-infrastructure case this project has hit four times, and it is declined.
//
// **The one thing this module may never become.** T43: there is no portfolio-level gross-up rate
// in law, because s 202-60(2) fixes the rate to the entity making the distribution and a
// diversified holding spans both legislated rates at once. The effective rate is therefore a
// **Setting** — `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']` — and no record
// below is a rate a distribution is grossed up by. `franking.maximumFrankingPercentage` is the
// 100% **ceiling on `f`** (s 203-35(2)), not a rate applied to anything. Register §9's franking
// mutation "store a portfolio-level franking gross-up rate as an engine constant" is the mutation
// this paragraph and `test/assumptions-franking.test.mjs` exist to fail.
import { toCents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { deepFreeze } from './types.js';
import type { Constant, Money } from './types.js';

// --- Provenance blocks — every figure below is sourced, and an unsourced one cannot compile -----
//
// The franking pass ran on 2026-09-04, one day after the other three, which is why every
// retrieval date here is 2026-09-04 and not 2026-09-03 (register's own note, §0).

const HOLDING_RULE = {
  source: 'ITAA 1936 (former) Division 1A of Part IIIAA, as in force 30 June 2002, imported by ITAA 1997 ss 207-145(1)(a), 207-150(1)(a) (TD 2007/11)',
  retrieved: '2026-09-04',
  confidence: 'primary-verified',
  registerSection: '§5A.4',
} as const;

const SMALL_SHAREHOLDER = {
  source: 'ITAA 1936 (former) s 160APHT',
  retrieved: '2026-09-04',
  confidence: 'primary-verified',
  registerSection: '§5A.5',
} as const;

const REFUNDABILITY = {
  source: 'ITAA 1997 s 67-25 · s 63-10(1) item 40',
  retrieved: '2026-09-04',
  confidence: 'primary-verified',
  registerSection: '§5A.3',
} as const;

// --- The twelve §7 constants ---------------------------------------------------------------------
//
// Twelve §7 rows, fourteen records: §7's single "excess franking credits refundable" row carries
// three values sourced from three different provisions, and a record holds one source.
//
// Every one is `everyYear: true`. §5A's tables stamp them `2026-27` because every table in that
// section is stamped, but §7 lists them as constants that hold for every year of the Planning
// Horizon — the same treatment `super.ts` gives the fund earnings tax rates, which §3.1 stamps and
// §7 lists. A franking row that acquires an `fy` has been reclassified as config, which is the
// register-hygiene mutation §9 names.

export const FRANKING = deepFreeze({
  smallShareholder: {
    ceiling: {
      ...SMALL_SHAREHOLDER,
      kind: 'constant',
      everyYear: true,
      value: toCents(5_000),
      source: 'ITAA 1936 (former) s 160APHT(1)(b)',
      note:
        'T48 — FROZEN, and it must never receive a CPI or AWOTE uplift in any forecast year. ' +
        'The statute reads "does not exceed $5000" with no index factor, no indexation section ' +
        'and no regulation-making power over the amount; Division 1A\'s delegated-legislation ' +
        'hooks reach delta, material diminution, electors and prescribed related payments, and ' +
        'none of them reaches the $5,000. There is also no live provision to amend: the section ' +
        'was repealed on 14 September 2006 and what s 207-145(1)(a) imports is the text as in ' +
        'force at 30 June 2002. In FY2036-37 it is still $5,000. Its real-value erosion is a ' +
        'feature of the projection, not a bug — and its freeze must NOT be filed with the ' +
        'Division 293 $250,000 under one label (§3.6): those sit in live provisions Parliament ' +
        'could move, and this one does not.',
    } satisfies Money,

    eligibleEntities: {
      ...SMALL_SHAREHOLDER,
      kind: 'constant',
      everyYear: true,
      value: 'individuals only — a complying superannuation fund, APRA-regulated or SMSF, has no equivalent relief at any credit level',
      source: 'ITAA 1936 (former) s 160APHT(1)(a), "the taxpayer is an individual"',
      confidence: 'secondary-only',
      registerSection: '§5A.6 / O27',
      note:
        'T49, and the label is load-bearing (R6). The statutory words are primary-verified; the ' +
        'CONCLUSION that a fund has no equivalent is inferential — the ATO frames two separate ' +
        'alternatives (individuals → $5,000; funds → benchmark ceiling) and never negates the ' +
        'fund case in one sentence. O27 is CLOSED — ACCEPTED 2026-09-04 by user ruling, shipped ' +
        'as a labelled inference and not to be reopened without new evidence. Do not upgrade this ' +
        'to primary-verified and do not restate the conclusion bare. It is the same conclusion ' +
        'NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER carries in src/core/superFranking.ts, at the same ' +
        'confidence; that constant is stated there and is NOT read from here, because the module ' +
        'must stay readable without this one (see the header).',
    } satisfies Constant<string>,

    boundary: {
      ...SMALL_SHAREHOLDER,
      kind: 'constant',
      everyYear: true,
      value: 'credits <= 5000 qualifies — the statute says "does not exceed $5000"',
      source: 'ITAA 1936 (former) s 160APHT(1)(b)',
      note:
        'T48 — credits of exactly $5,000.00 QUALIFY. The ATO\'s Refund of franking credits for ' +
        'individuals page states it loosely as "less than $5,000" AND as "$5,000 or more", and is ' +
        'wrong at the boundary either way, so the statutory words decide. Shape: all-or-nothing. ' +
        'No taper, no shade-out, no partial claim — a holder above the ceiling who fails the ' +
        'holding rule claims NOTHING and cannot cap the claim at $5,000. Aggregation is at ' +
        'taxpayer and income-year level across the whole portfolio, not per parcel and not per ' +
        'company. Indirect distributions ARE covered — the words are "held or held an interest ' +
        'in" — and a related payment defeats reliance on the exemption (s 160APHT(2)).',
    } satisfies Constant<string>,
  },

  dividendWashing: {
    ceiling: {
      kind: 'constant',
      everyYear: true,
      value: toCents(5_000),
      source: 'ITAA 1997 s 207-157(4), inserted by Act No 68 of 2014',
      retrieved: '2026-09-04',
      confidence: 'primary-verified',
      registerSection: '§5A.7',
      note:
        'T50 — a SEPARATE rule from the small shareholder ceiling, and the two must not be ' +
        'conflated. This one relieves the DIVIDEND WASHING rule, not the holding period rule; it ' +
        'reads "$5,000 or less" rather than "does not exceed $5000"; and it does NOT reach ' +
        'indirect distributions, because s 207-157(5)(b) works the sum out without disregarding ' +
        'the Subdivision for interposed entities — the opposite of s 160APHT, which does. The ' +
        'widely circulated claim that "the small shareholder exemption does not apply to indirect ' +
        'distributions" is true of THIS rule and false of the other. Frozen literal, like the ' +
        'other. The "$2,000 ceiling reduced by $4 for every $1 of excess" claim is simply wrong: ' +
        'there is no taper on either rule.',
    } satisfies Money,
  },

  holdingPeriod: {
    days: {
      ...HOLDING_RULE,
      kind: 'constant',
      everyYear: true,
      value: { ordinary: 45, preferenceShares: 90 },
      source: 'ITAA 1936 (former) s 160APHO(1)–(2)',
      note:
        'Days AT RISK, continuous, and countable days are not calendar days — 45 countable days ' +
        'needs 46 calendar days on the parcel, because the day of acquisition is always excluded ' +
        '(see dayCounting). Satisfying the rule once for a parcel carries forward to later ' +
        'distributions on that parcel, unless the related payments rule applies, which is tested ' +
        'per distribution. NOT COUNTED by this model: P3-22e assumes qualification, states the ' +
        'assumption on screen and flags a disposal landing inside the window.',
    } satisfies Constant<{ readonly ordinary: number; readonly preferenceShares: number }>,

    widelyHeldTrustDays: {
      ...HOLDING_RULE,
      kind: 'constant',
      everyYear: true,
      value: 45,
      source: 'ITAA 1936 (former) ss 160APHP(1), 160APHE(2)',
      note:
        '45 days FLAT on the units, with NO 90-day preference-share variant, referenced to the ' +
        "trust's own ex-distribution date. This is the limb an ETF unitholder is on. " +
        's 160APHL(13) preserves a unitholder\'s interest as vested and indefeasible despite ' +
        'continuous creation and redemption of units, which is why a buy-and-hold ETF holder ' +
        'passes the gate permanently after ~46 days.',
    } satisfies Constant<number>,

    qualificationWindows: {
      ...HOLDING_RULE,
      kind: 'constant',
      everyYear: true,
      value: 'primary: the day after acquisition to the 45th/90th day after ex-dividend. Secondary: ±45 / ±90 days around ex-dividend',
      source: 'ITAA 1936 (former) s 160APHD definitions',
      note:
        'T47 — a related payment does NOT disqualify. It switches the test from the primary to ' +
        'the SECONDARY window (s 160APHO(1)(b)) and costs the $5,000 exemption (s 160APHT(2)). ' +
        'Testing a related-payment case against the primary window is the §9 mutation. A trustee ' +
        'distributing to a presently entitled beneficiary is not making a related payment ' +
        '(s 160APHN(5)) — which is why an ordinary ETF or managed-fund distribution does not trip ' +
        'the rule at all.',
    } satisfies Constant<string>,

    dayCounting: {
      ...HOLDING_RULE,
      kind: 'constant',
      everyYear: true,
      value: 'exclude the day of acquisition ALWAYS; exclude the day of disposal ONLY if disposed of; exclude days of material diminution WITHOUT breaking continuity',
      source: 'ITAA 1936 (former) s 160APHO(2), (3)',
      note:
        'T51 — two mutations live here. Counting the day of acquisition passes a parcel held ' +
        'exactly 45 calendar days, which must FAIL; 46 must pass. And breaking continuity when a ' +
        'materially-diminished day is excluded fails a parcel that must pass on the surrounding ' +
        'days.',
    } satisfies Constant<string>,
  },

  atRisk: {
    minimumNetDelta: {
      ...HOLDING_RULE,
      kind: 'constant',
      everyYear: true,
      value: 0.3,
      source: 'ITAA 1936 (former) s 160APHM(2), (3)',
      note:
        'A position is materially diminished if the net position BY DELTA retains less than 30% ' +
        'of the risks and opportunities. STRICT: below 0.30 fails, exactly 0.30 passes. Stored as ' +
        'a rate, never as a percentage — 30 would be a hundred-fold error against every other ' +
        'rate in this directory.',
    } satisfies Constant<number>,
  },

  parcelDisposalOrder: {
    ...HOLDING_RULE,
    kind: 'constant',
    everyYear: true,
    value: 'LIFO across substantially identical securities',
    source: 'ITAA 1936 (former) s 160APHI(4)',
    note:
      'Last in, first out — NOT FIFO and not the CGT parcel election. It is the rule that ' +
      'decides which parcel a disposal near an ex-distribution date eats into, and so which ' +
      'parcel has to satisfy the holding period.',
  } satisfies Constant<string>,

  maximumFrankingPercentage: {
    kind: 'constant',
    everyYear: true,
    value: 1,
    source: 'ITAA 1997 s 203-35(2), s 202-55',
    retrieved: '2026-09-04',
    confidence: 'primary-verified',
    registerSection: '§5A.1',
    note:
      "The ceiling on `f`, the franking percentage: anything above 100% is TAKEN to be 100%. It " +
      "is 100% of the PAYER'S OWN maximum — 3/7 per $1 of cash at 30% and 1/3 per $1 at 25% — so " +
      'it is NOT a gross-up rate and nothing is multiplied by it. T43: the rate a distribution is ' +
      'grossed up by belongs to the payer and the portfolio-level one is a Setting ' +
      "(SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']), never a figure here. " +
      "`superFranking.ts` enforces the shape of this row independently, by validating f ∈ [0,1] " +
      'without reading this record.',
  } satisfies Constant<number>,

  excessCreditsRefundable: {
    individual: {
      ...REFUNDABILITY,
      kind: 'constant',
      everyYear: true,
      value: true,
      source: 'ITAA 1997 s 67-25(1) · s 63-10(1) item 40',
      note:
        'In cash. No income test, no age test, no dollar cap. T46 — refundability is EQUAL on ' +
        'both sides, so refundability itself is not a super advantage; the whole franking ' +
        'advantage is the rate differential. Refunding on the super side while merely offsetting ' +
        'on the individual side manufactures a spurious super advantage of up to the full ' +
        'franking rate. STILL NOT READ BY ANY CODE, but no longer for the old reason: the '   +
        'individual side of franking EXISTS from 2026-09-22 (src/core/individualFranking.ts, ' +
        'P3-22) and applies this rule — it DECLARES the refundability record rather than ' +
        'importing it, on the same convention superFranking.ts uses and for the same reason ' +
        'given in this module\u2019s header. So the module header\u2019s claim that nothing consumes ' +
        'this file is intact; what has lapsed is the claim that there was nothing to consume it.',
    } satisfies Constant<boolean>,

    complyingFund: {
      ...REFUNDABILITY,
      kind: 'constant',
      everyYear: true,
      value: true,
      source: 'ITAA 1997 s 960-115 · s 67-25(1) · s 63-10(1) item 40',
      note:
        'In cash. A complying fund is not a corporate tax entity, so the s 67-25(1C)/(1D) denials ' +
        "that convert a company's excess credits into a tax loss do not reach it. This is the " +
        'record behind `superFranking.ts`\'s claim that decomposing one distribution at a time is ' +
        'EXACT rather than approximate — nothing is floored at nil on the way through.',
    } satisfies Constant<boolean>,

    nonComplyingFundOrAdf: {
      ...REFUNDABILITY,
      kind: 'constant',
      everyYear: true,
      value: false,
      source: 'ITAA 1997 s 67-25(1A)',
      note:
        'The ground of `NonComplyingFundError` (§5A.3.1). The credit is NOT denied — s 67-25(1A) ' +
        'makes the excess non-refundable, and this register row is a flat false and stops there. ' +
        'What the refusal protects is the decomposition, which stops being exact the moment a ' +
        "remainder is floored at nil. What happens to a non-complying fund's unusable remainder " +
        'is NOWHERE in the register, which is an argument from this document\'s contents and not ' +
        'an argument from absence about the world (R6).',
    } satisfies Constant<boolean>,
  },
});
