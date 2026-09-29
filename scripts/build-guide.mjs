// P17-1/P17-2 — turns `userguide.md` into `dist/help.html`. Run by `npm run build`, after tsc and
// the copy of `public/`, so the page is served by the existing server and works offline.
//
// The markdown is the only thing anyone edits. This is a hand-written converter for exactly the
// subset the guide uses — `#`/`##`/`###` headings, paragraphs, `-` and `1.` lists (nested by
// indent), `>` quotes, `|` tables, `---`, and inline `**bold**`, `*italic*`, `` `code` `` and
// `[text](#label)` and `[text](https://…)`, and ``` fenced blocks (shown as typed, for copying). Anything else renders as its literal text, escaped. No
// library, by rule.
//
// WEB LINKS. `[text](https://…)` opens in a new tab (`target="_blank" rel="noopener noreferrer"`).
// The URL may hold one level of balanced parentheses (`…/Act_(1999)`). Any other scheme in link
// form — `http:`, `javascript:`, `mailto:` — fails the build; a bare `https://…` in text stays
// literal, never auto-linked. Web links are never checked against labels or rewritten.
//
// LABELS. A heading may end in `{#some-label}` (lower-case kebab). Every chapter heading carries
// one, named after its subject and never its number, so it survives renumbering. Guide links
// point at labels: `[Chapter 15](#assumptions)`. For a link to a CHAPTER the build replaces the
// link text from the heading as it stands now: `Chapter N` (or `Chapter N: …`) becomes
// `Chapter N: Title`, and a bare number (`Chapters [8](#…) to [13](#…)`) becomes the number. Any
// other link text, and every link to a section label, is kept as written.
//
// THE `guide:` CONVENTION. Code under `src/` names a guide page by writing the string
// `guide:some-label` (e.g. an ⓘ box's "Read more" target, P17-3). The build scans `src/` for it.
//
// TAGS (P17-4, P17-5). Words the guide makes a promise about are wrapped in a tag, which the page
// shows as its plain text only — the tag itself never reaches the HTML. A tag sits on one line.
//
//   {{name|Change the plan}}             the app's own wording: a button, box, panel or column name
//   {{fig retire-total-today nearest-1|$912,426}}
//                                        a Pip-and-Jo figure: a key, and the rounding the sentence
//                                        uses (`nearest-N` or `down-N` in the figure's own unit, or
//                                        `month` for a "March 2051")
//
// A `name` tag's text must appear, as written, somewhere in `src/` or `public/index.html` (curly
// and straight quotes count as the same), or the build fails naming the line. `fig` tags are checked
// by `test/userguide-figures.test.mjs`, which runs Pip and Jo's plan; the build only checks their shape.
//
// The build FAILS (exit 1, every problem listed) when a label appears twice, when a guide link
// names an unknown label, when a link is neither `#label` nor `https://`, when a `guide:` reference in `src/` names an unknown label, when a tag
// is malformed, or when a `name` tag's text is not in the app.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PINNED = ['which-chapter', 'dictionary'];
// `[text](target)`, the target allowed one level of balanced parentheses.
const LINK = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const isWebLink = (target) => /^https:\/\/[^\s]/.test(target);

