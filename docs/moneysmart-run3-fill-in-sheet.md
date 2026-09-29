# Moneysmart run 3 — fill-in sheet

**Prepared 2026-09-21 for P4-7, and revised the same day against screenshots of the real form**, so
the sections, the field labels and the order below are the tool's own. Runs 1 and 2 are in
`moneysmart-baseline-2026-09-17.md` and `moneysmart-limb3-2026-09-18.md`.

You drive the tool; there is no API. It is a Willis Towers Watson widget posting to a closed
server-side engine, so the UI is the only legitimate route.

---

## Why this run exists, and why it is not a repeat

Three things changed in `enough` since run 2, each removing a reason the earlier comparisons could
not be trusted.

1. **Above-minimum drawdown now exists.** Runs 1 and 2 could not compare any scenario whose spending
   exceeds the legal minimum, because our Waterfall treated the minimum as a ceiling. It is now a
   floor. Their solve draws **8.99%** at 67 against a 5% minimum — always the interesting region,
   and we simply could not enter it.
2. **Fees now exist.** Runs 1 and 2 forced *their* fees to zero because we had none. **This run
   turns them on and matches them**, removing the single biggest known reason our engine runs rich.
3. **Figures are shown in today's money.** Every Moneysmart figure already is. You no longer need to
   deflate our output by hand — set our page to today's money and read the two side by side.

**Deliberately back to run 1's simple shape: super only, no shares.** Run 2's $500,000 share parcel
brought a second return rate with it (7.0% outside super against 5.6% in it) and that one difference
dominated everything. We have one return for all assets. Keeping shares out isolates what this run
is for.

---

## ⚠️ THE UNIT TRAP IS SOLVED — there is a selector, and you control it

Run 1's results table was **annual**, run 2's was **monthly**, and nothing in the exports said so.
**The screenshots show why: the black KPI panel on step 2 has its own unit dropdown, reading
`Per month`.** That is the control. It was never a mystery in the tool, only in the export.

**So: set it deliberately, and write down what you set it to.** Either unit is fine — recording it
is what matters. Cross-check it once against a KPI tile anyway (a stated annual goal ÷ 12 should
match a monthly tile), because a control and a table can still disagree.

Note there are *other* per-year/per-month selectors — on **Salary**, on each **contribution** field,
and on **Regular income** in step 2. They are independent. Check each one you touch.

---

## Step 1 — "Where you're at now"

### About you
| Field | Value |
|---|---|
| Age | **66** |
| Gender | *Prefer not to say* (or either; it changes nothing we are testing) |
| Salary `per year` | **$0** — confirm the selector reads **per year** |
| Retirement age | **67** |
| **Include a partner** | **OFF** — this run is single. Confirm the toggle is actually off; it is easy to misread |

### Your super savings
| Field | Value |
|---|---|
| Current balance | **$600,000** |
| How is your balance invested? | **Balanced** |
| Current contributions — Employer | **0%** and **$0** |
| Current contributions — Salary sacrifice | **0%** and **$0** |
| Current contributions — After-tax | **0%** and **$0** |

⚠️ **Your screenshots show three red cap warnings on these contribution fields** ("we have reduced
this amount so your total … don't exceed the ATO's $32,500 concessional contributions cap", and
$130,000 non-concessional). With a $0 salary and $0 contributions those should not fire — they look
like leftover state from a previous entry. **Clear them before running**, and if they persist with
all six fields at zero, screenshot it; that is a finding about their tool, not about ours.

> Worth noting for later: their caps are **$32,500 concessional / $130,000 non-concessional**. Ours
> floors later years at the $25,000 base. Irrelevant to this run — contributions are nil — but it is
> a real assumption difference if we ever compare a contribution scenario.

