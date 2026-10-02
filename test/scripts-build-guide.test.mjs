// P17-1/P17-2 — the user guide build (`scripts/build-guide.mjs`): permanent labels, link text
// written from the heading, and the three ways the build must fail. P17-4/P17-5 — the `{{name|…}}`
// and `{{fig …|…}}` tags: stripped from the page, checked for shape, and a name checked against the app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAMES_THE_APP_DOES_NOT_SHOW, buildGuide, checkNames, checkTocNumbers, collectLabels, collectTags, lastLegislationRefresh, rewriteLinks } from '../scripts/build-guide.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(REPO, 'scripts', 'build-guide.mjs');
const GUIDE = readFileSync(join(REPO, 'userguide.md'), 'utf8');
const readTree = (dir) => readdirSync(dir, { withFileTypes: true, recursive: true })
  .filter((e) => e.isFile()).map((e) => ({ text: readFileSync(join(e.parentPath, e.name), 'utf8') }));

const tiny = (chapter3 = '## Chapter 3: Money in jars {#money-jars}') => [
  '## Which chapter do I need? {#which-chapter}',
  chapter3,
  '### The jars {#the-jars}',
  '## Chapter 84: Big words made small {#dictionary}',
  '',
].join('\n');

// Kills: dropping the `prior` check, so a second `{#x}` silently overwrites the first.
test('a label used twice fails the build', () => {
  const md = tiny() + '## Chapter 4: Pretend money {#money-jars}\n';
  const { errors } = collectLabels(md);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /duplicate label \{#money-jars\} \(first used on line 2\)/);
  const built = buildGuide(md, []);
  assert.equal(built.html, undefined);
});

// Kills: a link to a label that no heading carries being passed through unchecked.
test('a guide link to an unknown label fails the build', () => {
  const md = tiny() + '\nSee [Chapter 3](#money-jar).\n';
  const built = buildGuide(md, []);
  assert.deepEqual(built.errors, ['userguide.md:6: link to unknown label #money-jar']);
  assert.equal(built.html, undefined);
});

// Kills: buildGuide not running the `guide:` scan of src/, and the scan missing a reference.
test('a guide: reference in src/ to an unknown label fails the build, a known one does not', () => {
  const files = [
    { path: 'src/app/a.ts', text: "infoButton('x', 'guide:money-jars');\nconst more = 'guide:no-such-page';" },
    { path: 'src/app/b.ts', text: '// guide:the-jars is a section label, which is enough' },
  ];
  const built = buildGuide(tiny(), files);
  assert.deepEqual(built.errors, ['src/app/a.ts:2: guide:no-such-page names no label in userguide.md']);
  assert.equal(buildGuide(tiny(), files.slice(1)).errors.length, 0);
});

// Kills: the link text taken from the markdown (or left alone) instead of the heading as it is now.
test('renumbering a chapter rewrites every link to it; other link text is kept', () => {
  const links = '\nSee [Chapter 3](#money-jars), Chapters [3](#money-jars) to [84](#dictionary), '
    + '[Chapter 3: an old title](#money-jars), [in jars](#money-jars) and [the jars](#the-jars).\n';
  const render = (heading) => {
    const md = tiny(heading) + links;
    return rewriteLinks(md, collectLabels(md).labels).md.split('\n').at(-2);
  };
  assert.equal(render('## Chapter 3: Money in jars {#money-jars}'),
    'See [Chapter 3: Money in jars](#money-jars), Chapters [3](#money-jars) to [84](#dictionary), '
    + '[Chapter 3: Money in jars](#money-jars), [in jars](#money-jars) and [the jars](#the-jars).');
  assert.equal(render('## Chapter 9: Your *jars* {#money-jars}'),
    'See [Chapter 9: Your *jars*](#money-jars), Chapters [9](#money-jars) to [84](#dictionary), '
    + '[Chapter 9: Your *jars*](#money-jars), [in jars](#money-jars) and [the jars](#the-jars).');
});

// Kills: a missed label in the migration, a chapter heading left unlabelled, and the page losing
// its six folding Parts or the two pinned pages.
test('every link in the real guide resolves, and every chapter has a label', () => {
  const built = buildGuide(GUIDE, []);
  assert.deepEqual(built.errors, []);
  assert.equal(built.resolved, [...GUIDE.matchAll(/\]\(#/g)].length);
  // P17-3a added a handful of cross-references while restoring rules into the guide (372 → 379); the Chapter 15 heading's plain number became a link (380); the 2026-09-29 plain-language pass linked the first uses of the means tests and new dictionary entries (410); the sources appendix added its contents line, its own link and each chapter's link to its appendix section (437); filling the source gaps added links to the new Capital gains and Fees in super sections and more chapter source lines (447); the appendix's jump-to-a-topic list linked each of its 13 topic tables (460); Chapter 17's Retire question links the TTR chapter (462); LR-1 slice 4 linked Chapter 30 from Chapter 12's what-if and Chapter 55's new section, and Chapter 30 to Chapter 15 (465); retire flow S4's TTR start links Chapter 17 and its own section (467); retire flow S3's "Going back to work" section is linked from Chapters 17, 25 and 64 and links Chapter 64 and its appendix section (472); the ASFA Retirement Standard yardstick in the sources appendix links Chapter 20 (473); RF-2's TTR after going back links Chapter 25 from Chapter 18 (474); the rules-in-force panel's section in Chapter 79 links Chapters 14 and 85, and Chapter 68 links it (477); P3-4b slice 2's catch-up section in Chapter 23 links Chapters 65, 27 and 16 (480); P4-10a's last-top-up box in Chapter 8 links Chapter 50 (481); GIFT-3's two dictionary entries, Deprived asset and Gifting limits, link Chapter 49's gifts section (483); the Personal assets dictionary entry links Chapter 49's cars and contents section (484).
  assert.equal(built.resolved, 484);
  const chapters = GUIDE.match(/^## Chapter \d+: .*$/gm);
  assert.equal(chapters.length, 85);
  assert.deepEqual(chapters.filter((h) => !/ \{#[a-z0-9-]+\}$/.test(h)), []);
  assert.equal(built.html.match(/<details>/g).length, 6);
  assert.match(built.html, /<ul class="pinned"><li><a href="#which-chapter">Which chapter do I need\?<\/a><\/li><li><a href="#dictionary">Big words made small<\/a>/);
  assert.doesNotMatch(built.html, /\]\(#|\{#|\*\*|\{\{|\}\}/);
});

// Kills: an ⓘ box's "Read more" title typed by hand or read off the markdown rather than the heading
// as it is now, a section named without the chapter it sits in, and emphasis reaching the app (P17-3).
test('every label gets the title an ⓘ box shows: the chapter, and for a section the chapter and the section', () => {
  const titles = (heading) => buildGuide(tiny(heading), []).titles;
  assert.deepEqual(titles('## Chapter 3: Money in *jars* {#money-jars}'), {
    'which-chapter': 'Which chapter do I need?',
    'money-jars': 'Chapter 3: Money in jars',
    'the-jars': 'Chapter 3: Money in jars — The jars',
    dictionary: 'Chapter 84: Big words made small',
  });
  assert.equal(titles('## Chapter 9: Your jars {#money-jars}')['the-jars'], 'Chapter 9: Your jars — The jars');
  assert.equal(buildGuide(tiny() + '[x](#nowhere)\n', []).titles, undefined, 'titles were produced for a guide that failed');
});

// Kills: main() returning 1 without it reaching the exit code, and a write on failure.
test('the script exits non-zero and writes nothing on a bad guide; zero with the real guide and src/', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'build-guide-'));
  try {
    const src = join(dir, 'src');
    mkdirSync(src);
    writeFileSync(join(src, 'a.ts'), "'guide:money-jars'");
    writeFileSync(join(dir, 'bad.md'), tiny() + tiny());
    const bad = spawnSync(process.execPath, [SCRIPT, join(dir, 'bad.md'), src, join(dir, 'bad.html')], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /duplicate label \{#which-chapter\}/);
    assert.equal(existsSync(join(dir, 'bad.html')), false);
    assert.equal(existsSync(join(dir, 'app')), false, 'the titles were written for a guide that failed');
    const good = spawnSync(process.execPath, [SCRIPT, join(REPO, 'userguide.md'), join(REPO, 'src'), join(dir, 'help.html')], { encoding: 'utf8' });
    assert.equal(good.status, 0, good.stderr);
    assert.match(readFileSync(join(dir, 'help.html'), 'utf8'), /<h2 id="dictionary">Chapter 84: Big words made small<\/h2>/);
    // And the label → title map an ⓘ box reads, beside the page, from the same build.
    const { GUIDE_TITLES } = await import(join(dir, 'app', 'guideTitles.js'));
    assert.equal(GUIDE_TITLES.dictionary, 'Chapter 84: Big words made small');
    assert.equal(GUIDE_TITLES['investment-payout'], 'Chapter 30: Tax when you sell, and the franking credits bonus — The yearly payout, and the franking credits bonus');
    assert.equal(existsSync(join(dir, 'app')), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const APP = [{ path: 'src/app/a.ts', text: "button('Change the plan'); label('What “today’s money” means')" }];

// Kills: the name check not running, or reporting the wrong line; and curly/straight quotes counting
// as different, which would fail every quote of an app string written with ’.
test('P17-5: a name tag whose text is not in the app fails the build, naming the line', () => {
  const md = tiny() + '\nPress **{{name|Change the plan}}**, then open **{{name|What "today\'s money" means}}**.\n'
    + 'Or press **{{name|Change the plans}}**.\n';
  const built = buildGuide(md, [], { appFiles: APP });
  assert.deepEqual(built.errors, ['userguide.md:7: name "Change the plans" is not in src/ or public/index.html']);
  assert.equal(built.html, undefined);
  assert.deepEqual(buildGuide(md.replace('plans', 'plan'), [], { appFiles: APP }).errors, []);
});

// Kills: a tag's markup reaching the page, in a paragraph, in bold, or in a table cell.
test('a tag shows as its plain words and nothing else', () => {
  const md = tiny() + '\nPress **{{name|Change the plan}}**. They have {{fig retire-total-today nearest-1|$912,426}}.\n\n'
    + '| Pip |\n|---|\n| {{fig pip-super-today nearest-1|$500,000}} |\n';
  const { html } = buildGuide(md, [], { appFiles: APP });
  assert.match(html, /<p>Press <strong>Change the plan<\/strong>\. They have \$912,426\.<\/p>/);
  assert.match(html, /<td>\$500,000<\/td>/);
  assert.doesNotMatch(html, /\{\{|\}\}|name\||fig /);
});

// Kills: a malformed tag being skipped (and so shown raw, or never checked) instead of failing.
test('a malformed tag fails the build', () => {
  const md = tiny() + '\n{{fig no-rounding|$1}} {{fig k nearest-1000|$1,000}} {{name k|X}} {{name|Open\n';
  const { tags, errors } = collectTags(md);
  assert.deepEqual(tags.map((t) => [t.kind, t.key, t.rounding, t.text]), [['fig', 'k', 'nearest-1000', '$1,000']]);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /^userguide\.md:6: a fig tag needs a kebab key and a rounding/);
  assert.match(errors[1], /^userguide\.md:6: a name tag takes no key/);
  assert.match(errors[2], /^userguide\.md:6: an unclosed or malformed/);
});

// Kills: the known-missing list letting a name through that the app has since gained, or keeping
// an entry no tag uses — either way the list would stop describing the guide.
test('NAMES_THE_APP_DOES_NOT_SHOW can only shrink', () => {
  const tags = [{ kind: 'name', text: 'Monthly cost ceiling', line: 1 }];
  assert.deepEqual(checkNames(tags, APP, ['Monthly cost ceiling']), []);
  assert.match(checkNames(tags, [{ text: 'Monthly cost ceiling' }], ['Monthly cost ceiling'])[0], /is in the app now/);
  assert.match(checkNames([], APP, ['Monthly cost ceiling'])[0], /is not tagged anywhere/);
});

// Kills: the real build passing because names were never checked against the real app.
test('every name the real guide quotes is in the app, bar the known list', () => {
  const { tags, errors } = collectTags(GUIDE);
  assert.deepEqual(errors, []);
  const names = tags.filter((t) => t.kind === 'name');
  assert.ok(names.length > 400, `${names.length} name tags`);
  const app = [...readTree(join(REPO, 'src')), { text: readFileSync(join(REPO, 'public', 'index.html'), 'utf8') }];
  assert.deepEqual(checkNames(tags, app, NAMES_THE_APP_DOES_NOT_SHOW), []);
  assert.ok(checkNames(tags, app, []).length >= NAMES_THE_APP_DOES_NOT_SHOW.length);
});

// Kills: the contents check not running, or comparing against the wrong chapter.
test('a hand-typed contents number that no longer matches its chapter fails', () => {
  const md = ['# G', '## Table of Contents', '1. **[A](#a)** first', '2. **[B](#b)** second', '---',
    '## Chapter 1: A {#a}', '## Chapter 2: B {#b}'].join('\n');
  assert.deepEqual(checkTocNumbers(md, collectLabels(md).labels), []);
  const moved = md.replace('## Chapter 1: A {#a}', '## Chapter 3: A {#a}');
  const errors = checkTocNumbers(moved, collectLabels(moved).labels);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /userguide\.md:3: the contents says 1, but \{#a\} is Chapter 3 now/);
});

const NEW_TAB = 'target="_blank" rel="noopener noreferrer"';

// Kills: web links rendered as literal text, or opened in the same tab without rel.
test('an https link becomes a new-tab link, in a paragraph, a list item and a table cell', () => {
  const md = tiny() + '\nSee [the ATO](https://www.ato.gov.au/super) and [the jars](#the-jars).\n\n'
    + '- Read [Moneysmart](https://moneysmart.gov.au/retirement).\n\n'
    + '| Source |\n|---|\n| [Services Australia](https://www.servicesaustralia.gov.au/age-pension) |\n';
  const { errors, html } = buildGuide(md, []);
  assert.deepEqual(errors, []);
  assert.match(html, new RegExp(`<p>See <a href="https://www\\.ato\\.gov\\.au/super" ${NEW_TAB}>the ATO</a> and <a href="#the-jars">the jars</a>\\.</p>`));
  assert.match(html, new RegExp(`<li>Read <a href="https://moneysmart\\.gov\\.au/retirement" ${NEW_TAB}>Moneysmart</a>\\.</li>`));
  assert.match(html, new RegExp(`<td><a href="https://www\\.servicesaustralia\\.gov\\.au/age-pension" ${NEW_TAB}>Services Australia</a></td>`));
});

// Kills: the URL cut at its first `)`, and a web link's text rewritten like a chapter link's.
test('a URL with balanced parentheses is kept whole, and a web link is never rewritten', () => {
  const md = tiny() + '\n[Chapter 3](https://en.wikipedia.org/wiki/Superannuation_(Australia)) is a web page.\n';
  const { errors, html } = buildGuide(md, []);
  assert.deepEqual(errors, []);
  assert.match(html, new RegExp(`<p><a href="https://en\\.wikipedia\\.org/wiki/Superannuation_\\(Australia\\)" ${NEW_TAB}>Chapter 3</a> is a web page\\.</p>`));
  assert.equal(rewriteLinks(md, collectLabels(md).labels).md, md);
});

// Kills: `&` or `"` reaching the href unescaped, and `*` in a URL read as emphasis.
test("a web link's href is HTML-escaped", () => {
  const md = tiny() + '\n[Search](https://example.gov.au/find?q=a*b*c&x="y") here.\n';
  const { html } = buildGuide(md, []);
  assert.match(html, new RegExp(`<a href="https://example\\.gov\\.au/find\\?q=a\\*b\\*c&amp;x=&quot;y&quot;" ${NEW_TAB}>Search</a>`));
});

// Kills: an http:, javascript: or other scheme rendered as a link, or passed through silently.
test('a link that is neither #label nor https:// fails the build', () => {
  const md = tiny() + '\n[a](http://example.com) [b](javascript:alert(1)) [c](mailto:x@y.au)\n';
  const built = buildGuide(md, []);
  assert.deepEqual(built.errors, [
    'userguide.md:6: link to http://example.com is neither #label nor https://',
    'userguide.md:6: link to javascript:alert(1) is neither #label nor https://',
    'userguide.md:6: link to mailto:x@y.au is neither #label nor https://',
  ]);
  assert.equal(built.html, undefined);
});

// Kills: a fence rendered as paragraphs (lines joined, list lines turned into <li>), or left unescaped.
test('a fenced block is shown exactly as typed, escaped, and ends at its closing fence', () => {
  const md = tiny() + '\n```\nRefresh <the> rules & dates.\n- keep this dash\n```\nAfter.\n';
  const { errors, html } = buildGuide(md, []);
  assert.deepEqual(errors, []);
  assert.match(html, /<pre><code>Refresh &lt;the&gt; rules &amp; dates\.\n- keep this dash<\/code><\/pre>/);
  assert.match(html, /<p>After\.<\/p>/);
});

// Kills: the rules-in-force panel's "last checked" date typed into src/ (or taken from a `retrieved`
// date) instead of read off the guide's own footnote, and the build passing without the footnote.
test('the last legislation refresh date is read off the guide footnote, exported beside the titles, and required', async () => {
  const refreshed = lastLegislationRefresh(GUIDE);
  assert.match(refreshed ?? '', /^\d{4}-\d{2}-\d{2}$/, 'userguide.md has no "**Last Claude legislation refresh:**" line');
  assert.equal(lastLegislationRefresh('**Last Claude legislation refresh:** 3 Mar 2027\n'), '2027-03-03');
  assert.equal(lastLegislationRefresh('no footnote here\n'), undefined);
  assert.equal(lastLegislationRefresh('**Last Claude legislation refresh:** 3 Mar 2027\n**Last Claude legislation refresh:** 4 Mar 2027\n'), undefined);

  // The build writes it, and the app has no other source for it.
  const { LAST_LEGISLATION_REFRESH } = await import(join(REPO, 'dist', 'app', 'guideTitles.js'));
  assert.equal(LAST_LEGISLATION_REFRESH, refreshed);
  const [year, month, day] = refreshed.split('-');
  const typed = [refreshed, `${Number(day)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1]} ${year}`];
  // The code of the two files that draw the panel. (Comments carry the same calendar date as a ruling's date.)
  for (const file of ['settingsPanel.ts', 'rulesInForce.ts']) {
    const text = readFileSync(join(REPO, 'src', 'app', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const date of typed) assert.ok(!text.includes(date), `src/app/${file} types the refresh date ${date}`);
  }
  assert.match(readFileSync(join(REPO, 'src', 'app', 'settingsPanel.ts'), 'utf8'), /import \{ LAST_LEGISLATION_REFRESH \} from '\.\/guideTitles\.js';/);

  // A guide without the footnote does not build.
  const dir = mkdtempSync(join(tmpdir(), 'build-guide-'));
  try {
    writeFileSync(join(dir, 'no-footnote.md'), GUIDE.replace(/^\*\*Last Claude legislation refresh:\*\*.*$/m, ''));
    const run = spawnSync(process.execPath, [SCRIPT, join(dir, 'no-footnote.md'), join(REPO, 'src'), join(dir, 'help.html')], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Last Claude legislation refresh:\*\* D Mon YYYY" line is missing/);
    assert.equal(existsSync(join(dir, 'help.html')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
