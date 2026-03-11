import type { CsvParser } from '../types';

const PARSER_EXPORT_SCHEMA_VERSION = 1;
const DELIMITERS: CsvParser['delimiter'][] = [',', ';', '\t', '|'];
const AMOUNT_FORMATS: CsvParser['amountFormat'][] = ['single', 'debit-credit', 'amount-type'];
const TIME_MODES: CsvParser['timeMode'][] = ['none', 'separate-column', 'in-date-column'];
const DECIMAL_SEPARATORS: CsvParser['decimalSeparator'][] = ['.', ','];
const TRANSACTION_FIELDS = ['description', 'transactionId', 'amount', 'debit', 'credit', 'amountType', 'date', 'time', 'category', 'currency', 'ignore'] as const;
const TRANSFORMABLE_FIELDS = ['description', 'category', 'currency'] as const;

interface ExportedParserFile {
  schemaVersion: number;
  exportedAt: string;
  parser: CsvParser;
}

export type ParserDraft = Omit<CsvParser, 'id' | 'createdAt' | 'updatedAt'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDelimiter(value: unknown): value is CsvParser['delimiter'] {
  return typeof value === 'string' && DELIMITERS.includes(value as CsvParser['delimiter']);
}

function isAmountFormat(value: unknown): value is CsvParser['amountFormat'] {
  return typeof value === 'string' && AMOUNT_FORMATS.includes(value as CsvParser['amountFormat']);
}

function isTimeMode(value: unknown): value is CsvParser['timeMode'] {
  return typeof value === 'string' && TIME_MODES.includes(value as CsvParser['timeMode']);
}

function isDecimalSeparator(value: unknown): value is CsvParser['decimalSeparator'] {
  return typeof value === 'string' && DECIMAL_SEPARATORS.includes(value as CsvParser['decimalSeparator']);
}

function isTransactionField(value: unknown): value is CsvParser['columnMappings'][number]['field'] {
  return typeof value === 'string' && TRANSACTION_FIELDS.includes(value as typeof TRANSACTION_FIELDS[number]);
}

function isTransformableField(value: unknown): value is NonNullable<CsvParser['transforms']>[number]['sourceField'] {
  return typeof value === 'string' && TRANSFORMABLE_FIELDS.includes(value as typeof TRANSFORMABLE_FIELDS[number]);
}

function parseColumnMappings(value: unknown): ParserDraft['columnMappings'] {
  if (!Array.isArray(value)) {
    throw new Error('Parser file is missing valid column mappings.');
  }

  return value.map((mapping, index) => {
    if (!isRecord(mapping)) {
      throw new Error(`Column mapping #${index + 1} is invalid.`);
    }

    if (!isTransactionField(mapping.field)) {
      throw new Error(`Column mapping #${index + 1} has an invalid field.`);
    }

    if (!Array.isArray(mapping.columnIndices) || !mapping.columnIndices.every((idx) => Number.isInteger(idx) && (idx as number) >= 0)) {
      throw new Error(`Column mapping #${index + 1} has invalid column indices.`);
    }

    return {
      field: mapping.field,
      columnIndices: mapping.columnIndices as number[],
    };
  });
}

function parseTransforms(value: unknown): ParserDraft['transforms'] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('Parser transforms must be an array.');
  }

  return value.map((transform, index) => {
    if (!isRecord(transform)) {
      throw new Error(`Transform #${index + 1} is invalid.`);
    }

    if (!isTransformableField(transform.sourceField) || !isTransformableField(transform.targetField)) {
      throw new Error(`Transform #${index + 1} uses unsupported fields.`);
    }
    if (typeof transform.matchPattern !== 'string') {
      throw new Error(`Transform #${index + 1} has an invalid match pattern.`);
    }
    if (typeof transform.extractPattern !== 'string') {
      throw new Error(`Transform #${index + 1} has an invalid extract pattern.`);
    }
    if (typeof transform.replacement !== 'string') {
      throw new Error(`Transform #${index + 1} has an invalid replacement template.`);
    }

    return {
      label: typeof transform.label === 'string' ? transform.label : undefined,
      sourceField: transform.sourceField,
      targetField: transform.targetField,
      matchPattern: transform.matchPattern,
      extractPattern: transform.extractPattern,
      replacement: transform.replacement,
    };
  });
}

function parseMetadataMappings(value: unknown): ParserDraft['metadataMappings'] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('Parser metadata mappings must be an array.');
  }

  return value.map((mapping, index) => {
    if (!isRecord(mapping)) {
      throw new Error(`Metadata mapping #${index + 1} is invalid.`);
    }

    if (typeof mapping.key !== 'string' || mapping.key.trim() === '') {
      throw new Error(`Metadata mapping #${index + 1} is missing a key.`);
    }

    if (
      !Array.isArray(mapping.columnIndices)
      || !mapping.columnIndices.every((idx) => Number.isInteger(idx) && (idx as number) >= 0)
    ) {
      throw new Error(`Metadata mapping #${index + 1} has invalid column indices.`);
    }

    const columnIndices = Array.from(new Set(mapping.columnIndices as number[])).sort((a, b) => a - b);
    if (columnIndices.length === 0) {
      throw new Error(`Metadata mapping #${index + 1} must map at least one column.`);
    }

    return {
      key: mapping.key.trim(),
      columnIndices,
    };
  });
}

