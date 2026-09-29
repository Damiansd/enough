// P11-2 — a small CSV reader for bank exports. No dependency (the one dev dependency is `typescript`).
//
// What it reads: fields separated by commas; a field wrapped in double quotes may hold commas, line
// breaks and doubled quotes (`""` is one `"`); lines end in CRLF, LF or a lone CR; a leading byte
// order mark is dropped; blank lines at the END of the file are dropped. Nothing else is dropped: a
// blank line in the middle comes back as a record, for the importer to list as a row it could not read.
//
// Each record carries the line it STARTS on (1-based), so a row the importer refuses can be named by
// the line the user sees in a text editor, even when a quoted field before it ran over several lines.

export interface CsvRecord {
  readonly line: number;
  readonly fields: readonly string[];
}

/** The file cannot be split into rows at all: a quote opened and never closed. */
export class CsvSyntaxError extends RangeError {}

const blank = (record: CsvRecord): boolean => record.fields.every((field) => field.trim() === '');

export const parseCsv = (source: string): CsvRecord[] => {
  const text = source.startsWith('﻿') ? source.slice(1) : source;
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let line = 1;
  let recordLine = 1;
  let quoteLine = 0;
  let quoted = false;
  let index = 0;
  const endRecord = (): void => {
    fields.push(field);
    records.push({ line: recordLine, fields });
    fields = [];
    field = '';
  };
  while (index < text.length) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
      } else {
        if (char === '\n' || (char === '\r' && text[index + 1] !== '\n')) line += 1;
        field += char;
      }
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      quoteLine = line;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      endRecord();
      index += char === '\r' && text[index + 1] === '\n' ? 2 : 1;
      line += 1;
      recordLine = line;
      continue;
    } else {
      field += char;
    }
    index += 1;
  }
  if (quoted) throw new CsvSyntaxError(`A quote opened on line ${quoteLine} is never closed, so the rows after it cannot be told apart.`);
  // A final line break ends the last record; it does not start an empty one.
  if (field !== '' || fields.length > 0) endRecord();
  while (records.length > 0 && blank(records.at(-1)!)) records.pop();
  return records;
};
