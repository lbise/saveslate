import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Upload, FileText, Loader2 } from 'lucide-react';
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
} from '../lib/csv';
import { useAccounts, useCsvImport, useCsvPreview } from '../hooks/api';
import { useFormatCurrency } from '../hooks';
import type { CsvParser, ImportStep, ParsedRow } from '../types';

export function Import() {
  const { formatCurrency } = useFormatCurrency();
  const navigate = useNavigate();
  const { data: accounts = [] } = useAccounts();
  const csvImportMutation = useCsvImport();
  const {
    data: previewData,
    isPending: isPreviewPending,
    isError: isPreviewError,
    mutate: previewCsv,
    reset: resetCsvPreview,
  } = useCsvPreview();

  // ─── Wizard state ──────────────────────────────────────────
  const [step, setStep] = useState<ImportStep>('upload');
  const [rawContent, setRawContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedParser, setSelectedParser] = useState<CsvParser | null>(null);
  const [isCreatingParser, setIsCreatingParser] = useState(false);
  const [parserToEdit, setParserToEdit] = useState<CsvParser | null>(null);
  const [importResult, setImportResult] = useState<{ count: number; income: number; expense: number } | null>(null);

  // ─── Derived CSV data (client-side, for parser matching step) ──
  const { dataRows } = useMemo(() => {
    if (!rawContent) return { dataRows: [] as string[][] };

    const delimiter = selectedParser?.delimiter ?? detectDelimiter(rawContent);
    const rawRows = parseRawCsv(rawContent, delimiter);
    const hasHeader = selectedParser?.hasHeaderRow ?? true;
    const skip = selectedParser?.skipRows ?? 0;

    const result = extractHeadersAndData(rawRows, hasHeader, skip);
    return { headers: result.headers, dataRows: result.dataRows };
  }, [rawContent, selectedParser]);

  // ─── Server-parsed preview data ────────────────────────────
  const previewRows = useMemo<ParsedRow[]>(() => previewData?.rows ?? [], [previewData]);
  const detectedIdentifier = previewData?.accountIdentifier;

  // ─── Step 1: File loaded ───────────────────────────────────
  const handleFileLoaded = useCallback((content: string, name: string, fileObj: File) => {
    setRawContent(content);
    setFileName(name);
    setFile(fileObj);
    setSelectedParser(null);
    setIsCreatingParser(false);
    resetCsvPreview();
    setStep('parser');
  }, [resetCsvPreview]);

  // ─── Step 2: Parser selected ───────────────────────────────
  const handleSelectParser = useCallback((parser: CsvParser) => {
    setSelectedParser(parser);
    setIsCreatingParser(false);
    setStep('preview');
    if (file) {
      previewCsv({ file, parserId: parser.id });
    }
  }, [file, previewCsv]);

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
    if (file) {
      setSelectedParser(parser);
      setStep('preview');
      previewCsv({ file, parserId: parser.id });
      return;
    }

    setStep('upload');
  }, [file, previewCsv]);

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
    if (!selectedParser || !file) return;

    const selectedRows = selectedRowIndexes
      .map((index) => previewRows[index])
      .filter((row): row is ParsedRow => row !== undefined);

    // Resolve the account's currency for fallback
    const account = accounts.find((a) => a.id === accountId);
    const fallbackCurrency = account?.currency ?? 'CHF';

    try {
      await csvImportMutation.mutateAsync({
        file,
        accountId,
        parserId: selectedParser.id,
        currency: fallbackCurrency,
        importName: importName || fileName,
        selectedRowIndexes,
        transferLinks,
      });

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
  }, [selectedParser, previewRows, fileName, accounts, file, csvImportMutation]);

  // ─── Navigation helpers ────────────────────────────────────
  const handleBackToUpload = useCallback(() => {
    setStep('upload');
    setRawContent('');
    setFileName('');
    setFile(null);
    setSelectedParser(null);
    setParserToEdit(null);
    setIsCreatingParser(false);
    resetCsvPreview();
  }, [resetCsvPreview]);

  const handleBackToParser = useCallback(() => {
    setStep('parser');
    setSelectedParser(null);
    setParserToEdit(null);
    setIsCreatingParser(false);
    resetCsvPreview();
  }, [resetCsvPreview]);

  const handleStartOver = useCallback(() => {
    setStep('upload');
    setRawContent('');
    setFileName('');
    setFile(null);
    setSelectedParser(null);
    setParserToEdit(null);
    setIsCreatingParser(false);
    setImportResult(null);
    resetCsvPreview();
  }, [resetCsvPreview]);

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

          {isPreviewPending ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Parsing CSV&hellip;</span>
            </div>
          ) : isPreviewError ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-expense">Failed to parse CSV file</p>
              <Button variant="outline" size="sm" onClick={handleBackToParser}>
                <ArrowLeft size={14} />
                Back to Parser
              </Button>
            </div>
          ) : (
            <TransactionPreview
              rows={previewRows}
              onConfirm={handleConfirmImport}
              onBack={handleBackToParser}
              detectedIdentifier={detectedIdentifier}
              fileName={fileName}
            />
          )}
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
