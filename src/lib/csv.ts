import type { AmountFormat, CsvDelimiter, CsvParser, ColumnMapping, FieldTransform, ParsedRow } from '../types';

// ─── Raw CSV Parsing ─────────────────────────────────────────

/**
 * Detect the most likely delimiter by counting occurrences in the first few lines.
 */
export function detectDelimiter(text: string): CsvDelimiter {
  const lines = text.split('\n').slice(0, 5).filter(Boolean);
  const candidates: CsvDelimiter[] = [',', ';', '\t', '|'];
  let best: CsvDelimiter = ',';
  let bestScore = 0;

  for (const d of candidates) {
    // Count per-line occurrences; a good delimiter appears the same number of
    // times on every line (consistency score) AND has a high count.
    const counts = lines.map((l) => l.split(d).length - 1);
    const consistent = counts.every((c) => c === counts[0]) && counts[0] > 0;
    const score = consistent ? counts[0] * 10 : counts.reduce((a, b) => a + b, 0);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  return best;
}

/**
 * Parse raw CSV text into a 2D string array.
 * Handles quoted fields (RFC 4180) and strips BOM.
 */
export function parseRawCsv(text: string, delimiter: CsvDelimiter): string[][] {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(current.trim());
        current = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(current.trim());
        current = '';
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        i++; // skip \n
      } else if (ch === '\n') {
        row.push(current.trim());
        current = '';
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }

  // Final cell / row
  row.push(current.trim());
  if (row.some((c) => c !== '')) rows.push(row);

  return rows;
}

/**
 * Get headers and data rows from raw parsed data, considering parser config.
 */
export function extractHeadersAndData(
  rawRows: string[][],
  hasHeaderRow: boolean,
  skipRows: number,
): { headers: string[]; dataRows: string[][] } {
  const afterSkip = rawRows.slice(skipRows);
  if (hasHeaderRow && afterSkip.length > 0) {
    return { headers: afterSkip[0], dataRows: afterSkip.slice(1) };
  }
  // Generate numeric headers
  const maxCols = Math.max(...afterSkip.map((r) => r.length), 0);
  const headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
  return { headers, dataRows: afterSkip };
}

// ─── Parser Matching ─────────────────────────────────────────

export interface MatchResult {
  parser: CsvParser;
  score: number; // 0–1
}

/**
 * Score how well a parser matches the given CSV headers.
 * Each parser.headerPatterns entry is treated as a case-insensitive regex
 * tested against all actual headers. Score = matched / total patterns.
 */
export function scoreParserMatch(parser: CsvParser, actualHeaders: string[]): number {
  if (parser.headerPatterns.length === 0) return 0;

  const normalised = actualHeaders.map((h) => h.toLowerCase().trim());
  let matched = 0;

  for (const pattern of parser.headerPatterns) {
    try {
      const re = new RegExp(pattern, 'i');
      if (normalised.some((h) => re.test(h))) {
        matched++;
      }
    } catch {
      // Invalid regex — treat as literal substring match
      const lower = pattern.toLowerCase();
      if (normalised.some((h) => h.includes(lower))) {
        matched++;
      }
    }
  }

  return matched / parser.headerPatterns.length;
}

/**
 * Find the best matching parser for a set of CSV headers.
 * Returns the best match above the threshold, or null.
 */
export function findBestParser(
  parsers: CsvParser[],
  actualHeaders: string[],
  threshold = 0.7,
): MatchResult | null {
  let best: MatchResult | null = null;

  for (const parser of parsers) {
    const score = scoreParserMatch(parser, actualHeaders);
    if (score >= threshold && (!best || score > best.score)) {
      best = { parser, score };
    }
  }

  return best;
}

// ─── Date Parsing ────────────────────────────────────────────

/**
 * Parse a date string according to a format pattern.
 * Supported tokens: DD, MM, YYYY, YY.
 * Common formats: "DD.MM.YYYY", "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"
 */
