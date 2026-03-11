import { describe, expect, it } from 'vitest';
import {
  loadParsers,
  saveParser,
  updateParser,
  deleteParser,
  getParserById,
  exportParser,
  importParserFromFile,
} from '../../src/lib/parser-storage';
import type { CsvParser } from '../../src/types';

const STORAGE_KEY = 'saveslate:csv-parsers';

function makeParser(overrides: Partial<CsvParser> = {}): CsvParser {
  return {
    id: 'parser-1',
    name: 'Test Parser',
    delimiter: ',' as const,
    hasHeaderRow: true,
    skipRows: 0,
    headerPatterns: ['date', 'amount', 'description'],
    columnMappings: [
      { field: 'date', columnIndices: [0] },
      { field: 'amount', columnIndices: [1] },
      { field: 'description', columnIndices: [2] },
    ],
    amountFormat: 'single' as const,
    timeMode: 'none' as const,
    dateFormat: 'DD.MM.YYYY',
    decimalSeparator: '.' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeParserDraft() {
  const {
    id,
    createdAt,
    updatedAt,
    ...draft
  } = makeParser();
  void id;
  void createdAt;
  void updatedAt;

  return draft;
}

function seedStorage(parsers: CsvParser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsers));
}

function makeFile(data: unknown, name = 'test.json'): File {
  return new File([JSON.stringify(data)], name, { type: 'application/json' });
}

function makeInvalidFile(content: string, name = 'test.json'): File {
  return new File([content], name, { type: 'application/json' });
}

// ─── loadParsers ──────────────────────────────────────────────────────────────

