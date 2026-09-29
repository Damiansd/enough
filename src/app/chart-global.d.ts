// The vendored Chart.js 4.4.4 is the UMD build, loaded by `<script src>` in `public/index.html`,
// so it arrives as `globalThis.Chart` and is NOT imported. `public/vendor/PROVENANCE.md` states
// why: the published ESM artifact imports the bare specifier `@kurkle/color`, which a browser with
// no bundler and no import map cannot resolve, and making it resolvable means editing vendored
// source and destroying the hash this project pins it by.
//
// Declared as narrowly as the one call site needs, and no narrower-looking-but-invented surface:
// a hand-written stand-in for Chart.js's real types would be a fiction that compiles, and the
// first option it got wrong would be a silent lie. So the config is `unknown`-ish by design — the
// thing worth checking about it is checked in `chartConfig.ts`'s test, not by this declaration.
//
// This file has no imports and no exports on purpose: that is what makes it a global script
// declaration rather than a module.
interface ChartInstance {
  destroy(): void;
}

interface ChartConstructor {
  new (canvas: HTMLCanvasElement, config: Record<string, unknown>): ChartInstance;
}

declare const Chart: ChartConstructor;
