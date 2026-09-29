// P3-2 — provenance propagation. This is a correctness control, not a convenience: a computed
// number must carry the *weakest* confidence of everything it consumed, and every reason it is
// weak must arrive with it. If a `primary-verified` figure combined with an `unverified` one came
// out looking `primary-verified`, the tool would launder an unverified number into an
// authoritative-looking answer — which is the failure this project is organised against.
//
// The weakest-wins table below is written out by hand from the ordering in the module's doc
// comment (primary-verified is strongest, unverified is weakest); it is not derived from
// CONFIDENCE_ORDER at runtime, so a reordering of that array would fail these tests rather than
// move with them.
//
// Year-varying behaviour is exercised in two financial years, FY2026-27 and FY2030-31.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIDENCE_ORDER,
  mergeProvenance,
  provenanceOf,
  withCaveats,
} from '../dist/core/provenance.js';

const VERIFIED = 'primary-verified';
const ARCHIVE = 'primary-via-archive';
const SECONDARY = 'secondary-only';
const UNVERIFIED = 'unverified';

/** The weaker of each pair, written out rather than computed. Strongest to weakest, both ways. */
const WEAKEST = [
  [VERIFIED, VERIFIED, VERIFIED],
  [VERIFIED, ARCHIVE, ARCHIVE], // adjacent
  [VERIFIED, SECONDARY, SECONDARY],
  [VERIFIED, UNVERIFIED, UNVERIFIED],
  [ARCHIVE, ARCHIVE, ARCHIVE],
  [ARCHIVE, SECONDARY, SECONDARY], // adjacent
  [ARCHIVE, UNVERIFIED, UNVERIFIED],
  [SECONDARY, SECONDARY, SECONDARY],
  [SECONDARY, UNVERIFIED, UNVERIFIED], // adjacent
  [UNVERIFIED, UNVERIFIED, UNVERIFIED],
];

const record = (confidence, extra = {}) => ({ confidence, ...extra });

// --- The ordering itself ------------------------------------------------------------------------

test('CONFIDENCE_ORDER runs strongest to weakest and names every confidence exactly once', () => {
  assert.deepEqual([...CONFIDENCE_ORDER], [VERIFIED, ARCHIVE, SECONDARY, UNVERIFIED]);
  assert.equal(new Set(CONFIDENCE_ORDER).size, CONFIDENCE_ORDER.length);
});

// --- provenanceOf: the weakest-wins rule --------------------------------------------------------

test('provenanceOf over nothing is primary-verified with nothing to say', () => {
  // The identity of "weakest wins": a result that consumed no figure has borrowed no weakness.
  const provenance = provenanceOf('2026-27', []);
  assert.equal(provenance.fy, '2026-27');
  assert.equal(provenance.confidence, VERIFIED);
  assert.deepEqual([...provenance.caveats], []);
});

test('provenanceOf over one figure takes that figure’s confidence, whatever it is', () => {
  for (const confidence of [VERIFIED, ARCHIVE, SECONDARY, UNVERIFIED]) {
    const provenance = provenanceOf('2026-27', [['rate', record(confidence, { fy: '2026-27' })]]);
    assert.equal(provenance.confidence, confidence);
  }
  // and in a second year, so the rule is not tied to FY2026-27.
  assert.equal(
    provenanceOf('2030-31', [['rate', record(SECONDARY, { fy: '2030-31' })]]).confidence,
    SECONDARY,
  );
});

test('provenanceOf takes the weaker of every pair, in either order, ties included', () => {
  for (const [a, b, expected] of WEAKEST) {
    for (const [first, second] of [[a, b], [b, a]]) {
      const provenance = provenanceOf('2026-27', [
        ['first', record(first, { fy: '2026-27' })],
        ['second', record(second, { fy: '2026-27' })],
      ]);
      assert.equal(provenance.confidence, expected, `${first} + ${second}`);
    }
  }
});

test('one weak figure among many strong ones still decides the result', () => {
  // Four primary-verified figures and one unverified: unverified. This is the laundering case —
  // the answer must not look authoritative because most of its inputs were.
  const provenance = provenanceOf('2030-31', [
    ['bracket', record(VERIFIED, { fy: '2030-31' })],
    ['levy', record(VERIFIED, { fy: '2030-31' })],
    ['awote-index', record(UNVERIFIED, { fy: '2030-31' })],
    ['threshold', record(VERIFIED, { fy: '2030-31' })],
    ['cap', record(VERIFIED, { fy: '2030-31' })],
  ]);
  assert.equal(provenance.confidence, UNVERIFIED);
  assert.deepEqual([...provenance.caveats], ['awote-index is unverified']);
});