### Other assets and income to fund retirement
| Field | Value |
|---|---|
| Shares or managed funds (today's value) | **$0** |
| Cash in savings account (today's value) | **$0** |
| Investment property (today's value) | **$0** |
| Net rental yield (per year) | leave at **2%** — inert while the property is $0 |
| Other income (per year after tax) | **$0** |
| Start age / End age | leave unselected |

### Age Pension
| Field | Value |
|---|---|
| Include the Age Pension? | **Yes** |
| Will you own your own home? | **Yes** |
| Personal assets | **$0** — *their default is $25,000, so this must be overridden* |

### Inflation assumptions
| Field | Value |
|---|---|
| Inflation rate | **2.5%** |
| Wage inflation | **3.7%** |
| Deflator (before retirement) | **3.7%** |
| Deflator (after retirement) | **2.5%** |
| Your salary growth | **0.0%** |

### Investment assumptions
**Leave every rate at its default — do not edit this section.** Record that you did.

There are two separate tables, which matters: a **Super account return** column and a **Pension
account return** column, with different figures for the same label. With Balanced accumulation and
Conservative drawdown this run uses **Balanced super 6.1%** then **Conservative pension 5.6%** —
which is exactly what runs 1 and 2 recorded, now confirmed from the form itself.

| | Super account | Pension account |
|---|---|---|
| High Growth | 6.8% | 7.2% |
| Growth | 6.4% | 6.9% |
| **Balanced** | **6.1%** | 6.7% |
| Moderate | 5.7% | 6.3% |
| **Conservative** | 4.9% | **5.6%** |
| Cash | 3.7% | 4.3% |

Other assets: Cash 4.3%, Shares/Managed funds 7.0%, Investment property capital growth 3.7%.

### Administration fees and insurance premiums
**This section is the point of run 3.** Runs 1 and 2 zeroed it; now we match it.

> ⚠️ **CORRECTION, 2026-09-21, after run 3 was done — read before any re-run.** Run 3 was exported
> with the PENSION account fee left at **0%**, so it did not test fees as designed. More
> importantly, **their returns are already net of investment fees** — PDF page 5 heads the columns
> *"net of investment related fees, costs and tax"*. **The admin fee is the only separately-charged
> fee.** So when matching in `enough`: set our **investment fee to ZERO** and our return to their
> already-net rate, and charge only the admin fee. The instruction below to match every fee field
> would **double-count the investment fee**. See `moneysmart-run3-2026-09-21.md`.

**SUPER ACCOUNT**
| Field | Value |
|---|---|
| Insurance premiums (p.a.) | **$0.00** |
| Administration fee (p.a) | **$59.00** ← *changed from earlier runs* |
| Administration fee (% of balance) | **0.11%** |
| Administration fee cap | **$710.00** ← *changed* |
| Adviser service fee | **$0.00** |
| One-off advice cost | **$0.00** |

**PENSION ACCOUNT** *(note: no insurance premium field here — pension phase carries none)*
| Field | Value |
|---|---|
| Administration fee (p.a) | **$69.00** ← *changed* |
| Administration fee (% of balance) | **0.14%** ← *changed* |
| Administration fee cap | **$900.00** ← *changed* |
| Adviser service fee | **$0.00** |
| One-off advice cost | **$0.00** |

⚠️ **Read the applied fees back off THIS page, never off the PDF's disclosure page.** That page
prints the tool's generic boilerplate whatever you entered — the identical text appears in run 1's
PDF, where the entered values were different.

---

## Step 2 — "How much you'll need"

| Field | Value |
|---|---|
| Regular income `per year` | **$0** — leave the slider and the box at zero |
| Simple / Detailed | either; leave as found |

A zero target is what makes it **solve for a level income** rather than chase a goal. Run 1 did this
and got $64,370 a year.

**Set the KPI panel's unit dropdown deliberately here, and write it down.**

---

## Step 3 — "Review your options"

Two things my earlier draft assumed are **not** on step 1 in your screenshots, so please note where
they actually live:

1. **"Age for super to last" / run-out age = 92.** Run 1 recorded this as an input. Step 1 has no
   such field; step 2's chart shows **92** boxed on the axis with a "Super runs out" legend, which
   reads like an *output*. **Tell me which it is** — if it is an output, runs 1 and 2's inputs were
   mis-recorded, and that changes how their depletion age should be read.
2. **The post-retirement investment choice.** Step 1 only asks "How is your balance invested?"
   (Balanced). Where is Conservative-after-retirement set? If it cannot be set, the Conservative
   5.6% pension return may be applied automatically — worth knowing.

---

## What to bring back

### 1. The KPI tiles, with their unit
| Figure | Value | Unit |
|---|---|---|
| Retirement income target | 0 | dollars |
| Average estimated income | 51335 | dollars |
| Average income above/less than target | 51335 | dollars |
| Estimated balance at retirement (age 67) | ? I don't see this field. Did I miss it? | dollars |
| Age the money runs out | 92 (note: pension payments continue)| age in years |

### 2. The year-by-year table
Ages 67 to 100, all columns (Age Pension, your super, total). **Write the unit at the top**, and
which cross-check confirmed it.

| Age | Age pension | Your super | 
| --- | --- | --- |
| 67 | 9571 | 41764 |
| 68 | 10704 | 40631 |
| 69 | 11823 | 39512 |
| 70 | 12926 | 38409 |
| 71 | 14013 | 37321 |
| 72 | 15085 | 36903 |
| 73 | 16141 | 35194 |
| 74 | 17180 | 34155 |
| 75 | 18203 | 33132 |
| 76 | 19210 | 32125 |
| 77 | 20201 | 31134 |
| 78 | 20407 | 30928 |
| 79 | 20197 | 31137 |
| 80 | 20018 | 31137 |
| 81 | 19867 | 31468 |
| 82 | 19745 | 31590 |
| 83 | 19651 | 31684 |
| 84 | 19584 | 31750 | 
| 85 | 19545 | 31790 |
| 86 | 19533 | 31802 |
| 87 | 19097 | 32238 |
| 88 | 18631 | 32704 |
| 89 | 18177 | 33158 |
| 90 | 17733 | 33601 |
| 91 | 17301 | 34034 | 
| 92 | 16879 | 612 |
| 93 | 16467 | 0 |
| 94 | 16066 | 0 |
| 95 | 15674 | 0 |
| 96 | 15291 | 0 |
| 97 | 14918 | 0 |
| 98 | 14555 | 0 |
| 99 | 14200 | 0 | 
| 100 | 13853 | 0 |
NOTE: I didn't include the total as you can add the values and derive it as $51335 until age 91

### 3. Answers to the two step-3 questions above.

### 4. Save the PDF
Both previous runs were reconstructed from it, and the on-screen state is gone the moment a field
changes.

---

## What I do with it, and what will differ

I set `enough` to the same household — $600,000 in super, single, homeowner, retiring at 67 — enter
**their solved level income** as the spending target, enter the **same fees** in our new fee boxes,
and compare year by year with our page in today's money.

**Expected to agree:** the Age Pension column, the depletion age, and now for the first time the
effect of fees on the balance path.

**Known to differ — not defects:**

- **They charge no income tax on retirement income; we tax every month.** For a single retiree
  drawing super after 60 our answer should be near zero. **If it is not, that is a real finding**
  and one of the more valuable things this run can produce.
- **One return for all assets on our side.** Harmless here: this shape holds only super. But note
  their *super* and *pension* rates differ for the same label, so our single rate cannot match both
  phases at once — I will match the phase that dominates.

⚠️ **A prediction, written down so it can be wrong:** with fees charged, the solved income should be
**lower** than run 1's $64,370 for the same shape. **If it comes back higher, stop and tell me** —
something is wrong and I would rather hear it from you than quietly reconcile it.

⚠️ **An open residual from run 1.** Their implied balance path grows **3.150%** real between
assessments where their stated rate predicts **3.024%**, and their single accumulation year runs the
*opposite* way. Two gaps in opposite directions, so no single fee or timing convention explains
both. **Do not treat a divergence of that size in `enough` as a defect until this is explained** —
and turning their fees on is a plausible explanation, which is a further reason to run this.

---

## One thing worth knowing before you spend the time

This validates something **narrower** than "is `enough` right". The real overlap is the Age Pension
means test, the minimum drawdown and growth compounding. It cannot check our income tax, CGT, salary
sacrifice, the Superannuation Guarantee or Division 293 — this shape deliberately contains none of
them — and their engine is closed, so a match is evidence rather than proof.
