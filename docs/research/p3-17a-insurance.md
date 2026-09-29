# P3-17a slice 1 — death and TPD insurance inside super (2026-09-25)

**Source.** Aware Super, *Insurance Handbook – Employer Sponsored and Personal*, pp.17-18, fetched
2026-09-24: `https://aware.com.au/content/dam/aware/au/en/documents/member/disclosure/pds/Insurance-Handbook-Employer-sponsored-and-Personal.pdf`.
Table 1 (age-based cover scale) and Table 2 (annual death/TPD premium per $1,000), ages 15-69 by
age last birthday, are in `src/core/superInsurance.ts`. Cover ends at 70 (p.4). Insurance admin fee
$1.85 a month (p.16) — stated by the user, not defaulted.

**Formula.** Per interest, per benefit (death and TPD scaled separately), month *m*:
`premium_m = stated × f(age_m) / f(age_0)`, age_0 = age at the walk's first month.
Fixed cover: `f = Table 2 rate`. Age-based cover: `f = Table 1 cover × Table 2 rate`. Nil from 70.
Each benefit and the admin fee is a ceiled twelfth; one `Superannuation insurance` line; deducted
before growth, after the admin and investment fees in the balance-cap order.

**Why a ratio.** The fund's premium is `cover/1000 × rate × category factor × (1 + loading)`, and
for age-based cover `cover = multiple × Table 1`. Category factor, loading and multiple are
constant over time, so they cancel in `f(age_m)/f(age_0)`: the user states only what is on the
statement, and none of those three needs a field.

**Indexation.** Premiums are NOT CPI-raised: Table 2 is the fund's nominal schedule. The admin fee
is a flat price, raised by CPI (today's money), and is charged only while a premium is.

**Refused / not built.**
- A premium with no `statedInsuranceCoverKind` — refused at the door by name; never derived.
- A cover kind, or an insurance admin fee, with no premium — refused at the door.
- A premium stated at age 70+ or under 15 at the walk's start — refused by the walk (no table row).
- Fixed TPD cover's taper from 61 to nil at 70 (p.5) is NOT modelled: the ratio holds cover flat, so
  a fixed-TPD premium after 61 is OVER-stated (conservative direction).
- The inactive/low-balance switch-off (no cover under $6,000, or after 16 months without a
  contribution, pp.3-4) is NOT modelled: cover is charged while the balance lasts. Over-states cost.
- Income protection is out of scope.

## Slice 3 — `INSURANCE_COVER_CHANGE` (2026-09-25)

Per interest and benefit (`death`, `tpd`, `both`), from `date`: `premium_m = stated × f(age_m) / f(age_0) × coverFraction`,
each benefit still its own ceiled twelfth. Scaling the cover scales the premium because the category factor and
loading cancel in the ratio. The latest change in force for a benefit governs; `'both'` sets the two. The admin fee
stops once both premiums are nil. `coverFraction ≥ 1` is refused (raising cover needs underwriting); so are a benefit
with no stated premium and a date on or after the 70th birthday. One dated before `asAtDate` is refused
(LIZ 2026-09-25): a change already made is in today's stated premium, and applying it from month 0 would scale twice.
Still not built: income protection (its own gated follow-up), the fixed-TPD taper, the inactive switch-off.

