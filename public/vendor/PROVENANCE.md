# Vendored runtime assets

Nothing in this directory is ours. Nothing in it is fetched at runtime — that is the
whole point of vendoring it (ADR-0007). Each entry below must carry a version, a
source, a hash, and the date it was taken.

Both files come from the **published npm artifact** for `chart.js@4.4.4`, and both were
downloaded independently from `cdn.jsdelivr.net` and `unpkg.com` and confirmed
**byte-identical** (`cmp`) before being committed, so neither CDN is doing anything of
its own.

## chart.umd.js

| | |
|---|---|
| Library | Chart.js |
| Version | **4.4.4** |
| File | `dist/chart.umd.js` |
| Size | 205,475 bytes |
| SHA-256 | `fed6a739f8d0f0687174de6cd14745fc0fc7809144ab113d22908a26bf0d7fea` |
| Taken | 2026-09-18 |
| Licence | MIT (header retained in the file, unmodified) |

## chart.umd.js.map

| | |
|---|---|
| File | `dist/chart.umd.js.map` |
| Size | 955,163 bytes |
| SHA-256 | `e5849a182620bef84bb6cb8cf274e4766a5b1d6b31cc4538cf179397f14bb2c5` |
| Taken | 2026-09-19 |

The bundle's last line is `//# sourceMappingURL=chart.umd.js.map`, so the map resolves
relative to the bundle and needs no configuration. Without it devtools logged a 404 and
then a `may not load or link to file:///` error on every page load.

**The map is not merely console hygiene — it is the answer to the strongest objection
against vendoring this library at all.** The case against was that a project whose
governing constraint is auditability would be committing ~200 KB of unreadable minified
code. The map carries `sourcesContent` for **all 74 original TypeScript sources**, so the
vendored library is now readable and steppable from its own source rather than being an
opaque blob. It costs 955 KB on disk, is never parsed at runtime, and is only ever
fetched when devtools is open.

## Re-verifying

Neither hash may change without a deliberate version bump recorded here:

    curl -fsSL https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.js     | shasum -a 256
    curl -fsSL https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.js.map | shasum -a 256

⚠️ **Do NOT take either file from jsDelivr's `/+esm` endpoint.** That endpoint re-bundles
the package on their server with whatever Rollup/esbuild version is current, says so in
its own header, and is explicitly not SRI-stable — so it cannot be pinned or re-verified
later. The `/dist/…` paths above are the published artifacts and reproduce their hashes.

## Why the UMD build and not the ES module build

Chart.js's own ESM artifact (`dist/chart.js`) imports the bare specifier `@kurkle/color`,
which a browser with no bundler and no import map cannot resolve. Making it resolvable
means either vendoring a second file and **editing the import statement inside vendored
source** — which destroys the hash-verifiability above — or adding the bundler this
project has refused. The UMD bundle is self-contained and unmodified, so it stays
verifiable.

**The consequence, named rather than hidden:** it is loaded with a `<script>` tag that
sets `globalThis.Chart`, not with `import`. ADR-0007's wording says "imported by relative
path". The intent of that wording — vendored, never CDN-fetched at runtime, no bundler —
is fully honoured; the literal mechanism differs, because honouring it literally would
have required modifying a third-party file. The `<script src>` is still a relative path
and still resolves inside `dist/`.