describe('loadParsers', () => {
  it('returns [] for empty localStorage', () => {
    expect(loadParsers()).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    expect(loadParsers()).toEqual([]);
  });

  it('loads valid parsers', () => {
    const parser = makeParser();
    seedStorage([parser]);
    const result = loadParsers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('parser-1');
    expect(result[0].name).toBe('Test Parser');
  });

  it('loads multiple parsers', () => {
    seedStorage([
      makeParser({ id: 'parser-1' }),
      makeParser({ id: 'parser-2', name: 'Second Parser' }),
    ]);
    expect(loadParsers()).toHaveLength(2);
  });

  describe('migrations', () => {
    it('clears storage when old format (csvColumnIndex) is detected', () => {
      const oldParser = {
        ...makeParser(),
        columnMappings: [
          { field: 'date', csvColumnIndex: 0 },
          { field: 'amount', csvColumnIndex: 1 },
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([oldParser]));
      const result = loadParsers();
      expect(result).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not clear storage when columnIndices is present alongside csvColumnIndex', () => {
      const parser = makeParser();
      const hybridMapping = { ...parser.columnMappings[0], csvColumnIndex: 0 };
      const hybridParser = {
        ...parser,
        columnMappings: [hybridMapping, ...parser.columnMappings.slice(1)],
      };
      seedStorage([hybridParser]);
      const result = loadParsers();
      expect(result).toHaveLength(1);
    });

    it('migrates ibanPattern to accountPattern', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.ibanPattern = 'CH\\d{2}';
      delete parser.accountPattern;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].accountPattern).toBe('CH\\d{2}');
      expect('ibanPattern' in result[0]).toBe(false);
    });

    it('saves back to localStorage after ibanPattern migration', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.ibanPattern = 'DE\\d+';
      delete parser.accountPattern;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      loadParsers();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored[0].accountPattern).toBe('DE\\d+');
      expect(stored[0].ibanPattern).toBeUndefined();
    });

    it('defaults invalid timeMode to "none"', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.timeMode = 'invalid-mode';
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].timeMode).toBe('none');
    });

    it('defaults undefined timeMode to "none"', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      delete parser.timeMode;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].timeMode).toBe('none');
    });

    it('adds default timeFormat for separate-column without timeFormat', () => {
      const parser = makeParser({ timeMode: 'separate-column' }) as unknown as Record<string, unknown>;
      delete parser.timeFormat;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].timeMode).toBe('separate-column');
      expect(result[0].timeFormat).toBe('HH:mm');
    });

    it('adds default timeFormat for separate-column with empty timeFormat', () => {
      const parser = makeParser({ timeMode: 'separate-column', timeFormat: '  ' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].timeFormat).toBe('HH:mm');
    });

    it('preserves valid timeFormat for separate-column', () => {
      const parser = makeParser({ timeMode: 'separate-column', timeFormat: 'HH:mm:ss' });
      seedStorage([parser]);

      const result = loadParsers();
      expect(result[0].timeFormat).toBe('HH:mm:ss');
    });

    it('removes timeFormat for non-separate-column timeMode', () => {
      const parser = makeParser({ timeMode: 'none' }) as unknown as Record<string, unknown>;
      parser.timeFormat = 'HH:mm';
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].timeFormat).toBeUndefined();
    });

    it('removes timeFormat for in-date-column timeMode', () => {
      const parser = makeParser({ timeMode: 'in-date-column' }) as unknown as Record<string, unknown>;
      parser.timeFormat = 'HH:mm';
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].timeFormat).toBeUndefined();
    });

    it('migrates legacy metadataColumnIndices to metadataMappings', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.metadataColumnIndices = [3, 5];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].metadataMappings).toEqual([
        { key: 'Metadata 1', columnIndices: [3] },
        { key: 'Metadata 2', columnIndices: [5] },
      ]);
    });

    it('removes metadataColumnIndices after migration', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.metadataColumnIndices = [1];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect('metadataColumnIndices' in result[0]).toBe(false);
    });

    it('removes metadataColumnIndices even when metadataMappings already exist', () => {
      const parser = makeParser({
        metadataMappings: [{ key: 'IBAN', columnIndices: [4] }],
      }) as unknown as Record<string, unknown>;
      parser.metadataColumnIndices = [1, 2];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      // metadataMappings should be kept (not overwritten)
      expect(result[0].metadataMappings).toEqual([
        { key: 'IBAN', columnIndices: [4] },
      ]);
      expect('metadataColumnIndices' in result[0]).toBe(false);
    });

    it('deduplicates and sorts metadataColumnIndices during migration', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.metadataColumnIndices = [5, 3, 5, 3];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      const result = loadParsers();
      expect(result[0].metadataMappings).toEqual([
        { key: 'Metadata 1', columnIndices: [3] },
        { key: 'Metadata 2', columnIndices: [5] },
      ]);
    });

    it('saves back to localStorage after migration', () => {
      const parser = makeParser() as unknown as Record<string, unknown>;
      parser.timeMode = 'bogus';
      localStorage.setItem(STORAGE_KEY, JSON.stringify([parser]));

      loadParsers();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored[0].timeMode).toBe('none');
    });

    it('does not re-save when no migration is needed', () => {
      const parser = makeParser();
      seedStorage([parser]);
      const before = localStorage.getItem(STORAGE_KEY);
      loadParsers();
      const after = localStorage.getItem(STORAGE_KEY);
      expect(after).toBe(before);
    });
  });
});

// ─── saveParser ───────────────────────────────────────────────────────────────

describe('saveParser', () => {
  it('generates id and timestamps', () => {
    const draft = makeParserDraft();
    const result = saveParser(draft);
    expect(result.id).toMatch(/^parser-\d+-[a-z0-9]+$/);
    expect(result.createdAt).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
    expect(result.createdAt).toBe(result.updatedAt);
  });

  it('returns complete parser with all draft fields', () => {
    const draft = makeParserDraft();
    const result = saveParser(draft);
    expect(result.name).toBe(draft.name);
    expect(result.delimiter).toBe(draft.delimiter);
    expect(result.columnMappings).toEqual(draft.columnMappings);
  });

  it('appends to existing parsers', () => {
    seedStorage([makeParser({ id: 'parser-existing' })]);
    const draft = makeParserDraft();
    saveParser(draft);

    const all = loadParsers();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('parser-existing');
  });

  it('persists to localStorage', () => {
    saveParser(makeParserDraft());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Test Parser');
  });

  it('generates unique ids for multiple saves', () => {
    const a = saveParser(makeParserDraft());
    const b = saveParser(makeParserDraft());
    expect(a.id).not.toBe(b.id);
  });
});