test('a weak figure consumed first is not overwritten by stronger ones after it', () => {
  // The accumulator starts at primary-verified, so an implementation that assigned rather than
  // compared would answer primary-verified here.
  assert.equal(
    provenanceOf('2026-27', [
      ['awote-index', record(UNVERIFIED, { fy: '2026-27' })],
      ['bracket', record(VERIFIED, { fy: '2026-27' })],
    ]).confidence,
    UNVERIFIED,
  );
});

test('a confidence outside the ordering is refused, not ranked above primary-verified', () => {
  // Register O5 lets a Setting-supplied figure through this path, so the closed union is not a
  // runtime guarantee here. An unrecognised value must not silently rank as the strongest.
  for (const junk of ['assumed', '', 'PRIMARY-VERIFIED', undefined]) {
    assert.throws(
      () => provenanceOf('2026-27', [['setting', record(junk)]]),
      RangeError,
      `accepted ${junk}`,
    );
  }
});

// --- provenanceOf: the caveats ------------------------------------------------------------------

test('a figure that is primary-verified for this year raises no caveat', () => {
  assert.deepEqual(
    [...provenanceOf('2026-27', [['bracket', record(VERIFIED, { fy: '2026-27' })]]).caveats],
    [],
  );
  assert.deepEqual(
    [...provenanceOf('2030-31', [['bracket', record(VERIFIED, { fy: '2030-31' })]]).caveats],
    [],
  );
});

test('every figure weaker than primary-verified names itself in a caveat', () => {
  for (const confidence of [ARCHIVE, SECONDARY, UNVERIFIED]) {
    assert.deepEqual(
      [...provenanceOf('2026-27', [['rate', record(confidence, { fy: '2026-27' })]]).caveats],
      [`rate is ${confidence}`],
    );
  }
});

test('a figure stamped with another year says which year it came from and which it was used for', () => {
  assert.deepEqual(
    [...provenanceOf('2026-27', [['cap', record(VERIFIED, { fy: '2025-26' })]]).caveats],
    ['cap is stamped FY2025-26 and was applied to FY2026-27'],
  );
  // Same figure, different year of use: the caveat must move with the year, not be fixed text.
  assert.deepEqual(
    [...provenanceOf('2030-31', [['cap', record(VERIFIED, { fy: '2025-26' })]]).caveats],
    ['cap is stamped FY2025-26 and was applied to FY2030-31'],
  );
});

test('a figure with no year of its own raises no year caveat', () => {
  // A Constant is not stamped to a financial year, so applying it to any year is not a mismatch.
  assert.deepEqual([...provenanceOf('2026-27', [['constant', record(VERIFIED)]]).caveats], []);
  assert.deepEqual([...provenanceOf('2030-31', [['constant', record(VERIFIED)]]).caveats], []);
});

test('a labelled prior-year fallback says so instead of reading as an ordinary mismatch', () => {
  const provenance = provenanceOf('2026-27', [
    ['medicare-thresholds', record(VERIFIED, { fy: '2025-26', priorYearFallbackFor: '2026-27' })],
  ]);
  assert.deepEqual(
    [...provenance.caveats],
    [
      'medicare-thresholds is stamped FY2025-26 and carried as a prior-year fallback for ' +
        'FY2026-27 — no FY2026-27 figure exists',
    ],
  );
  // One line, not two: the fallback replaces the plain mismatch line rather than adding to it.
  assert.equal(provenance.caveats.length, 1);
  assert.ok(!provenance.caveats.some((line) => line.includes('was applied to')));
});

test('the prior-year fallback caveat carries the year it was needed for, in each year', () => {
  const provenance = provenanceOf('2030-31', [
    ['thresholds', record(SECONDARY, { fy: '2029-30', priorYearFallbackFor: '2030-31' })],
  ]);
  assert.deepEqual(
    [...provenance.caveats],
    [
      'thresholds is secondary-only',
      'thresholds is stamped FY2029-30 and carried as a prior-year fallback for FY2030-31 ' +
        '— no FY2030-31 figure exists',
    ],
  );
  assert.equal(provenance.confidence, SECONDARY);
});

test('one figure can be weak for two reasons and says both', () => {
  const provenance = provenanceOf('2026-27', [['cap', record(UNVERIFIED, { fy: '2025-26' })]]);
  assert.deepEqual(
    [...provenance.caveats],
    ['cap is unverified', 'cap is stamped FY2025-26 and was applied to FY2026-27'],
  );
});

test('the same figure consumed twice is caveated once', () => {
  const cap = record(UNVERIFIED, { fy: '2026-27' });
  const provenance = provenanceOf('2026-27', [['cap', cap], ['cap', cap]]);
  assert.deepEqual([...provenance.caveats], ['cap is unverified']);
});

test('provenanceOf is frozen, caveats included', () => {
  const provenance = provenanceOf('2026-27', [['cap', record(UNVERIFIED, { fy: '2026-27' })]]);
  assert.ok(Object.isFrozen(provenance));
  assert.ok(Object.isFrozen(provenance.caveats));
});

