# Compute in nominal dollars internally, display in today's dollars

The obvious choice for a personal forecaster is to model in today's real dollars with a single
inflation assumption: it is simpler, and the output is directly legible. We are not doing that.
The engine computes in nominal dollars and converts to today's dollars only at the display
layer.

## Why

Australian financial parameters index on **five different bases**, and they interact in every
projected year:

| Basis | Parameters |
|---|---|
| Not indexed at all | Tax brackets, LITO, SAPTO, Div 293 $250k, $500k carry-forward TSB limit, both Age Pension taper rates, energy supplement |
| CPI, annual | Transfer balance cap, means-test free areas, deeming thresholds, Medicare levy thresholds |
| CPI twice-yearly, PBLCI floor | Age Pension supplement |
| Wage-linked (AWOTE / MTAWE) | Contribution caps, maximum contribution base, **Age Pension maximum rate** |
| Ministerial discretion | Deeming rates |

A single real-dollar knob assumes every parameter tracks CPI. None of these do, and the errors
do not cancel — they have opposite signs in different parts of the same projection:

- **Accumulation years:** tax brackets have never been indexed. At 2.5% CPI, unindexed
  thresholds erode ~52% in real terms over 30 years. Real-flat modelling implicitly assumes
  full indexation and so **overstates** after-tax income and savings capacity, plausibly by
  8–15% over a working life.
- **Drawdown years:** the Age Pension *rate* is benchmarked to wages (MTAWE) while its own
  *means-test thresholds* are CPI-only. At 1% real wage growth the rate grows ~35% in real
  terms over 30 years while the cut-out thresholds stay flat. Real-flat modelling therefore
  **understates** the full Age Pension and simultaneously **overstates** part-pension
  eligibility and duration.
- Contribution caps are wage-indexed and would be **understated ~30–35%** over 30 years.

No value of a single inflation knob reproduces a divergence between three indices.

## Consequences

- All rates entered by the user are nominal. The assumptions object needs CPI **and** a wage
  growth (AWOTE) assumption as separate knobs; deeming rates are a manual policy input, not
  derived from either.
- Display converts to today's dollars using the CPI assumption. Charts must state which basis
  they are showing — this is the most likely place to confuse yourself later.
- Bracket creep matters far less than expected *in retirement*, because super income from a
  taxed source is tax-free from 60. A retiree drawing only super income is nearly
  bracket-insensitive. The creep damage is concentrated in the working years.

**Amended 2026-09-04** ([ADR-0009](./0009-the-non-super-portfolio-is-funded.md)): that last point
holds only for a retiree drawing *only* super. The Non-Super Portfolio is now first-class in the
model — empty today, fundable at any time — and a retiree drawing it is bracket-sensitive again.
Distributions and the discounted half of a capital gain are ordinary taxable income, so they run
through unindexed brackets, LITO, SAPTO's rebate income and the Medicare levy. Two things follow,
and neither is a change of decision:

- **The nominal engine taxes inflation, correctly.** A CGT cost base is not indexed for assets
  acquired after 21 September 1999. The nominal gain therefore includes the inflation component and
  is taxed on it, which is what actually happens — a real-dollar engine would have had to
  reintroduce the nominal figure to get the tax right.
- **The display conversion needs care around a gain.** A capital gain shown in today's dollars is a
  real figure computed from a nominal event; the tax on it was assessed nominally. Charts state
  their basis (above), and this is the sharpest case of why.
