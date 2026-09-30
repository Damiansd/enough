// P17-3 — the label → "Chapter N: Title" map an ⓘ box's "Read more" link shows. There is no source
// for it here: `scripts/build-guide.mjs` writes `dist/app/guideTitles.js` from `userguide.md`'s
// headings at build time, so a chapter number in the app is never typed by hand.
export declare const GUIDE_TITLES: Readonly<Record<string, string>>;
/** The guide's "Last Claude legislation refresh" footnote as an ISO date; the build fails without it. */
export declare const LAST_LEGISLATION_REFRESH: `${number}-${number}-${number}`;