// --- mergeProvenance ----------------------------------------------------------------------------

/** A ComputedProvenance built directly, so merging can be shown pairs `provenanceOf` cannot make. */
const at = (fy, confidence, ...caveats) =>
  Object.freeze({ fy, confidence, caveats: Object.freeze(caveats) });

test('merging one provenance changes nothing', () => {
  const only = at('2026-27', SECONDARY, 'cap is secondary-only');
  const merged = mergeProvenance(only);
  assert.equal(merged.fy, '2026-27');
  assert.equal(merged.confidence, SECONDARY);
  assert.deepEqual([...merged.caveats], ['cap is secondary-only']);
});

test('a merged result is as weak as its weakest part, in either order', () => {
  for (const [a, b, expected] of WEAKEST) {
    for (const [first, second] of [[a, b], [b, a]]) {
      assert.equal(
        mergeProvenance(at('2026-27', first), at('2026-27', second)).confidence,
        expected,
        `${first} + ${second}`,
      );
    }
  }
});

test('merging a chain keeps the weakest link wherever it sits', () => {
  // Weakest in the middle: the household result is unverified even though the parts either side
  // of it are not.
  assert.equal(
    mergeProvenance(
      at('2030-31', VERIFIED),
      at('2030-31', UNVERIFIED),
      at('2030-31', ARCHIVE),
    ).confidence,
    UNVERIFIED,
  );
  // Weakest first, then three stronger.
  assert.equal(
    mergeProvenance(
      at('2030-31', SECONDARY),
      at('2030-31', VERIFIED),
      at('2030-31', ARCHIVE),
      at('2030-31', VERIFIED),
    ).confidence,
    SECONDARY,
  );
});

test('merging unions the caveats and drops the repeats', () => {
  const merged = mergeProvenance(
    at('2026-27', ARCHIVE, 'levy is primary-via-archive', 'shared line'),
    at('2026-27', SECONDARY, 'shared line', 'cap is secondary-only'),
  );
  assert.deepEqual(
    [...merged.caveats],
    ['levy is primary-via-archive', 'shared line', 'cap is secondary-only'],
  );
  assert.equal(merged.confidence, SECONDARY);
});

test('a caveat on a strong part survives being merged with a weak one', () => {
  // The weakness decides the confidence; it must not swallow the other part's reasons.
  const merged = mergeProvenance(
    at('2026-27', VERIFIED, 'cap is stamped FY2025-26 and was applied to FY2026-27'),
    at('2026-27', UNVERIFIED, 'awote-index is unverified'),
  );
  assert.deepEqual(
    [...merged.caveats],
    ['cap is stamped FY2025-26 and was applied to FY2026-27', 'awote-index is unverified'],
  );
});

test('mergeProvenance is frozen and takes its year from the first part', () => {
  const merged = mergeProvenance(at('2030-31', VERIFIED), at('2030-31', UNVERIFIED));
  assert.equal(merged.fy, '2030-31');
  assert.ok(Object.isFrozen(merged));
  assert.ok(Object.isFrozen(merged.caveats));
});

// --- withCaveats --------------------------------------------------------------------------------

test('withCaveats adds a reason that has no record behind it', () => {
  // Register O19: every record consumed is primary-verified, but the reading of the definition is
  // partial, so the result must still say so.
  const base = provenanceOf('2026-27', [['earnings', record(VERIFIED, { fy: '2026-27' })]]);
  const noted = withCaveats(base, 'qualifying earnings is unread beyond the salary-sacrifice limb');
  assert.equal(noted.confidence, VERIFIED);
  assert.equal(noted.fy, '2026-27');
  assert.deepEqual(
    [...noted.caveats],
    ['qualifying earnings is unread beyond the salary-sacrifice limb'],
  );
  assert.deepEqual([...base.caveats], []); // the original is untouched
});

test('withCaveats appends to what is already there and does not repeat a line', () => {
  const base = provenanceOf('2030-31', [['cap', record(SECONDARY, { fy: '2030-31' })]]);
  const noted = withCaveats(base, 'cap is secondary-only', 'the indexation step is unread');
  assert.deepEqual([...noted.caveats], ['cap is secondary-only', 'the indexation step is unread']);
});

test('withCaveats with no lines leaves the provenance as it was', () => {
  const base = provenanceOf('2026-27', [['cap', record(UNVERIFIED, { fy: '2025-26' })]]);
  const noted = withCaveats(base);
  assert.equal(noted.confidence, UNVERIFIED);
  assert.equal(noted.fy, '2026-27');
  assert.deepEqual([...noted.caveats], [...base.caveats]);
  assert.ok(Object.isFrozen(noted));
  assert.ok(Object.isFrozen(noted.caveats));
});
