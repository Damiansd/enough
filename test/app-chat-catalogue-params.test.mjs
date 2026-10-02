// The chat catalogue's per-type params line (`toolCatalogue.ts`'s `PARAMS`) against the params
// types in `plan.ts` and the door's allowed-key lists in `parsePlan.ts`.
//
// `PARAMS` is hand-kept and was found drifted from the door (HEAS_DRAW, 2026-09-25). Each entry's
// leading `{ ... }` group — or groups, joined by " or ", for a union — must name exactly the keys of
// the params type, a `?` marking an optional key on both sides. All three are read from RAW SOURCE:
// the params are types, erased from `dist/`, and `PARAMS` is not exported.
//
// The owner rule is NOT pinned: neither file holds it in a machine-readable form. The door refuses
// a "household" owner inside each type's own check function, and the walk refuses it for
// LUMP_SUM_FROM_SUPER and NON_SUPER_INVESTMENT, so there is no table to compare the prose against.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOLS } from '../dist/app/chat/toolCatalogue.js';
import { OFFERED_ENTRY_TYPES } from '../dist/app/planEdits.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(join(root, path), 'utf8');
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const catalogueParams = () => {
  const block = source('src/app/chat/toolCatalogue.ts').match(/\nconst PARAMS[^=]*= \{\n([\s\S]*?)\n\};/);
  assert.ok(block, 'toolCatalogue.ts no longer has a `const PARAMS = { ... };` block');
  return new Map([...block[1].matchAll(/^ {2}([A-Z_]+): '(.*)',$/gm)].map(([, type, text]) => [type, text]));
};

/** The leading `{ ... }` groups, one key list per group: `kind: "stopped"` reads as `kind`. */
const describedShapes = (text) => {
  const lead = text.match(/^(\{[^{}]*\}(?: or \{[^{}]*\})*)(?: — |$)/);
  assert.ok(lead, `no leading { ... } in: ${text.slice(0, 60)}`);
  return [...lead[1].matchAll(/\{([^{}]*)\}/g)].map(([, body]) =>
    body.split(',').map((part) => part.trim()).filter((part) => part !== '').map((part) => {
      const key = part.match(/^(\w+)(\?)?(?::|$)/);
      assert.ok(key, `unreadable param "${part}"`);
      return `${key[1]}${key[2] ?? ''}`;
    }));
};

const planShapes = () => {
  const plan = withoutComments(source('src/core/plan.ts'));
  const union = plan.match(/export type Entry =([\s\S]*?);/);
  assert.ok(union, 'plan.ts no longer has `export type Entry = ...;`');
  const resolve = (name) => {
    if (name === 'NoParams') return [[]];
    const alias = plan.match(new RegExp(`export type ${name} = ([\\w| ]+);`));
    if (alias) return alias[1].split('|').flatMap((member) => resolve(member.trim()));
    const body = plan.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(body, `plan.ts has no type or interface ${name}`);
    return [[...body[1].matchAll(/^\s*readonly (\w+)(\?)?:/gm)].map(([, key, optional]) => `${key}${optional ?? ''}`)];
  };
  return new Map([...union[1].matchAll(/EntryBase<'(\w+)', (\w+)>/g)].map(([, type, params]) => [type, resolve(params)]));
};

/** Each parser's first `object(PlanFileEntryError, value, path, [...])` — the keys the door lets in. */
const doorKeys = () => {
  const parse = withoutComments(source('src/core/parsePlan.ts'));
  const parsers = parse.match(/const PARAMS_PARSERS = \{([\s\S]*?)\n\} as const/);
  assert.ok(parsers, 'parsePlan.ts no longer has `const PARAMS_PARSERS = { ... } as const`');
  const starts = [...parsers[1].matchAll(/^ {2}([A-Z_]+): \(value: unknown, path: string\)/gm)];
  return new Map(starts.map((start, index) => {
    const body = parsers[1].slice(start.index, starts[index + 1]?.index);
    const allowed = body.match(/object\(PlanFileEntryError, value, path, \[([^\]]*)\]\)/);
    assert.ok(allowed, `PARAMS_PARSERS.${start[1]} has no object(...) key list`);
    return [start[1], [...allowed[1].matchAll(/'(\w+)'/g)].map(([, key]) => key)];
  }));
};

const sortedShapes = (shapes) => shapes.map((keys) => [...keys].sort()).sort((a, b) => a.join().localeCompare(b.join()));

test('the catalogue describes exactly the offered entry types, and ships the text this file reads', () => {
  const params = catalogueParams();
  assert.deepEqual([...params.keys()].sort(), [...OFFERED_ENTRY_TYPES].sort());
  const whatIf = TOOLS.find(({ definition }) => definition.name === 'runProjection').definition.inputSchema.properties.whatIf.description;
  for (const [type, text] of params) assert.ok(whatIf.includes(`${type} ${text}`), `${type}'s description is not in the shipped what-if text`);
});

test('each described { ... } names exactly the params type\'s keys, ? for optional', () => {
  const params = catalogueParams();
  const plan = planShapes();
  let keysCompared = 0;
  for (const type of OFFERED_ENTRY_TYPES) {
    assert.ok(plan.has(type), `plan.ts's Entry union has no member for ${type}`);
    const described = describedShapes(params.get(type));
    assert.deepEqual(sortedShapes(described), sortedShapes(plan.get(type)), `${type}: the catalogue's params disagree with plan.ts`);
    keysCompared += described.flat().length;
  }
  // Non-vacuity: 24 types, 53 keys across them (TTR_START added two, 2026-09-29; RF-3 its `amount?`, 2026-09-30; GIFT its `amount`, 2026-10-02); a parse that read nothing would pass the loop.
  assert.equal(OFFERED_ENTRY_TYPES.length, 24);
  assert.equal(keysCompared, 53);
  assert.ok([...plan.values()].flat(2).some((key) => key.endsWith('?')), 'no optional key was read from plan.ts');
});

test('the door lets in exactly the described keys', () => {
  const params = catalogueParams();
  const door = doorKeys();
  for (const type of OFFERED_ENTRY_TYPES) {
    assert.ok(door.has(type), `PARAMS_PARSERS has no parser for ${type}`);
    const described = new Set(describedShapes(params.get(type)).flat().map((key) => key.replace(/\?$/, '')));
    assert.deepEqual([...described].sort(), [...door.get(type)].sort(), `${type}: the catalogue's params disagree with the door's key list`);
  }
});