export const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function splitHeading(line) {
  const m = /^(#{1,6}) (.*)$/.exec(line);
  if (!m) return null;
  const tag = /\s*\{#([^}]*)\}\s*$/.exec(m[2]);
  return { level: m[1].length, text: tag ? m[2].slice(0, tag.index) : m[2], label: tag ? tag[1] : undefined };
}

// Every labelled heading: label → { line, text, chapter?, title? }.
export function collectLabels(md) {
  const labels = new Map();
  const errors = [];
  md.split('\n').forEach((line, i) => {
    const h = splitHeading(line);
    if (!h || h.label === undefined) return;
    if (!LABEL.test(h.label)) return errors.push(`userguide.md:${i + 1}: label {#${h.label}} is not lower-case kebab (a-z, 0-9, -)`);
    const prior = labels.get(h.label);
    if (prior) return errors.push(`userguide.md:${i + 1}: duplicate label {#${h.label}} (first used on line ${prior.line})`);
    const ch = /^Chapter (\d+): (.*)$/.exec(h.text);
    labels.set(h.label, ch ? { line: i + 1, text: h.text, chapter: Number(ch[1]), title: ch[2] } : { line: i + 1, text: h.text });
  });
  return { labels, errors };
}

// Points each `](#label)` at its heading and rewrites a chapter link's text from that heading.
export function rewriteLinks(md, labels) {
  const errors = [];
  let resolved = 0;
  const out = md.split('\n').map((line, i) => line.replace(LINK, (all, text, to) => {
    if (isWebLink(to)) return all;
    if (!to.startsWith('#')) { errors.push(`userguide.md:${i + 1}: link to ${to} is neither #label nor https://`); return all; }
    const label = to.slice(1);
    const target = labels.get(label);
    if (!target) { errors.push(`userguide.md:${i + 1}: link to unknown label #${label}`); return all; }
    resolved++;
    if (target.chapter === undefined) return all;
    if (/^\d+$/.test(text)) return `[${target.chapter}](#${label})`;
    const word = /^(chapter) \d+(?::.*)?$/i.exec(text);
    return word ? `[${word[1]} ${target.chapter}: ${target.title}](#${label})` : all;
  }));
  return { md: out.join('\n'), errors, resolved };
}

// P17-3 — each label as an ⓘ box's "Read more" names it: `Chapter N: Title` for a chapter, and
// `Chapter N: Title — Section` for a section inside one. Read off the headings as they stand, so the
// app never holds a hand-typed chapter number. Markdown emphasis is dropped: the app shows plain text.
export function guideTitles(md, labels) {
  const plain = (s) => s.replace(/[*`]/g, '');
  const titles = {};
  let chapter;
  for (const line of md.split('\n')) {
    const h = splitHeading(line);
    if (!h) continue;
    const at = h.label === undefined ? undefined : labels.get(h.label);
    if (h.level <= 2) chapter = at?.chapter === undefined ? undefined : at;
    if (!at) continue;
    titles[h.label] = at.chapter !== undefined ? `Chapter ${at.chapter}: ${plain(at.title)}`
      : chapter ? `Chapter ${chapter.chapter}: ${plain(chapter.title)} — ${plain(h.text)}` : plain(h.text);
  }
  return titles;
}

export function sourceReferences(files) {
  const refs = [];
  for (const { path, text } of files) {
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\bguide:([a-z0-9][a-z0-9-]*)/g)) refs.push({ label: m[1], where: `${path}:${i + 1}` });
    });
  }
  return refs;
}

export function checkSourceReferences(refs, labels) {
  return refs.filter((r) => !labels.has(r.label)).map((r) => `${r.where}: guide:${r.label} names no label in userguide.md`);
}

// Names the guide quotes that the app does not show today. Each is still tagged in the guide, and
// the build lets these through by exact text only, so a person can decide whether the guide or the
// app is wrong. An entry the app DOES contain, or that no tag uses, fails the build: the list can
// only shrink.
export const NAMES_THE_APP_DOES_NOT_SHOW = [];

const TAG = /\{\{(name|fig)(?: ([^|{}]*))?\|([^{}]*)\}\}/g;
const FIG_ROUNDING = /^(?:(?:nearest|down)-\d+|month)$/;

// Every tag in the guide, with its line; a malformed or unclosed one is an error, never skipped.
export function collectTags(md) {
  const tags = [];
  const errors = [];
  md.split('\n').forEach((line, i) => {
    const where = `userguide.md:${i + 1}`;
    for (const m of line.matchAll(TAG)) {
      const [, kind, args = '', text] = m;
      if (text.trim() === '' || text !== text.trim()) { errors.push(`${where}: tag {{${kind}…}} has empty or padded text`); continue; }
      if (kind === 'name') {
        if (args) errors.push(`${where}: a name tag takes no key: {{name ${args}|…}}`);
        else tags.push({ kind, text, line: i + 1 });
        continue;
      }
      const [key, rounding, ...rest] = args.split(' ');
      if (!key || !LABEL.test(key) || !rounding || !FIG_ROUNDING.test(rounding) || rest.length) {
        errors.push(`${where}: a fig tag needs a kebab key and a rounding (nearest-N, down-N or month): {{fig ${args}|${text}}}`);
      } else tags.push({ kind, key, rounding, text, line: i + 1 });
    }
    if (line.replace(TAG, '').includes('{{') || line.replace(TAG, '').includes('}}')) errors.push(`${where}: an unclosed or malformed {{…}} tag`);
  });
  return { tags, errors };
}

export const stripTags = (md) => md.replace(TAG, (_all, _kind, _args, text) => text);

const sameQuotes = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

export function checkNames(tags, appFiles, knownMissing = []) {
  const app = sameQuotes(appFiles.map((f) => f.text).join('\n'));
  const names = tags.filter((t) => t.kind === 'name');
  const errors = names
    .filter((t) => !knownMissing.includes(t.text) && !app.includes(sameQuotes(t.text)))
    .map((t) => `userguide.md:${t.line}: name "${t.text}" is not in src/ or public/index.html`);
  for (const known of knownMissing) {
    if (app.includes(sameQuotes(known))) errors.push(`NAMES_THE_APP_DOES_NOT_SHOW: "${known}" is in the app now — take it off the list`);
    else if (!names.some((t) => t.text === known)) errors.push(`NAMES_THE_APP_DOES_NOT_SHOW: "${known}" is not tagged anywhere in the guide — take it off the list`);
  }
  return errors;
}

export function inline(text) {
  const code = [];
  const web = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(c) - 1}\u0000`);
  s = s.replace(LINK, (all, label, to) => isWebLink(to) ? `[${label}](\u0001${web.push(to) - 1}\u0001)` : all);
  s = escapeHtml(s)
    .replace(/\[([^\]]+)\]\((#[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(\u0001(\d+)\u0001\)/g, (_, label, n) => `<a href="${escapeHtml(web[n])}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => `<code>${escapeHtml(code[n])}</code>`);
}

const LIST_ITEM = /^( *)([-*+]|\d+\.) (.*)$/;
const indentOf = (line) => /^ */.exec(line)[0].length;
const startsBlock = (line) => /^(#{1,6} |---+\s*$|>|\||```)/.test(line) || LIST_ITEM.test(line);

function renderList(lines) {
  const base = indentOf(lines[0]);
  const ordered = /^\d/.test(LIST_ITEM.exec(lines[0])[2]);
  const items = [];
  for (const line of lines) {
    const m = LIST_ITEM.exec(line);
    if (m && m[1].length === base) items.push([m[3]]);
    else items[items.length - 1].push(line);
  }
  const body = items.map(([first, ...rest]) => {
    const inner = rest.length ? rest.map((l) => l.slice(Math.min(...rest.map(indentOf)))) : [];
    return `<li>${renderBlocks([first, ...inner], true)}</li>`;
  }).join('\n');
  const start = ordered ? Number(LIST_ITEM.exec(lines[0])[2].slice(0, -1)) : 1;
  return ordered ? `<ol${start === 1 ? '' : ` start="${start}"`}>\n${body}\n</ol>` : `<ul>\n${body}\n</ul>`;
}

function renderTable(lines) {
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
  const [head, , ...rows] = lines;
  // `| | |` is how the guide writes a table with no header row.
  const thead = cells(head).some((c) => c) ? `<thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join('')}</tr></thead>\n` : '';
  return `<table>\n${thead}<tbody>\n${
    rows.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n')}\n</tbody>\n</table>`;
}

export function renderBlocks(lines, tight = false) {
  const html = [];
  let i = 0;
  const take = (keep) => { const got = []; while (i < lines.length && keep(lines[i])) got.push(lines[i++]); return got; };
  while (i < lines.length) {
    const line = lines[i];
    const h = splitHeading(line);
    if (line.trim() === '') i++;
    else if (line.startsWith('```')) {
      // A fenced block: shown exactly as typed, for text the reader copies (e.g. a prompt).
      i++;
      const code = take((l) => !l.startsWith('```'));
      i++;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
    }
    else if (h) {
      i++;
      html.push(`<h${h.level}${h.label ? ` id="${h.label}"` : ''}>${inline(h.text)}</h${h.level}>`);
    } else if (/^---+\s*$/.test(line)) { i++; html.push('<hr>'); }
    else if (line.startsWith('>')) html.push(`<blockquote>${renderBlocks(take((l) => l.startsWith('>')).map((l) => l.replace(/^> ?/, '')))}</blockquote>`);
    else if (line.startsWith('|')) html.push(renderTable(take((l) => l.startsWith('|'))));
    else if (LIST_ITEM.test(line)) {
      const base = indentOf(line);
      html.push(renderList(take((l) => l.trim() !== '' && (indentOf(l) > base || LIST_ITEM.test(l) && indentOf(l) === base))));
    } else {
      const para = [lines[i++], ...take((l) => l.trim() !== '' && !startsBlock(l))].map((l) => l.trim()).join(' ');
      html.push(tight ? inline(para) : `<p>${inline(para)}</p>`);
    }
  }
  return html.join('\n');
}

// The sidebar: pinned pages, then each Part as a folding <details>, its Ways as sub-headings.
function sidebar(lines, labels) {
  const link = (label, text) => `<a href="#${label}">${inline(text)}</a>`;
  const pinned = PINNED.map((l) => `<li>${link(l, labels.get(l).title ?? labels.get(l).text)}</li>`).join('');
  const parts = [];
  for (const line of lines) {
    const h = splitHeading(line);
    if (!h) continue;
    if (h.level === 3 && /^Part \d+:/.test(h.text)) parts.push({ title: h.text, items: [] });
    else if (parts.length && h.level === 3 && /^Way \d+:/.test(h.text)) parts.at(-1).items.push(`<li class="way">${inline(h.text)}</li>`);
    else if (parts.length && h.level === 2 && h.label && labels.get(h.label).chapter !== undefined) {
      const { chapter, title } = labels.get(h.label);
      parts.at(-1).items.push(`<li>${link(h.label, `${chapter}. ${title}`)}</li>`);
    }
  }
  return `<nav>\n<ul class="pinned">${pinned}</ul>\n${parts.map((p) =>
    `<details><summary>${inline(p.title)}</summary><ul>${p.items.join('')}</ul></details>`).join('\n')}\n</nav>`;
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;font:17px/1.55 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#1d1d1f;background:#fff}
.layout{display:flex;align-items:flex-start}
nav{position:sticky;top:0;width:20rem;flex:none;height:100vh;overflow-y:auto;padding:1rem;background:#f5f5f7;border-right:1px solid #ddd;font-size:15px}
nav ul{list-style:none;margin:0;padding:0}
nav li{margin:.15rem 0}
nav li.way{margin-top:.6rem;font-size:13px;font-weight:600;color:#666}
nav a{color:#0b57d0;text-decoration:none}
nav a:hover{text-decoration:underline}
nav .pinned{margin-bottom:1rem;font-weight:600}
nav details{margin:.4rem 0}
nav summary{cursor:pointer;font-weight:600;padding:.2rem 0}
nav details ul{padding-left:.9rem}
main{flex:1;min-width:0;max-width:64rem;padding:1rem 2.5rem 6rem}
h1,h2,h3{line-height:1.25;scroll-margin-top:1rem}
h2{margin-top:2.5rem;padding-top:1rem;border-top:1px solid #ddd}
blockquote{margin:1rem 0;padding:.2rem 1rem;border-left:4px solid #0b57d0;background:#f0f4fb}
table{border-collapse:collapse;margin:1rem 0;width:100%}
th,td{border:1px solid #ccc;padding:.35rem .6rem;text-align:left;vertical-align:top}
th{background:#f5f5f7}
code{font:14px ui-monospace,Menlo,monospace;background:#f0f0f0;padding:0 .2rem;border-radius:3px}
hr{border:0}
pre{white-space:pre-wrap;background:#f0f0f0;padding:.75rem 1rem;border-radius:4px}
pre code{padding:0;background:none}
/* Chapter 85, the appendix, is the last chapter: every table after its heading is a sources table. */
#sources ~ table{font-size:15px;table-layout:fixed}
/* Source | Who publishes it | What it covers | Checked */
#sources ~ table th:nth-child(1){width:21%}
#sources ~ table th:nth-child(2){width:18%}
#sources ~ table th:nth-child(3){width:46%}
#sources ~ table th:nth-child(4){width:15%}
`;

// `appFiles` is where a `name` tag's text must appear (`main` passes `src/` and `public/index.html`;
// left out, names are not checked); `knownMissing` is `NAMES_THE_APP_DOES_NOT_SHOW` in the real build.
// The markdown's own contents list is typed by hand ("12. [Title](#label)"). The page leaves it out,
// but the markdown is still read on its own, so each number must be the chapter its link lands on.
export function checkTocNumbers(md, labels) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l === '## Table of Contents');
  if (start < 0) return [];
  const errors = [];
  for (let i = start + 1; i < lines.length && !/^---+\s*$/.test(lines[i]); i++) {
    const m = /^(\d+)\. .*?\]\(#([a-z0-9-]+)\)/.exec(lines[i]);
    const at = m && labels.get(m[2]);
    if (at?.chapter !== undefined && at.chapter !== Number(m[1]))
      errors.push(`userguide.md:${i + 1}: the contents says ${m[1]}, but {#${m[2]}} is Chapter ${at.chapter} now`);
  }
  return errors;
}

export function buildGuide(tagged, sourceFiles, { appFiles, knownMissing = [] } = {}) {
  const { tags, errors: tagErrors } = collectTags(tagged);
  const md = stripTags(tagged);
  const { labels, errors } = collectLabels(md);
  errors.unshift(...tagErrors, ...(appFiles ? checkNames(tags, appFiles, knownMissing) : []));
  for (const l of PINNED) if (!labels.has(l)) errors.push(`userguide.md: pinned page {#${l}} is missing`);
  const rewritten = rewriteLinks(md, labels);
  errors.push(...rewritten.errors, ...checkSourceReferences(sourceReferences(sourceFiles), labels), ...checkTocNumbers(md, labels));
  if (errors.length) return { errors, resolved: rewritten.resolved };
  // The markdown's own Table of Contents is what the sidebar replaces, so the page leaves it out.
  const lines = rewritten.md.split('\n');
  const tocStart = lines.findIndex((l) => l === '## Table of Contents');
  const tocEnd = tocStart < 0 ? -1 : lines.findIndex((l, i) => i > tocStart && /^---+\s*$/.test(l));
  const body = tocStart < 0 ? lines : [...lines.slice(0, tocStart), ...lines.slice(tocEnd + 1)];
  const html = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The enough User Guide</title>
<style>${CSS}</style>
</head>
<body>
<div class="layout">
${sidebar(body, labels)}
<main>
${renderBlocks(body)}
</main>
</div>
</body>
</html>
`;
  return { errors, resolved: rewritten.resolved, html, titles: guideTitles(md, labels) };
}

function readTree(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => { const path = join(e.parentPath, e.name); return { path: relative(REPO, path), text: readFileSync(path, 'utf8') }; });
}

// `node scripts/build-guide.mjs [guide.md] [srcDir] [out.html]` — the arguments exist for tests.
// Beside the page it writes `app/guideTitles.js`, the label → title map `src/app/infoButton.ts`
// imports (declared by `src/app/guideTitles.d.ts`); it is written only when the page is.
export function main([guide = join(REPO, 'userguide.md'), src = join(REPO, 'src'), out = join(REPO, 'dist', 'help.html')] = []) {
  const sourceFiles = readTree(src);
  const index = join(REPO, 'public', 'index.html');
  const appFiles = [...sourceFiles, { path: relative(REPO, index), text: readFileSync(index, 'utf8') }];
  const { errors, html, resolved, titles } = buildGuide(readFileSync(guide, 'utf8'), sourceFiles, { appFiles, knownMissing: NAMES_THE_APP_DOES_NOT_SHOW });
  if (errors.length) {
    console.error(`build-guide: ${errors.length} problem(s), help.html not written:\n  ${errors.join('\n  ')}`);
    return 1;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  const titlesOut = join(dirname(out), 'app', 'guideTitles.js');
  mkdirSync(dirname(titlesOut), { recursive: true });
  writeFileSync(titlesOut, `// Written by scripts/build-guide.mjs from userguide.md. Do not edit.\nexport const GUIDE_TITLES = ${JSON.stringify(titles, null, 1)};\n`);
  console.log(`build-guide: ${relative(REPO, out) || out} written, ${resolved} links resolved`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
