# An outside AI tool reads the engine through a local connector; the in-app chat is held in reserve

Decided 2026-09-23, from the review recorded in [plan_ai.md §12](../../plan_ai.md). Phase 15 is
delivered as a **local MCP connector**: a small Node program that exposes the engine's read tools
to Claude Desktop. It is **not** a chat panel inside `enough`. The in-app chat in plan_ai.md §9
stays designed but unbuilt, and it has one named trigger to come back.

This amends [ADR-0006](./0006-the-chat-never-computes.md). A note there points here.

## What stays exactly as ADR-0006 says

- **The model never computes a number.** Every figure comes from `project()` and the modules
  around it, running in Node against the real `plan.json`.
- **Nothing the AI does writes the plan.** The connector reads `plan.json` at the fixed path the
  server uses and takes no path from the AI. It has no write function.
- **No proxy.** No model call passes through the connector. The AI tool calls the connector, and
  the connector calls nothing.
- **Out of scope means refusing.** `whatCanYouModel()` is derived from code, as in plan_ai.md §5.

## What changes, and why it is written down rather than implied

**1. "No figure the engine didn't produce" becomes an instruction, measured. It is no longer a
mechanism.** In the in-app design, chips and a scanner enforce the rule on screen. In Claude's
window, `enough` controls nothing Claude writes. The rule is kept in place three ways:

- **By design.**
  - Every figure leaves the connector as a string with its basis already attached, for example
    `$31,240 (today's money)`.
  - A what-if returns the engine's own difference from the current plan.
  - The connector has **no comparison tool**, and Claude never ranks two options. For "A or B",
    each option comes back as a suggestion, and you compare them as scenarios in `enough`'s chart.
- **By instruction.** The connector's built-in instructions state the rule.
- **By measurement.** There are 13 golden questions, run on demand through `claude -p`, restricted
  to the connector's tools and launched outside the repo. A script collects every `$` figure in
  Claude's final answer, and each one must appear word for word, basis label included, in a tool
  result from the same conversation.

**The trigger:** **one** invented figure, or **one** figure with the wrong basis, in a golden run
sends Phase 15 back to the in-app chat. Only the in-app chat can enforce the rule mechanically.

**2. Hosted is acceptable; identity does not leave.** Dollar figures go to the AI provider
unchanged. People are sent as Person A and Person B, ages replace dates of birth, and no names
are sent. Private mode (plan_ai.md stage 6) is dropped. It relied on a chip renderer that Claude's
window doesn't have. ADR-0006's "local model first" is demoted from settled precedent. Local
models are recorded when they work, but not promised.

**3. Suggestions come back as words, not codes.** `proposeEntries` still runs the parse checks
and a trial walk. It returns the entries in the entry table's own wording, and you add them
through the ordinary form. Nothing is queued anywhere. ADR-0006's "an unaccepted proposal leaves
no trace" holds trivially.

**4. Phase 13 warns; it does not block.** The page already shows the same figures, and nothing
checks them either. The connector carries a list, kept in code, of areas not yet checked against
outside calculators, and Claude repeats the warning when a what-if touches one. Each Phase 13 item
removes its entry in the commit that closes it.

**5. Today's money by default.** With no page toggle to follow, every tool defaults to today's
money. Claude switches to future dollars only when asked, or when quoting a figure you'd check
against a statement, and says it has switched.

## Consequences

- **The connector is written by hand with no dependency.** It speaks stdio JSON-RPC (`initialize`,
  `tools/list`, `tools/call`) and announces a fixed protocol version. P2-9a still holds:
  `typescript` remains the only dev dependency. The connector is tried against the real client at
  each stage.
- **Tools stay pure and page-free**, so the in-app chat can reuse them if the trigger fires.
- **Carry-forward is a stated limit.** Unused concessional cap carried forward isn't modelled,
  because the plan has no contribution history. `whatCanYouModel()` says so, and a top-up above
  the cap is refused by name.
- **What is accepted:** a rule that is measured rather than enforced, and dollar figures held by a
  third party. Both are stated here so that neither is later mistaken for an oversight.

## Note, 2026-09-24 — the trigger fired; the in-app chat goes ahead

The second live golden run (after three tooling fixes) scored 12 of 13. The failure was genuine.
In W6, Claude summarised exact tool figures as "about $62k less a year" and "about $18k more a
year in tax". The "$18k" is a rounded copy of $18,375.48. The "$62k" matches no single tool
figure and looks like an average of two years, which is model arithmetic.

This is the failure the trigger exists to catch. **The user chose to honour it (option A).** The
in-app chat (plan_ai.md §9, stages 3–5, with the chip guard) is built, reusing the read tools. The
connector stays available as a secondary route, with a stated caveat: figures in Claude's own
summaries are not guaranteed, and the tool results are.