// ─── updateParser ─────────────────────────────────────────────────────────────

describe('updateParser', () => {
  it('updates fields and sets updatedAt', () => {
    seedStorage([makeParser({ id: 'parser-1', updatedAt: '2025-01-01T00:00:00.000Z' })]);
    const result = updateParser('parser-1', { name: 'Updated Name' });
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Updated Name');
    expect(result!.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
  });

  it('returns null for non-existent id', () => {
    seedStorage([makeParser({ id: 'parser-1' })]);
    expect(updateParser('parser-999', { name: 'Nope' })).toBeNull();
  });

  it('preserves fields not in updates', () => {
    seedStorage([makeParser({ id: 'parser-1', delimiter: ';' })]);
    const result = updateParser('parser-1', { name: 'New Name' });
    expect(result!.delimiter).toBe(';');
    expect(result!.hasHeaderRow).toBe(true);
  });

  it('persists updates to localStorage', () => {
    seedStorage([makeParser({ id: 'parser-1' })]);
    updateParser('parser-1', { name: 'Persisted' });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored[0].name).toBe('Persisted');
  });

  it('only updates the targeted parser', () => {
    seedStorage([
      makeParser({ id: 'parser-1', name: 'First' }),
      makeParser({ id: 'parser-2', name: 'Second' }),
    ]);
    updateParser('parser-2', { name: 'Updated Second' });
    const all = loadParsers();
    expect(all[0].name).toBe('First');
    expect(all[1].name).toBe('Updated Second');
  });
});

// ─── deleteParser ─────────────────────────────────────────────────────────────

describe('deleteParser', () => {
  it('deletes an existing parser', () => {
    seedStorage([makeParser({ id: 'parser-1' })]);
    expect(deleteParser('parser-1')).toBe(true);
    expect(loadParsers()).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    seedStorage([makeParser({ id: 'parser-1' })]);
    expect(deleteParser('parser-999')).toBe(false);
    expect(loadParsers()).toHaveLength(1);
  });

  it('only removes the targeted parser', () => {
    seedStorage([
      makeParser({ id: 'parser-1' }),
      makeParser({ id: 'parser-2' }),
    ]);
    deleteParser('parser-1');
    const remaining = loadParsers();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('parser-2');
  });

  it('returns false on empty storage', () => {
    expect(deleteParser('parser-1')).toBe(false);
  });
});

// ─── getParserById ────────────────────────────────────────────────────────────

describe('getParserById', () => {
  it('returns the parser when found', () => {
    seedStorage([makeParser({ id: 'parser-1' })]);
    const result = getParserById('parser-1');
    expect(result).toBeDefined();
    expect(result!.id).toBe('parser-1');
  });

  it('returns undefined when not found', () => {
    seedStorage([makeParser({ id: 'parser-1' })]);
    expect(getParserById('parser-999')).toBeUndefined();
  });

  it('returns undefined on empty storage', () => {
    expect(getParserById('parser-1')).toBeUndefined();
  });
});

// ─── exportParser ─────────────────────────────────────────────────────────────

describe('exportParser', () => {
  it('does not throw for a valid parser', () => {
    const parser = makeParser();
    // jsdom provides minimal DOM; just verify it doesn't crash
    expect(() => exportParser(parser)).not.toThrow();
  });
});

// ─── importParserFromFile ─────────────────────────────────────────────────────

