# The app is served over `http://localhost` by a ~40-line Node server

The tool is a browser app run on the user's own machine, served over `http://localhost` by a
Node server of about forty lines using only `node:http` and `node:fs`. It is never opened from
`file://`. Source is TypeScript, compiled by `tsc` to native ES modules and served as-is — no
bundler, no framework, one dev dependency and nothing at runtime.

## Why

**`file://` was never viable.** The original form factor — double-click `index.html` — is
incompatible with the ES modules this design specified from the first draft (concept.md:70).
Chrome gives a `file://` document an opaque origin, and module scripts do not load across one:
the app would fail on its first import, before any financial logic ran. This is a latent defect
being fixed, not a change of taste. Nobody has to be persuaded to give something up, because
what is being given up never worked.

**The server is an origin provider, not a backend.** It does two things: serve static files, and
read and write `plan.json` and `ledger.json` on disk. It holds no state, computes nothing, and
contains no application logic. Every rule in this repo — the means test, the caps, the waterfall
— runs in the browser, where `project()` stays pure and testable. Forty lines is the ceiling, and
it is a design constraint rather than an estimate: the moment the server knows what a Journal
Entry is, there are two places where the model lives and one of them is untested.

**Serving locally also retires an entire category of apparatus.** The File System Access API,
permission prompts, a localStorage store, an origin guard, port pinning — all of it existed to
survive a browser sandbox we are no longer sitting in. A process with disk access reads and
writes a file; that is the whole mechanism.

**Not Vite, and not any build tool.** A bundler earns its place by bundling, transpiling and
resolving dependencies. Here there is nothing to bundle (the browser loads modules natively),
nothing to transpile beyond types (`tsc` already emits the ES modules being served), and nothing
to resolve (one dev dependency, and Chart.js vendored as a committed file imported by relative
path). What remains is dev-server ergonomics we are already providing in forty lines. A build
tool would be ceremony, and it would be the largest dependency surface in a project whose
sensitivity is its data.

**TypeScript, though.** The engine is arithmetic over money and dates across five indexation
bases; the errors that matter here are the ones that look plausible. Types catch the class of
mistake — cents vs dollars, a nominal figure entering a real-dollar display, an `owner` omitted
— that a test only catches if someone thought to write it. That is worth one dev dependency and
a compile step. It is not worth a toolchain.

**"Must work offline in 2031" is retired as confused.** It sounded like durability and was
actually a hazard. A 2026-vintage forecaster opened in 2031 holds five-year-old tax brackets,
pension rates and deeming figures, and answers with exactly the same confidence it has today —
fluent, precise and wrong, which is the failure this whole project is organised against. The
requirement it replaced with is narrower and real: **no network dependency at runtime, and the
plan file is readable without the app.** What must last is the data, not the binary.

## How it applies

- One launcher script compiles, starts the server and opens the browser. There is no port-pinning
  apparatus and no origin guard; if the port is taken, take another.
- Chart.js is vendored as a committed file and imported by relative path — never CDN-fetched,
  never an npm runtime dependency. That is what "no network dependency at runtime" means in
  practice, and it is now the whole of the reason for vendoring it.
- Tests run on `node:test`, the built-in runner. Not Vitest, not Jest. The dependency count is
  the point: **npm total is one dev dependency, `typescript`.**
- The module boundary is asserted, not assumed: `core/` and `data/` never import `store/` or
  `app/`, checked by a small import-graph test. A boundary nobody tests is a boundary that erodes
  in the first hurried week.

## Consequences

- **Starting the app is a command, not a double-click.** That is a real cost, paid every session,
  and it buys a form factor that runs at all.
- **ADR-0006's argument survives, and the distinction is worth naming.** An origin provider is not
  a data intermediary. No financial figure transits this server on its way anywhere: every byte it
  touches goes between this machine's disk and this machine's browser. The chat's "the browser
  calls the provider directly, no intermediary server" claim is about the network boundary, and
  nothing here crosses it. Routing a model call through the local server would end that claim, so
  nothing may.
- **The security posture changed shape, not size.** A local HTTP server is reachable by anything
  else on the machine, which a `file://` page was not. Against that, no plan data now sits in
  browser storage at all, and the app makes no outbound request. Bind to loopback and leave it
  there.
- Anyone later tempted to "just add an endpoint" to the server — a computed total, a cached
  projection, a convenience — should read this first. The forty lines are the decision.