export function parseDate(value: string, format: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Build a regex from the format, capturing groups for each token
  const regexStr = format
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special regex chars
    .replace('YYYY', '(?<year>\\d{4})')
    .replace('YY', '(?<year2>\\d{2})')
    .replace('MM', '(?<month>\\d{1,2})')
    .replace('DD', '(?<day>\\d{1,2})');

  try {
    const re = new RegExp(`^${regexStr}$`);
    const m = re.exec(trimmed);
    if (!m?.groups) return null;

    const year = m.groups.year
      ? parseInt(m.groups.year)
      : m.groups.year2
        ? 2000 + parseInt(m.groups.year2)
        : null;
    const month = m.groups.month ? parseInt(m.groups.month) : null;
    const day = m.groups.day ? parseInt(m.groups.day) : null;

    if (year == null || month == null || day == null) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Return ISO date string
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

// ─── Number Parsing ──────────────────────────────────────────

/**
 * Parse a numeric string with the given decimal separator.
 * Handles thousands separators (the "other" separator), currency symbols, whitespace.
 */
export function parseAmount(value: string, decimalSeparator: '.' | ','): number | null {
  let cleaned = value.trim();
  if (!cleaned) return null;

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[A-Za-z$€£₣\s]/g, '');

  // Remove thousands separator (the opposite of the decimal one)
  const thousandsSep = decimalSeparator === '.' ? ',' : '.';
  cleaned = cleaned.split(thousandsSep).join('');

  // Normalise decimal separator to '.'
  if (decimalSeparator === ',') {
    cleaned = cleaned.replace(',', '.');
  }

  // Handle parentheses for negative: (123.45) → -123.45
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── Apply Parser to Data ────────────────────────────────────

/**
 * Apply a parser's column mappings to parsed CSV data rows.
 * Returns an array of ParsedRow with extracted fields and any errors.
 */
export function applyParser(
  dataRows: string[][],
  headers: string[],
  parser: CsvParser,
): ParsedRow[] {
  const mappingByField = new Map<string, ColumnMapping>();
  for (const m of parser.columnMappings) {
    if (m.field !== 'ignore') {
      mappingByField.set(m.field, m);
    }
  }

  const separator = parser.multiColumnSeparator ?? ' ';

  /** Read a single column value (first index). Used for numeric/date fields. */
  const readSingle = (row: string[], mapping: ColumnMapping): string =>
    (row[mapping.columnIndices[0]] ?? '').trim();

  /** Read multiple columns and concatenate with separator. Used for string fields. */
  const readMulti = (row: string[], mapping: ColumnMapping): string =>
    mapping.columnIndices
      .map((i) => (row[i] ?? '').trim())
      .filter(Boolean)
      .join(separator);

  const rows = dataRows.map((row) => {
    const errors: string[] = [];
    const raw: Record<string, string> = {};

    // Build raw record
    for (let i = 0; i < row.length; i++) {
      const header = headers[i] ?? `Column ${i + 1}`;
      raw[header] = row[i];
    }

    // Extract description (string field — supports multi-column)
    const descMapping = mappingByField.get('description');
    const description = descMapping ? readMulti(row, descMapping) : '';
    if (!description) errors.push('Missing description');

    // Extract date (single column)
    const dateMapping = mappingByField.get('date');
    let date = '';
    if (dateMapping) {
      const rawDate = readSingle(row, dateMapping);
      const parsed = parseDate(rawDate, parser.dateFormat);
      if (parsed) {
        date = parsed;
      } else {
        errors.push(`Invalid date: "${rawDate}"`);
      }
    } else {
      errors.push('No date mapping');
    }

    // Extract amount
    let amount = 0;
    if (parser.amountFormat === 'single') {
      const amtMapping = mappingByField.get('amount');
      if (amtMapping) {
        const rawAmt = readSingle(row, amtMapping);
        const parsed = parseAmount(rawAmt, parser.decimalSeparator);
        if (parsed !== null) {
          amount = parsed;
        } else {
          errors.push(`Invalid amount: "${rawAmt}"`);
        }
      } else {
        errors.push('No amount mapping');
      }
    } else if (parser.amountFormat === 'amount-type') {
      // Amount + indicator column (e.g. "Debit"/"Credit")
      const amtMapping = mappingByField.get('amount');
      const typeMapping = mappingByField.get('amountType');

      if (amtMapping) {
        const rawAmt = readSingle(row, amtMapping);
        const parsed = parseAmount(rawAmt, parser.decimalSeparator);
        if (parsed !== null) {
          const absAmt = Math.abs(parsed);
          if (typeMapping) {
            const indicator = readSingle(row, typeMapping).toLowerCase();
            const isCredit = /^(credit|cr|c|\+|income|in)$/.test(indicator);
            const isDebit = /^(debit|db|d|-|expense|out)$/.test(indicator);
            if (isCredit) {
              amount = absAmt;
            } else if (isDebit) {
              amount = -absAmt;
            } else {
              // Unrecognized indicator — keep original sign, warn
              amount = parsed;
              errors.push(`Unknown indicator: "${readSingle(row, typeMapping)}"`);
            }
          } else {
            amount = parsed;
            errors.push('No debit/credit indicator mapping');
          }
        } else {
          errors.push(`Invalid amount: "${rawAmt}"`);
        }
      } else {
        errors.push('No amount mapping');
      }
    } else {
      // debit-credit
      const debitMapping = mappingByField.get('debit');
      const creditMapping = mappingByField.get('credit');
      let debit = 0;
      let credit = 0;

      if (debitMapping) {
        const rawDebit = readSingle(row, debitMapping);
        if (rawDebit) {
          const parsed = parseAmount(rawDebit, parser.decimalSeparator);
          if (parsed !== null) debit = Math.abs(parsed);
          else errors.push(`Invalid debit: "${rawDebit}"`);
        }
      }

      if (creditMapping) {
        const rawCredit = readSingle(row, creditMapping);
        if (rawCredit) {
          const parsed = parseAmount(rawCredit, parser.decimalSeparator);
          if (parsed !== null) credit = Math.abs(parsed);
          else errors.push(`Invalid credit: "${rawCredit}"`);
        }
      }

      // Credit is income (positive), debit is expense (negative)
      amount = credit - debit;

      if (!debitMapping && !creditMapping) {
        errors.push('No debit/credit mapping');
      }
    }

    // Extract category (string field — supports multi-column)
    const catMapping = mappingByField.get('category');
    const category = catMapping ? readMulti(row, catMapping) || undefined : undefined;

    // Extract currency (single column, optional)
    const currMapping = mappingByField.get('currency');
    const currency = currMapping ? readSingle(row, currMapping) || undefined : undefined;

    return { description, amount, date, category, currency, raw, errors };
  });

  // Apply field transforms if defined
  if (parser.transforms?.length) {
    for (const parsedRow of rows) {
      applyTransforms(parsedRow, parser.transforms);
    }
  }

  return rows;
}

// ─── Field Transforms ─────────────────────────────────────────

/**
 * Apply field transforms to a single parsed row (mutates in place).
 * Transforms are evaluated in sequence; earlier transforms can affect later ones.
 * Match regex is case-insensitive. Extract regex preserves original casing.
 */
export function applyTransforms(row: ParsedRow, transforms: FieldTransform[]): void {
  for (const transform of transforms) {
    // Skip incomplete transforms
    if (!transform.matchPattern || !transform.extractPattern || !transform.replacement) continue;

    const sourceValue = row[transform.sourceField] ?? '';
    if (!sourceValue) continue;

    try {
      const matchRe = new RegExp(transform.matchPattern, 'i');
      if (!matchRe.test(sourceValue)) continue;

      const extractRe = new RegExp(transform.extractPattern);
      const match = extractRe.exec(sourceValue);

      if (match?.groups && Object.keys(match.groups).length > 0) {
        const result = transform.replacement.replace(
          /\{\{(\w+)\}\}/g,
          (_, name: string) => match.groups?.[name] ?? '',
        );

        if (transform.targetField === 'description') {
          row.description = result;
        } else {
          row[transform.targetField] = result || undefined;
        }
      } else {
        const label = transform.label || 'unnamed';
        row.errors.push(`Transform "${label}": extract pattern has no named group matches`);
      }
    } catch {
      const label = transform.label || 'unnamed';
      row.errors.push(`Transform "${label}": invalid regex`);
    }
  }
}

// ─── Validation Helpers ──────────────────────────────────────

/**
 * Check if a set of column mappings has the required fields
 * for the given amount format. Returns a map of field → error message.
 */
export function validateMappings(
  mappings: ColumnMapping[],
  amountFormat: AmountFormat,
): Map<string, string> {
  const errors = new Map<string, string>();

  // Only consider mappings that actually have columns assigned
  const active = mappings.filter((m) => m.columnIndices.length > 0);
  const fields = new Set(active.map((m) => m.field));

  if (!fields.has('description')) errors.set('description', 'Required');
  if (!fields.has('date')) errors.set('date', 'Required');

  if (amountFormat === 'single') {
    if (!fields.has('amount')) errors.set('amount', 'Required');
  } else if (amountFormat === 'amount-type') {
    if (!fields.has('amount')) errors.set('amount', 'Required');
    if (!fields.has('amountType')) errors.set('amountType', 'Required');
  } else {
    if (!fields.has('debit') && !fields.has('credit')) {
      errors.set('debit', 'At least one of Debit/Credit required');
      errors.set('credit', 'At least one of Debit/Credit required');
    }
  }

  return errors;
}

// ─── Common Date Format Presets ──────────────────────────────

export const DATE_FORMAT_PRESETS = [
  { label: 'DD.MM.YYYY', value: 'DD.MM.YYYY', example: '31.12.2025' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD', example: '2025-12-31' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY', example: '12/31/2025' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY', example: '31/12/2025' },
  { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY', example: '31-12-2025' },
];