function parseLegacyMetadataColumnIndices(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('Legacy metadata columns must be an array.');
  }

  const indices = value.map((index, itemIndex) => {
    if (!Number.isInteger(index) || (index as number) < 0) {
      throw new Error(`Legacy metadata column #${itemIndex + 1} is invalid.`);
    }

    return index as number;
  });

  const uniqueIndices = Array.from(new Set(indices)).sort((a, b) => a - b);
  return uniqueIndices.length > 0 ? uniqueIndices : undefined;
}

export function getParserDraftFromImport(value: unknown): ParserDraft {
  if (!isRecord(value)) {
    throw new Error('Invalid parser file format.');
  }

  const payload = 'parser' in value ? value.parser : value;
  if ('schemaVersion' in value && value.schemaVersion !== PARSER_EXPORT_SCHEMA_VERSION) {
    throw new Error('Unsupported parser export version.');
  }
  if (!isRecord(payload)) {
    throw new Error('Parser file is missing parser data.');
  }

  if (typeof payload.name !== 'string' || payload.name.trim() === '') {
    throw new Error('Parser file is missing a valid parser name.');
  }
  if (!isDelimiter(payload.delimiter)) {
    throw new Error('Parser file has an invalid delimiter.');
  }
  if (typeof payload.hasHeaderRow !== 'boolean') {
    throw new Error('Parser file has an invalid header-row setting.');
  }
  if (!Number.isInteger(payload.skipRows) || (payload.skipRows as number) < 0) {
    throw new Error('Parser file has an invalid skip-rows value.');
  }
  if (!Array.isArray(payload.headerPatterns) || !payload.headerPatterns.every((pattern) => typeof pattern === 'string')) {
    throw new Error('Parser file has invalid header patterns.');
  }
  if (!isAmountFormat(payload.amountFormat)) {
    throw new Error('Parser file has an invalid amount format.');
  }
  if (payload.timeMode !== undefined && !isTimeMode(payload.timeMode)) {
    throw new Error('Parser file has an invalid time mode.');
  }
  if (typeof payload.dateFormat !== 'string' || payload.dateFormat.trim() === '') {
    throw new Error('Parser file has an invalid date format.');
  }
  if (payload.timeFormat !== undefined && typeof payload.timeFormat !== 'string') {
    throw new Error('Parser file has an invalid time format.');
  }
  if (!isDecimalSeparator(payload.decimalSeparator)) {
    throw new Error('Parser file has an invalid decimal separator.');
  }
  if (payload.multiColumnSeparator !== undefined && typeof payload.multiColumnSeparator !== 'string') {
    throw new Error('Parser file has an invalid multi-column separator.');
  }
  if (payload.accountPattern !== undefined && typeof payload.accountPattern !== 'string') {
    throw new Error('Parser file has an invalid account pattern.');
  }

  const skipRows = payload.skipRows as number;
  const headerPatterns = payload.headerPatterns as string[];
  const timeMode = isTimeMode(payload.timeMode) ? payload.timeMode : 'none';
  const timeFormat = timeMode === 'separate-column' && typeof payload.timeFormat === 'string'
    ? payload.timeFormat.trim() || 'HH:mm'
    : undefined;
  const metadataMappings = parseMetadataMappings(payload.metadataMappings);
  const legacyMetadataColumnIndices = parseLegacyMetadataColumnIndices(payload.metadataColumnIndices);

  return {
    name: payload.name.trim(),
    delimiter: payload.delimiter,
    hasHeaderRow: payload.hasHeaderRow,
    skipRows,
    headerPatterns,
    columnMappings: parseColumnMappings(payload.columnMappings),
    amountFormat: payload.amountFormat,
    timeMode,
    timeFormat,
    dateFormat: payload.dateFormat,
    decimalSeparator: payload.decimalSeparator,
    multiColumnSeparator: payload.multiColumnSeparator,
    metadataMappings: metadataMappings
      ?? legacyMetadataColumnIndices?.map((columnIndex, index) => ({
        key: `Metadata ${index + 1}`,
        columnIndices: [columnIndex],
      })),
    transforms: parseTransforms(payload.transforms),
    accountPattern: payload.accountPattern,
  };
}

export function exportParser(parser: CsvParser): void {
  const payload: ExportedParserFile = {
    schemaVersion: PARSER_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    parser,
  };

  const safeName = parser.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'parser';
  const exportDate = new Date().toISOString().split('T')[0];
  const fileName = `saveslate-parser-${safeName}-${exportDate}.json`;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}