describe('importParserFromFile', () => {
  describe('valid imports', () => {
    it('imports a parser in export-wrapper format (with schemaVersion)', async () => {
      const draft = makeParserDraft();
      const exportData = {
        schemaVersion: 1,
        exportedAt: '2025-01-01T00:00:00.000Z',
        parser: draft,
      };
      const result = await importParserFromFile(makeFile(exportData));
      expect(result.id).toMatch(/^parser-/);
      expect(result.name).toBe('Test Parser');
      expect(result.delimiter).toBe(',');
      expect(result.columnMappings).toEqual(draft.columnMappings);
      expect(result.createdAt).toBeTruthy();
    });

    it('imports a parser in direct format (without wrapper)', async () => {
      const draft = makeParserDraft();
      const result = await importParserFromFile(makeFile(draft));
      expect(result.id).toMatch(/^parser-/);
      expect(result.name).toBe('Test Parser');
    });

    it('trims parser name', async () => {
      const draft = makeParserDraft();
      draft.name = '  Trimmed Name  ';
      const result = await importParserFromFile(makeFile(draft));
      expect(result.name).toBe('Trimmed Name');
    });

    it('preserves optional fields (timeMode, timeFormat, multiColumnSeparator, accountPattern)', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, {
        timeMode: 'separate-column',
        timeFormat: 'HH:mm:ss',
        multiColumnSeparator: ' | ',
        accountPattern: 'CH\\d{2}',
      });
      const result = await importParserFromFile(makeFile(draft));
      expect(result.timeMode).toBe('separate-column');
      expect(result.timeFormat).toBe('HH:mm:ss');
      expect(result.multiColumnSeparator).toBe(' | ');
      expect(result.accountPattern).toBe('CH\\d{2}');
    });

    it('defaults timeMode to "none" when not provided', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      delete draft.timeMode;
      const result = await importParserFromFile(makeFile(draft));
      expect(result.timeMode).toBe('none');
    });

    it('sets timeFormat to undefined for separate-column when timeFormat is not provided', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, { timeMode: 'separate-column' });
      delete (draft as unknown as Record<string, unknown>).timeFormat;
      const result = await importParserFromFile(makeFile(draft));
      expect(result.timeFormat).toBeUndefined();
    });

    it('defaults timeFormat to HH:mm for separate-column with empty string timeFormat', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, { timeMode: 'separate-column', timeFormat: '' });
      const result = await importParserFromFile(makeFile(draft));
      expect(result.timeFormat).toBe('HH:mm');
    });

    it('defaults timeFormat to HH:mm for separate-column with whitespace-only timeFormat', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, { timeMode: 'separate-column', timeFormat: '   ' });
      const result = await importParserFromFile(makeFile(draft));
      expect(result.timeFormat).toBe('HH:mm');
    });

    it('strips timeFormat for non-separate-column timeMode', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.timeMode = 'none';
      draft.timeFormat = 'HH:mm';
      const result = await importParserFromFile(makeFile(draft));
      expect(result.timeFormat).toBeUndefined();
    });

    it('imports parser with transforms', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, {
        transforms: [
          {
            sourceField: 'description',
            targetField: 'category',
            matchPattern: 'grocery',
            extractPattern: '(?<cat>\\w+)',
            replacement: '{{cat}}',
          },
        ],
      });
      const result = await importParserFromFile(makeFile(draft));
      expect(result.transforms).toHaveLength(1);
      expect(result.transforms![0].sourceField).toBe('description');
    });

    it('imports parser with transform label', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, {
        transforms: [
          {
            label: 'Category from description',
            sourceField: 'description',
            targetField: 'category',
            matchPattern: '.*',
            extractPattern: '.*',
            replacement: 'test',
          },
        ],
      });
      const result = await importParserFromFile(makeFile(draft));
      expect(result.transforms![0].label).toBe('Category from description');
    });

    it('imports parser with metadataMappings', async () => {
      const draft = makeParserDraft();
      Object.assign(draft, {
        metadataMappings: [
          { key: 'IBAN', columnIndices: [4] },
          { key: 'Reference', columnIndices: [5, 6] },
        ],
      });
      const result = await importParserFromFile(makeFile(draft));
      expect(result.metadataMappings).toEqual([
        { key: 'IBAN', columnIndices: [4] },
        { key: 'Reference', columnIndices: [5, 6] },
      ]);
    });

    it('migrates legacy metadataColumnIndices in import', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataColumnIndices = [2, 4];
      delete draft.metadataMappings;
      const result = await importParserFromFile(makeFile(draft));
      expect(result.metadataMappings).toEqual([
        { key: 'Metadata 1', columnIndices: [2] },
        { key: 'Metadata 2', columnIndices: [4] },
      ]);
    });

    it('persists imported parser to localStorage', async () => {
      const draft = makeParserDraft();
      await importParserFromFile(makeFile(draft));
      const stored = loadParsers();
      expect(stored).toHaveLength(1);
    });
  });

  describe('unique name generation', () => {
    it('uses original name when no collision', async () => {
      const draft = makeParserDraft();
      const result = await importParserFromFile(makeFile(draft));
      expect(result.name).toBe('Test Parser');
    });

    it('appends (Copy) on first collision', async () => {
      seedStorage([makeParser({ name: 'Test Parser' })]);
      const draft = makeParserDraft();
      const result = await importParserFromFile(makeFile(draft));
      expect(result.name).toBe('Test Parser (Copy)');
    });

    it('appends (Copy 2) on second collision', async () => {
      seedStorage([
        makeParser({ id: 'parser-1', name: 'Test Parser' }),
        makeParser({ id: 'parser-2', name: 'Test Parser (Copy)' }),
      ]);
      const draft = makeParserDraft();
      const result = await importParserFromFile(makeFile(draft));
      expect(result.name).toBe('Test Parser (Copy 2)');
    });

    it('appends (Copy 3) on third collision', async () => {
      seedStorage([
        makeParser({ id: 'parser-1', name: 'Test Parser' }),
        makeParser({ id: 'parser-2', name: 'Test Parser (Copy)' }),
        makeParser({ id: 'parser-3', name: 'Test Parser (Copy 2)' }),
      ]);
      const draft = makeParserDraft();
      const result = await importParserFromFile(makeFile(draft));
      expect(result.name).toBe('Test Parser (Copy 3)');
    });

    it('unique name check is case-insensitive', async () => {
      seedStorage([makeParser({ name: 'test parser' })]);
      const draft = makeParserDraft(); // name: "Test Parser"
      const result = await importParserFromFile(makeFile(draft));
      expect(result.name).toBe('Test Parser (Copy)');
    });
  });

  describe('validation errors', () => {
    it('throws on invalid JSON', async () => {
      const file = makeInvalidFile('not-json{{{');
      await expect(importParserFromFile(file)).rejects.toThrow('Invalid JSON file.');
    });

    it('throws on non-object payload', async () => {
      const file = makeFile('just a string');
      await expect(importParserFromFile(file)).rejects.toThrow('Invalid parser file format.');
    });

    it('throws on null payload', async () => {
      const file = new File(['null'], 'test.json', { type: 'application/json' });
      await expect(importParserFromFile(file)).rejects.toThrow('Invalid parser file format.');
    });

    it('throws on unsupported schemaVersion', async () => {
      const data = {
        schemaVersion: 999,
        parser: makeParserDraft(),
      };
      await expect(importParserFromFile(makeFile(data))).rejects.toThrow(
        'Unsupported parser export version.',
      );
    });

    it('throws when parser key is not an object in export format', async () => {
      const data = {
        schemaVersion: 1,
        parser: 'not-an-object',
      };
      await expect(importParserFromFile(makeFile(data))).rejects.toThrow(
        'Parser file is missing parser data.',
      );
    });

    it('throws on missing name', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      delete draft.name;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file is missing a valid parser name.',
      );
    });

    it('throws on empty name', async () => {
      const draft = makeParserDraft();
      draft.name = '   ';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file is missing a valid parser name.',
      );
    });

    it('throws on non-string name', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.name = 123;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file is missing a valid parser name.',
      );
    });

    it('throws on invalid delimiter', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.delimiter = 'X';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid delimiter.',
      );
    });

    it('throws on missing delimiter', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      delete draft.delimiter;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid delimiter.',
      );
    });

    it('throws on non-boolean hasHeaderRow', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.hasHeaderRow = 'yes';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid header-row setting.',
      );
    });

    it('throws on negative skipRows', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.skipRows = -1;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid skip-rows value.',
      );
    });

    it('throws on non-integer skipRows', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.skipRows = 1.5;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid skip-rows value.',
      );
    });

    it('throws on missing skipRows', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      delete draft.skipRows;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid skip-rows value.',
      );
    });

    it('throws on non-array headerPatterns', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.headerPatterns = 'date,amount';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has invalid header patterns.',
      );
    });

    it('throws on headerPatterns with non-string elements', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.headerPatterns = [123, 456];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has invalid header patterns.',
      );
    });

    it('throws on invalid amountFormat', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.amountFormat = 'invalid';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid amount format.',
      );
    });

    it('throws on invalid timeMode', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.timeMode = 'invalid-mode';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid time mode.',
      );
    });

    it('throws on missing dateFormat', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      delete draft.dateFormat;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid date format.',
      );
    });

    it('throws on empty dateFormat', async () => {
      const draft = makeParserDraft();
      draft.dateFormat = '   ';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid date format.',
      );
    });

    it('throws on non-string timeFormat', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.timeFormat = 123;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid time format.',
      );
    });

    it('throws on invalid decimalSeparator', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.decimalSeparator = '/';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid decimal separator.',
      );
    });

    it('throws on non-string multiColumnSeparator', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.multiColumnSeparator = 42;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid multi-column separator.',
      );
    });

    it('throws on non-string accountPattern', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.accountPattern = 42;
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file has an invalid account pattern.',
      );
    });
  });

  describe('column mapping validation', () => {
    it('throws on non-array columnMappings', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = 'invalid';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser file is missing valid column mappings.',
      );
    });

    it('throws on non-object column mapping entry', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = ['invalid'];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #1 is invalid.',
      );
    });

    it('throws on invalid field in column mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = [{ field: 'bogus', columnIndices: [0] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #1 has an invalid field.',
      );
    });

    it('throws on missing columnIndices in mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = [{ field: 'date' }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #1 has invalid column indices.',
      );
    });

    it('throws on non-array columnIndices in mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = [{ field: 'date', columnIndices: 0 }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #1 has invalid column indices.',
      );
    });

    it('throws on negative column index', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = [{ field: 'date', columnIndices: [-1] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #1 has invalid column indices.',
      );
    });

    it('throws on non-integer column index', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = [{ field: 'date', columnIndices: [1.5] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #1 has invalid column indices.',
      );
    });

    it('includes correct 1-based index in mapping error messages', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = [
        { field: 'date', columnIndices: [0] },
        { field: 'invalid-field', columnIndices: [1] },
      ];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Column mapping #2 has an invalid field.',
      );
    });

    it('accepts all valid transaction fields', async () => {
      const allFields = [
        'description', 'transactionId', 'amount', 'debit', 'credit',
        'amountType', 'date', 'time', 'category', 'currency', 'ignore',
      ];
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.columnMappings = allFields.map((field, i) => ({
        field,
        columnIndices: [i],
      }));
      const result = await importParserFromFile(makeFile(draft));
      expect(result.columnMappings).toHaveLength(allFields.length);
    });
  });

  describe('transforms validation', () => {
    it('throws on non-array transforms', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = 'invalid';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser transforms must be an array.',
      );
    });

    it('throws on non-object transform entry', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = ['invalid'];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #1 is invalid.',
      );
    });

    it('throws on invalid sourceField in transform', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = [{
        sourceField: 'amount',
        targetField: 'description',
        matchPattern: '.*',
        extractPattern: '.*',
        replacement: 'test',
      }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #1 uses unsupported fields.',
      );
    });

    it('throws on invalid targetField in transform', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = [{
        sourceField: 'description',
        targetField: 'amount',
        matchPattern: '.*',
        extractPattern: '.*',
        replacement: 'test',
      }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #1 uses unsupported fields.',
      );
    });

    it('throws on non-string matchPattern', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = [{
        sourceField: 'description',
        targetField: 'category',
        matchPattern: 123,
        extractPattern: '.*',
        replacement: 'test',
      }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #1 has an invalid match pattern.',
      );
    });

    it('throws on non-string extractPattern', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = [{
        sourceField: 'description',
        targetField: 'category',
        matchPattern: '.*',
        extractPattern: 123,
        replacement: 'test',
      }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #1 has an invalid extract pattern.',
      );
    });

    it('throws on non-string replacement', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = [{
        sourceField: 'description',
        targetField: 'category',
        matchPattern: '.*',
        extractPattern: '.*',
        replacement: 123,
      }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #1 has an invalid replacement template.',
      );
    });

    it('includes correct 1-based index in transform error messages', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.transforms = [
        {
          sourceField: 'description',
          targetField: 'category',
          matchPattern: '.*',
          extractPattern: '.*',
          replacement: 'ok',
        },
        {
          sourceField: 'description',
          targetField: 'invalid',
          matchPattern: '.*',
          extractPattern: '.*',
          replacement: 'ok',
        },
      ];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Transform #2 uses unsupported fields.',
      );
    });

    it('accepts all valid transformable fields', async () => {
      const validFields = ['description', 'category', 'currency'];
      for (const field of validFields) {
        const draft = makeParserDraft() as unknown as Record<string, unknown>;
        draft.transforms = [{
          sourceField: field,
          targetField: field,
          matchPattern: '.*',
          extractPattern: '.*',
          replacement: 'test',
        }];
        const result = await importParserFromFile(makeFile(draft));
        expect(result.transforms![0].sourceField).toBe(field);
      }
    });
  });

  describe('metadata mappings validation', () => {
    it('throws on non-array metadataMappings', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = 'invalid';
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Parser metadata mappings must be an array.',
      );
    });

    it('throws on non-object metadata mapping entry', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = ['invalid'];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Metadata mapping #1 is invalid.',
      );
    });

    it('throws on missing key in metadata mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ columnIndices: [0] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Metadata mapping #1 is missing a key.',
      );
    });

    it('throws on empty key in metadata mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ key: '  ', columnIndices: [0] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Metadata mapping #1 is missing a key.',
      );
    });

    it('throws on non-string key in metadata mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ key: 123, columnIndices: [0] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Metadata mapping #1 is missing a key.',
      );
    });

    it('throws on invalid columnIndices in metadata mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ key: 'IBAN', columnIndices: [-1] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Metadata mapping #1 has invalid column indices.',
      );
    });

    it('throws on empty columnIndices after dedup in metadata mapping', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ key: 'IBAN', columnIndices: [] }];
      await expect(importParserFromFile(makeFile(draft))).rejects.toThrow(
        'Metadata mapping #1 must map at least one column.',
      );
    });

    it('deduplicates and sorts metadata mapping columnIndices', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ key: 'Ref', columnIndices: [5, 2, 5, 2] }];
      const result = await importParserFromFile(makeFile(draft));
      expect(result.metadataMappings![0].columnIndices).toEqual([2, 5]);
    });

    it('trims metadata mapping keys', async () => {
      const draft = makeParserDraft() as unknown as Record<string, unknown>;
      draft.metadataMappings = [{ key: '  IBAN  ', columnIndices: [4] }];
      const result = await importParserFromFile(makeFile(draft));
      expect(result.metadataMappings![0].key).toBe('IBAN');
    });
  });
});
