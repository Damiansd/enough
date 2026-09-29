# Franking credits are in scope, and are modelled on both sides of the comparison

Dividend imputation is v1 scope: the **gross-up**, the **franking offset**, and the
**refundability of excess credits**. It is modelled wherever Australian equity income arises —
in the **Non-Super Portfolio** and **inside superannuation**, in both Accumulation Phase and
Retirement Phase. Modelling it on one side only is expressly forbidden by this decision.

This reverses the franking paragraph of
[ADR-0009](./0009-the-non-super-portfolio-is-funded.md), which is amended with a pointer here.

## Why this is its own ADR and not an amendment to 0009

ADR-0009's subject is the Non-Super Portfolio. Half of this decision is about **superannuation** —
a fund's earnings tax and the credits refunded against it — which is outside anything 0009 has
authority over, and burying it in a non-super ADR is how the both-sides requirement would get
lost. The other half *reverses a decision 0009 recorded* rather than extending it, and a reversal
that is only a footnote on the record it reverses is a record that reads as though it never
happened. 0009 keeps its history and gains a dated amendment; the new decision gets its own file.

## Why franking was parked twice, and why the second reason fails

| | Reason given | What killed it |
|---|---|---|
| Originally | "Nothing outside super to tax" — one reason, shared with CGT | ADR-0009. The Non-Super Portfolio became fundable, so the reason described a holding that had expired |
| Re-parked, same day | Distributions modelled as cash without imputation. The cost is understating after-tax return, **in the conservative direction**, for a second rules area's worth of machinery | This decision |

The replacement argument is not wrong about the facts. It is wrong about which figure it is
protecting.

**Erring conservative is sound for a figure you are not deciding on. It is wrong for the figure you
are deciding on.** Franking on an Australian equity ETF is of the order of **1.0–1.5% a year** of
return the model would never see, and the omission is **systematic in one direction** — it does not
average out over a forty-year horizon, it compounds. What it biases is the
**sacrifice-versus-invest** comparison (`concept.md` §5.12, TODO P6-8): understating the non-super
return pushes that comparison toward super. That comparison is the precise question the Non-Super
Portfolio was admitted to inform. A model that is quietly wrong in a known direction on the one
question it was extended to answer is thumbing the scale, and "we were conservative" is not a
defence when the conservatism is the error.

Second-order is also the wrong description. 1.0–1.5% a year against a return assumption in the
high single digits is a material fraction of the *difference* between two vehicles, which is the
only number the comparison actually reports. The magnitude of the bias is a fraction of the thing
being measured, not a fraction of the balance.

*The 1.0–1.5% figure is an order-of-magnitude estimate of the size of the bias, stated as the
reason for the ruling. It is not a sourced figure and nothing computes from it. See below.*

## ⚠️ The trap: model one side and the comparison is still wrong

This is the load-bearing half of the decision. Correcting the non-super side alone over-corrects,
and biases the same comparison the other way — a different wrong answer, with the same
invisibility.

Franking attaches to Australian equity income **wherever it is held**, and inside super the
treatment is arguably stronger than outside it:

| Holder | Tax on the income | The credit |
|---|---|---|
| Fund in **Retirement Phase** | **0%** — there is no earnings tax at all | Nothing to offset, so it is **fully refundable — cash back to the fund** |
| Fund in **Accumulation Phase** or TTR | **15%** | Largely or wholly offsets that liability; excess refundable |
| Individual, marginal rate above the gross-up rate | marginal | Reduces tax payable |
| Individual, low or nil taxable income in retirement | low or nil | Excess **refunded in cash** — Australia refunds where most jurisdictions waste |

The 15% and 0% are already in the model: `earningsTaxAccumulation` and `earningsTaxRetirement` in
`src/data/assumptions/super.ts`, register §3.1, rule P3-7. Franking inside super is therefore an
adjustment to an earnings-tax calculation the engine has to perform anyway — which is why the
super side is cheaper to build than it looks, and why leaving it out would have been a choice
rather than an oversight.

**The requirement, stated as a rule:** no surface may report the sacrifice-versus-invest comparison
with franking modelled on one side and not the other. TODO P6-8d makes that a task; §5.14 states it
in the design; this paragraph is what both cite.

## Consequences

- **The grossed-up amount is taxable income, and raises every income base with it.** Brackets,
  LITO, SAPTO's rebate income and the Medicare levy (`concept.md` §5.4, §5.14). The
  counter-intuitive case is a distribution that is tax-neutral in itself and still costs an offset,
  because the gross-up moved the base the offset tests against. This extends ADR-0001's amendment —
  a retiree drawing a non-super portfolio is bracket-sensitive — rather than changing it.
- **A credit is not spendable money in the month of the distribution.** It is an annual tax
  outcome. The Income Waterfall must not fund spending from a refund before the refund exists.
- **The 45-day holding rule is in scope as a stated assumption, not as machinery.** Buy-and-hold
  ETF positions qualify without effort and a small-shareholder exemption sits below a credit
  threshold, so day-level qualification tracking is machinery for a case the Household is not in.
  But disposal sequencing (ADR-0009, P3-21d) is exactly what could put it in that case. The engine
  therefore **assumes qualification, states the assumption on screen, and flags a disposal landing
  inside the window** instead of silently crediting it. If the flag ever fires in a real scenario,
  that is the argument for building the rule properly.
- **Franking percentage is a Setting, not an assumption.** How much of a given ETF's distribution
  is franked is a property of what it holds, varies year to year, and is not legislated. It is user
  input, displayed with the other Settings, and never a constant buried in the engine. The same is
  true of the fund's Australian-equity share on the super side.
- **Nothing is sourced yet, and the Phase 1 gate holds.** The gross-up rate (the corporate rate the
  paying company actually paid — not one rate for every company), the refundability provisions for
  an individual and for a complying superannuation fund, and the holding-rule threshold have **no
  primary source** and no entry in `docs/assumptions-register.md`. No figure for any of them
  appears in `concept.md`, in TODO, or here. **TODO P1-11** closes them, and `concept.md` §6 lists
  them as open. Nothing is hard-coded first.
- **Verification is arithmetic, and it covers both sides.** No free reference tool checks
  imputation the way Moneysmart checks the baseline, exactly as with CGT. **TODO P13-8** is a
  hand-worked franked distribution — an individual's refund at a low marginal rate *and* a fund's
  refund in Retirement Phase — as the sibling of the hand-worked disposal at P13-7. One-sided
  coverage here would let the one-sided modelling bug through, which is the whole point.
- **Shortfall Age moves later on both sides, and that is not optimism.** Franking is money actually
  received. Both projections improve; the comparison between them is what changes meaningfully, and
  it changes because it is now honest rather than because it is now generous.
- **The chat's refusal list loses another entry.** ADR-0006's out-of-scope refusal covered franking
  credits; the engine computes them now, so the ordinary rule applies — quote the engine's row,
  never a figure of the model's own. Amended there.
- **This reopens nothing else.** Not Monte Carlo, not investment property, not sell-to-rent, and
  not CGT or the Non-Super Portfolio, both of which are decided. Franking entered on a quantified,
  directional argument about a specific comparison. "The last argument was reconsidered" is not
  itself an argument, and the next entry off the Parked list needs its own — a *reversal* needing a
  better one than the entry it reverses.
