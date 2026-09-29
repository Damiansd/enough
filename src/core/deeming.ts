// P3-12 — deeming. Register §4.5, trap T30.
//
// Deeming replaces actual investment returns with an assumed rate for the income test: a lower
// rate on financial assets up to a threshold, an upper rate on everything above it. For this
// Household — whose entire assessable wealth becomes deemed financial assets at 67 — it is the
// single most sensitive Age Pension input.
//
// **The rates are not an assumption past 20 September 2026.** They have no formula, no index and
// no announced terminal rate: the Australian Government Actuary reviews six-monthly and the
// Minister determines by legislative instrument. `deemingRatesAt` in the assumptions module
// returns `undefined` past the last determination rather than extrapolating the three +0.5%
// steps that have happened in a row. `resolveDeemingRates` below is the only way into this
// module, and it **throws** when the rates are unknown and the caller has not supplied the
// Setting. A caller that ignores a missing rate must not get a number back.
import { mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { deemingRatesAt } from '../data/assumptions/agePension.js';
import type { AgePensionPeriod } from '../data/assumptions/agePension.js';
import type { DeemingRatesSetting } from '../data/assumptions/settings.js';
import type { IsoDate } from '../data/assumptions/types.js';

/** The Setting key `explainAssumption` answers for, quoted so the error message can be acted on. */
export const DEEMING_RATES_SETTING_KEY = 'agePension.deeming.ratesAfterLastDetermination';

export class MissingDeemingRatesError extends RangeError {
  readonly settingKey = DEEMING_RATES_SETTING_KEY;
  constructor(date: IsoDate) {
    super(
      `no deeming rates have been determined for ${date}. They are a discretionary Ministerial ` +
        `determination with no formula and no announced terminal rate (T30, register O2), so they ` +
        `must be supplied as the Setting "${DEEMING_RATES_SETTING_KEY}". Extrapolating the recent ` +
        `+0.5% steps would be a forecast wearing an assumption's provenance.`,
    );
    this.name = 'MissingDeemingRatesError';
  }
}

/**
 * The determined rates for `date`, or the Setting the caller supplied — never a guess.
 *
 * A supplied Setting wins even where a determination exists, because that is the scenario lever
 * (T30): "what if the Minister had gone further" is a question the tool must be able to answer.
 */
export const resolveDeemingRates = (date: IsoDate, setting?: DeemingRatesSetting): DeemingRatesSetting => {
  if (setting !== undefined) return setting;
  const determined = deemingRatesAt(date);
  if (determined === undefined) throw new MissingDeemingRatesError(date);
  return determined;
};

/**
 * The deeming threshold in force, for the Household as a whole.
 *
 * The couple figure is the **combined** threshold applied to **combined** financial assets — one
 * threshold for the Household, not one each. The register's third row, "member of a couple,
 * neither on a pension", is $55,300 each, which is exactly half the $110,600 combined figure, so
 * it produces the same answer on combined assets and needs no branch. That equality is asserted
 * in the tests, so if a future indexation breaks it the branch becomes visible rather than wrong.
 */
export const deemingThreshold = (period: AgePensionPeriod, couple: boolean): Cents =>
  couple ? period.meansTest.deemingThreshold.coupleCombined : period.meansTest.deemingThreshold.single;

export interface DeemedIncome {
  readonly financialAssets: Cents;
  readonly threshold: Cents;
  readonly rates: DeemingRatesSetting;
  readonly lowerPortion: Cents;
  readonly upperPortion: Cents;
  readonly annual: Cents;
  readonly perFortnight: Cents;
}

/**
 * Deemed income on a Household's financial assets.
 *
 * Rates are per annum, so the annual figure is the honest one and the fortnightly figure is
 * derived from it — deeming each fortnight's slice separately would round 26 times instead of
 * once. Services Australia's own fortnightly rounding convention is not in the register (the
 * same gap the register records as O22 for HEAS interest), so `perFortnight` is the annual
 * figure divided by 26 and rounded to the cent, and the model will not tie to a Centrelink
 * statement to the cent. Recorded rather than assumed away.
 */
export const deemedIncome = (
  financialAssets: Cents,
  threshold: Cents,
  rates: DeemingRatesSetting,
): DeemedIncome => {
  const belowThreshold = (financialAssets < threshold ? financialAssets : threshold) as Cents;
  const aboveThreshold = financialAssets > threshold ? subCents(financialAssets, threshold) : toCents(0);
  const lowerPortion = mulCents(belowThreshold, rates.lower);
  const upperPortion = mulCents(aboveThreshold, rates.upper);
  const annual = (lowerPortion + upperPortion) as Cents;
  return Object.freeze({
    financialAssets,
    threshold,
    rates,
    lowerPortion,
    upperPortion,
    annual,
    perFortnight: mulCents(annual, 1 / 26),
  });
};
