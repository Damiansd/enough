// One short sentence on the page, the long explanation collapsed behind it. Native
// <details>/<summary>: keyboard-operable and touch-operable with no script and no library, the same
// primitive the panels in `public/index.html` use, at field granularity.
//
// ⚠️ **It is never open on load.** Nothing here sets `open`, and nothing may: a disclosure that
// opens itself is the paragraph it was meant to fold away.
//
// P17-3: a box may end in "Read more → Chapter N: Title", a link into the user guide
// (`dist/help.html`) in its own tab. The call site writes `guide:` and the label as one string literal, which is what
// `scripts/build-guide.mjs` scans `src/` for, so a label the guide lost fails the build; the chapter
// number and title come from the guide's own headings at build time (`guideTitles.d.ts`).
//
// DOM only, so untested for the reason `entryForm.ts` is (TODO.md P2-9a): the words themselves are
// decided in the pure layers that call this.

import { GUIDE_TITLES } from './guideTitles.js';

export type GuideReference = `guide:${string}`;

/**
 * `shortLabel` is what stays on the page and must read on its own; `detailText` is what opens.
 * A `<p>` in the same slot as the `<p class="caveat">` this replaces, so a flex row is unchanged.
 */
export const infoButton = (shortLabel: string, detailText: string, guide?: GuideReference): HTMLDetailsElement => {
  const box = document.createElement('details');
  box.className = 'info';
  const summary = document.createElement('summary');
  summary.textContent = `${shortLabel} ⓘ`;
  const detail = document.createElement('p');
  detail.className = 'info-detail';
  detail.textContent = detailText;
  box.append(summary, detail);
  if (guide !== undefined) {
    const label = guide.slice('guide:'.length);
    const more = document.createElement('p');
    more.className = 'info-more';
    const link = document.createElement('a');
    link.href = `help.html#${label}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `Read more → ${GUIDE_TITLES[label] ?? 'the user guide'}`;
    more.append(link);
    box.append(more);
  }
  return box;
};
