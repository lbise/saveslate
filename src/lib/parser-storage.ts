import type { CsvParser } from '../types';

const STORAGE_KEY = 'melomoney:csv-parsers';

/**
 * Load all saved parsers from localStorage.
 * Clears storage if any parser uses the old column mapping format (csvColumnIndex).
 */
export function loadParsers(): CsvParser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsers = JSON.parse(raw) as CsvParser[];

    // Detect old-format parsers (had csvColumnIndex instead of columnIndices)
    const hasOldFormat = parsers.some((p) =>
      p.columnMappings?.some((m) => 'csvColumnIndex' in m && !('columnIndices' in m)),
    );
    if (hasOldFormat) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    // Migrate ibanPattern → accountPattern
    let migrated = false;
    for (const p of parsers) {
      if ('ibanPattern' in p && !('accountPattern' in p)) {
        (p as Record<string, unknown>).accountPattern = (p as Record<string, unknown>).ibanPattern;
        delete (p as Record<string, unknown>).ibanPattern;
        migrated = true;
      }
    }
    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsers));
    }

    return parsers;
  } catch {
    return [];
  }
}

/**
 * Save a new parser. Generates an id and timestamps.
 */
export function saveParser(parser: Omit<CsvParser, 'id' | 'createdAt' | 'updatedAt'>): CsvParser {
  const parsers = loadParsers();
  const now = new Date().toISOString();
  const newParser: CsvParser = {
    ...parser,
    id: `parser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  parsers.push(newParser);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsers));
  return newParser;
}

/**
 * Update an existing parser by id.
 */
export function updateParser(id: string, updates: Partial<Omit<CsvParser, 'id' | 'createdAt'>>): CsvParser | null {
  const parsers = loadParsers();
  const idx = parsers.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  parsers[idx] = {
    ...parsers[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsers));
  return parsers[idx];
}

/**
 * Delete a parser by id.
 */
export function deleteParser(id: string): boolean {
  const parsers = loadParsers();
  const filtered = parsers.filter((p) => p.id !== id);
  if (filtered.length === parsers.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get a parser by id.
 */
export function getParserById(id: string): CsvParser | undefined {
  return loadParsers().find((p) => p.id === id);
}
