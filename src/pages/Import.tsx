import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Upload, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  StepIndicator,
  FileUpload,
  ParserLibrary,
  ParserMatcher,
  ParserEditor,
  TransactionPreview,
} from '../components/import';
import {
  detectDelimiter,
  parseRawCsv,
  extractHeadersAndData,
  applyParser,
  extractAccountIdentifier,
} from '../lib/csv';
import { useAccounts, useCreateImportBatch, useBulkCreateTransactions, useUpdateTransaction } from '../hooks/api';
import { useFormatCurrency } from '../hooks';
import type { CsvParser, ImportStep, ParsedRow } from '../types';

export function Import() {
  const { formatCurrency } = useFormatCurrency();
  const navigate = useNavigate();
  const { data: accounts = [] } = useAccounts();
  const createImportBatchMutation = useCreateImportBatch();
  const bulkCreateTransactionsMutation = useBulkCreateTransactions();
  const updateTransactionMutation = useUpdateTransaction();

  // ─── Wizard state ──────────────────────────────────────────
  const [step, setStep] = useState<ImportStep>('upload');
  const [rawContent, setRawContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedParser, setSelectedParser] = useState<CsvParser | null>(null);
  const [isCreatingParser, setIsCreatingParser] = useState(false);
  const [parserToEdit, setParserToEdit] = useState<CsvParser | null>(null);
  const [importResult, setImportResult] = useState<{ count: number; income: number; expense: number } | null>(null);

  // ─── Derived CSV data ──────────────────────────────────────
  const { headers, dataRows, skippedRows } = useMemo(() => {
    if (!rawContent) return { headers: [] as string[], dataRows: [] as string[][], skippedRows: [] as string[][] };

    const delimiter = selectedParser?.delimiter ?? detectDelimiter(rawContent);
    const rawRows = parseRawCsv(rawContent, delimiter);
    const hasHeader = selectedParser?.hasHeaderRow ?? true;
    const skip = selectedParser?.skipRows ?? 0;

    return extractHeadersAndData(rawRows, hasHeader, skip);
  }, [rawContent, selectedParser]);

  // ─── Detected account identifier from skipped header rows ───
  const detectedIdentifier = useMemo(() => {
    if (!selectedParser?.accountPattern || skippedRows.length === 0) return undefined;
    return extractAccountIdentifier(skippedRows, selectedParser.accountPattern) ?? undefined;
  }, [skippedRows, selectedParser]);

  // ─── Parsed rows (only when parser is selected) ────────────
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (!selectedParser || dataRows.length === 0) return [];
    return applyParser(dataRows, headers, selectedParser);
  }, [selectedParser, dataRows, headers]);

  // ─── Step 1: File loaded ───────────────────────────────────
  const handleFileLoaded = useCallback((content: string, name: string) => {
    setRawContent(content);
    setFileName(name);
    setSelectedParser(null);
    setIsCreatingParser(false);
    setStep('parser');
  }, []);

  // ─── Step 2: Parser selected ───────────────────────────────
  const handleSelectParser = useCallback((parser: CsvParser) => {
    setSelectedParser(parser);
    setIsCreatingParser(false);
    setStep('preview');
  }, []);

  const handleCreateNew = useCallback(() => {
    setParserToEdit(null);
    setIsCreatingParser(true);
    setStep('parser');
  }, []);

  const handleEditParser = useCallback((parser: CsvParser) => {
    setParserToEdit(parser);
    setIsCreatingParser(true);
    setStep('parser');
  }, []);

  const handleParserSaved = useCallback((parser: CsvParser) => {
    setParserToEdit(null);
    setIsCreatingParser(false);
    if (rawContent) {
      setSelectedParser(parser);
      setStep('preview');
      return;
    }

    setStep('upload');
  }, [rawContent]);

  const handleCancelCreate = useCallback(() => {
    setIsCreatingParser(false);
    setParserToEdit(null);
    setStep(rawContent ? 'parser' : 'upload');
  }, [rawContent]);

  // ─── Step 3: Import confirmed ──────────────────────────────
  const handleConfirmImport = useCallback(async (
    selectedRowIndexes: number[],
    accountId: string,
    importName: string,
    transferLinks: Array<{ rowIndex: number; matchedTransactionId: string }>,
  ) => {
    if (!selectedParser) return;

    const selectedRows = selectedRowIndexes
      .map((index) => parsedRows[index])
      .filter((row): row is ParsedRow => row !== undefined);

    // Resolve the account's currency for fallback
    const account = accounts.find((a) => a.id === accountId);
    const fallbackCurrency = account?.currency ?? 'CHF';

    try {
      // 1. Create an import batch record
      const batch = await createImportBatchMutation.mutateAsync({
        fileName,
        name: importName || fileName,
        importedAt: new Date().toISOString(),
        parserName: selectedParser.name,
        parserId: selectedParser.id,
        rowCount: selectedRows.length,
        accountId,
      });

      // 2. Build transfer pair mappings
      const transferLinkByRowIndex = new Map<number, { pairId: string; role: 'source' | 'destination' }>();
      const matchedTransactionUpdates = new Map<string, { transferPairId: string; transferPairRole: 'source' | 'destination' }>();

      transferLinks.forEach((link, index) => {
        const row = parsedRows[link.rowIndex];
        if (!row) return;

        const pairId = `transfer-pair-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
        const newRole: 'source' | 'destination' = row.amount < 0 ? 'source' : 'destination';
        const matchedRole: 'source' | 'destination' = newRole === 'source' ? 'destination' : 'source';

        transferLinkByRowIndex.set(link.rowIndex, { pairId, role: newRole });
        matchedTransactionUpdates.set(link.matchedTransactionId, {
          transferPairId: pairId,
          transferPairRole: matchedRole,
        });
      });

      // 3. Build transaction payloads
      const transactionPayloads = selectedRowIndexes
        .map((rowIndex) => {
          const row = parsedRows[rowIndex];
          if (!row) return null;

          const transferLink = transferLinkByRowIndex.get(rowIndex);
          return {
            transactionId: row.transactionId,
            amount: row.amount,
            currency: row.currency || fallbackCurrency,
            description: row.description,
            date: row.date,
            time: row.time,
            accountId,
            importBatchId: batch.id,
            metadata: row.metadata && row.metadata.length > 0 ? row.metadata : undefined,
            rawData: row.raw,
            ...(transferLink && {
              transferPairId: transferLink.pairId,
              transferPairRole: transferLink.role,
            }),
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      // 4. Bulk create transactions (backend applies automation rules)
      await bulkCreateTransactionsMutation.mutateAsync(transactionPayloads);

      // 5. Update matched existing transactions with transfer pair IDs
      for (const [txId, pairInfo] of matchedTransactionUpdates) {
        await updateTransactionMutation.mutateAsync({ id: txId, ...pairInfo });
      }

      // 6. Calculate stats for the success screen
      let income = 0;
      let expense = 0;
      for (const row of selectedRows) {
        if (row.amount >= 0) income += row.amount;
        else expense += Math.abs(row.amount);
      }
      setImportResult({ count: selectedRows.length, income, expense });
      toast.success(`${selectedRows.length} transactions imported`);
      setStep('complete');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import transactions');
    }
  }, [selectedParser, parsedRows, fileName, accounts, createImportBatchMutation, bulkCreateTransactionsMutation, updateTransactionMutation]);

  // ─── Navigation helpers ────────────────────────────────────
  const handleBackToUpload = useCallback(() => {
    setStep('upload');
    setRawContent('');
    setFileName('');
    setSelectedParser(null);
    setParserToEdit(null);
    setIsCreatingParser(false);
  }, []);

  const handleBackToParser = useCallback(() => {
    setStep('parser');
    setSelectedParser(null);
    setParserToEdit(null);
    setIsCreatingParser(false);
  }, []);

  const handleStartOver = useCallback(() => {
    setStep('upload');
    setRawContent('');
    setFileName('');
    setSelectedParser(null);
    setParserToEdit(null);
    setIsCreatingParser(false);
    setImportResult(null);
  }, []);

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Header */}
      <PageHeader title="Import Transactions">
        <Button
          variant="ghost"
          onClick={() => navigate('/transactions')}
        >
          <ArrowLeft size={16} />
          Transactions
        </Button>
      </PageHeader>

      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={step} />
      </div>

      {/* ─── Step 1: Upload ────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-lg font-medium text-foreground mb-1">Select a CSV file</h2>
            <p className="text-base text-muted-foreground">
              Upload a bank export or transaction file in CSV format.
            </p>
          </div>
          <FileUpload onFileLoaded={handleFileLoaded} />
          <ParserLibrary
            onCreateParser={handleCreateNew}
            onEditParser={handleEditParser}
          />
        </div>
      )}

      {/* ─── Step 2: Parser ────────────────────────────────── */}
      {step === 'parser' && !isCreatingParser && (
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-center gap-3 px-1">
            <FileText size={16} className="text-dimmed" />
            <span className="text-sm text-muted-foreground">{fileName}</span>
            <span className="text-sm text-dimmed">&middot; {dataRows.length} rows</span>
            <button
              onClick={handleBackToUpload}
              className="text-sm text-dimmed hover:text-foreground transition-colors ml-auto bg-transparent border-none cursor-pointer"
            >
              Change file
            </button>
          </div>

          {/* Parser matching */}
          <ParserMatcher
            rawContent={rawContent}
            onSelectParser={handleSelectParser}
            onEditParser={handleEditParser}
            onCreateNew={handleCreateNew}
          />
        </div>
      )}

      {/* ─── Step 2b: Parser Editor ────────────────────────── */}
      {step === 'parser' && isCreatingParser && (
        <ParserEditor
          rawContent={rawContent}
          existingParser={parserToEdit ?? undefined}
          onSave={handleParserSaved}
          onCancel={handleCancelCreate}
        />
      )}

      {/* ─── Step 3: Preview ───────────────────────────────── */}
      {step === 'preview' && selectedParser && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <FileText size={16} className="text-dimmed" />
            <span className="text-sm text-muted-foreground">{fileName}</span>
            <span className="text-sm text-dimmed">
              &middot; parser: {selectedParser.name}
            </span>
            <button
              onClick={handleBackToParser}
              className="text-sm text-dimmed hover:text-foreground transition-colors ml-auto bg-transparent border-none cursor-pointer"
            >
              Change parser
            </button>
          </div>

          <TransactionPreview
            rows={parsedRows}
            onConfirm={handleConfirmImport}
            onBack={handleBackToParser}
            detectedIdentifier={detectedIdentifier}
            fileName={fileName}
          />
        </div>
      )}

      {/* ─── Step 4: Complete ──────────────────────────────── */}
      {step === 'complete' && importResult && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-income/10 flex items-center justify-center mb-6">
            <CheckCircle size={32} className="text-income" />
          </div>
          <h2 className="font-display text-lg font-medium text-foreground mb-2">Import complete</h2>
          <p className="text-base text-muted-foreground mb-6">
            Successfully imported {importResult.count} transaction{importResult.count !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-6 mb-8">
            <div className="text-center">
              <p className="text-sm text-dimmed mb-1">Income</p>
              <p className="text-sm text-income font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                +{formatCurrency(importResult.income)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-dimmed mb-1">Expenses</p>
              <p className="text-sm text-expense font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                -{formatCurrency(importResult.expense)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/transactions">
                View Transactions
              </Link>
            </Button>
            <Button variant="outline" onClick={handleStartOver}>
              <Upload size={14} />
              Import Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
