// P11-1 slice 1 — loading and saving the Ledger. Separate from the plan store on purpose: the
// Ledger is a separate file with a separate sensitivity (CONTEXT.md §Ledger), and nothing that
// saves a plan can reach it.
//
// The origin provider takes whatever it is PUT and overwrites the whole file (ADR-0007: it knows
// nothing of what a Transaction is). So append-only is enforced here, before the transport is
// named: the candidate is parsed through the door, and then must be a strict extension of the
// Ledger last loaded, or it is refused by name and nothing is written.
//
// The ONE exception is `replaceWithEmptyLedger` at the bottom: Start again's "also delete my
// transaction history", on the user's explicit Yes (2026-09-28).
//
// Absence is the empty Ledger, not a refusal: a household with no history yet has recorded nothing,
// and there is nothing on disk a write could lose. A file that EXISTS and does not parse is refused
// and left exactly as it is, as `loadPlan.ts` does for a plan.
import { appended, emptyLedger, parseLedger, requireExtension } from '../core/ledger.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Categorisation, CategorisationRule, ImportMapping, Ledger, Transaction } from '../core/ledger.js';

export interface LedgerTransport {
  /** The stored Ledger as parsed JSON, or `null` when no file exists yet. */
  readonly readLedger: () => Promise<unknown>;
  readonly writeLedger: (ledger: unknown) => Promise<void>;
}

/**
 * A write that did not land. Not a refusal — the Ledger was fine and the disk did not take it —
 * so not a `RangeError`, for the reason `PlanWriteFailure` is not one.
 */
export class LedgerWriteFailure extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LedgerWriteFailure';
  }
}

export const loadLedger = async (transport: LedgerTransport): Promise<Ledger> => parseLedger(await transport.readLedger());

/**
 * **The one write.** `candidate` is anything at all — it is read through `parseLedger`, then held
 * against `lastLoaded` by `requireExtension`, and only then handed to the transport. Returns the
 * Ledger now on disk, which is the caller's next `lastLoaded`.
 */
export const saveLedger = async (transport: LedgerTransport, lastLoaded: Ledger, candidate: unknown): Promise<Ledger> => {
  const ledger = requireExtension(lastLoaded, parseLedger(candidate));
  try {
    await transport.writeLedger(ledger);
  } catch (error) {
    throw new LedgerWriteFailure('The Ledger could not be saved. Nothing was recorded; what is on disk is what was last loaded.', { cause: error });
  }
  return ledger;
};

/** Append and save in one step: the ordinary way anything reaches the Ledger. */
export const appendToLedger = (
  transport: LedgerTransport,
  lastLoaded: Ledger,
  transactions: readonly Transaction[],
  categorisations: readonly Categorisation[] = [],
  importMappings: readonly ImportMapping[] = [],
  rules: readonly CategorisationRule[] = [],
): Promise<Ledger> => saveLedger(transport, lastLoaded, appended(lastLoaded, transactions, categorisations, importMappings, rules));

/**
 * **The one write that is NOT an extension, and the only one there will be.** User ruling
 * 2026-09-28: "Start again" asks separately "Also delete my transaction history?", default No; on
 * Yes the Ledger on disk becomes the empty Ledger. It is its own named function, and not a flag on
 * `saveLedger`, so `requireExtension` stays strict on every other write: nothing else can reach a
 * non-extension by passing an argument. Its one caller is the Start again question in
 * `transactionsPanel.ts`, which offers it only over a Ledger that LOADED — an unreadable file is
 * never written, by this or anything else (`test/import-graph.test.mjs` pins both).
 */
export const replaceWithEmptyLedger = async (transport: LedgerTransport): Promise<Ledger> => {
  const ledger = emptyLedger();
  try {
    await transport.writeLedger(ledger);
  } catch (error) {
    throw new LedgerWriteFailure('Your transaction history could not be deleted. What is on disk is what was there before.', { cause: error });
  }
  return ledger;
};
