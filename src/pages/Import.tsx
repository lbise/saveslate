import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, CheckCircle, Upload, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
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
import { getAccountById } from '../lib/account-storage';
import { applyAutomationRules, loadAutomationRules } from '../lib/automation-rules';
import { addTransactions, saveImportBatch } from '../lib/transaction-storage';
import { formatCurrency } from '../lib/utils';
import type { CsvParser, ImportStep, ParsedRow, Transaction } from '../types';

export function Import() {
  const navigate = useNavigate();

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
  const handleConfirmImport = useCallback((selectedRows: ParsedRow[], accountId: string, importName: string) => {
    if (!selectedParser) return;

    // Resolve the account's currency for fallback
    const account = getAccountById(accountId);
    const fallbackCurrency = account?.currency ?? 'CHF';

    // Create an import batch record
    const batch = saveImportBatch({
      fileName,
      name: importName || fileName, // Use importName if provided, otherwise fileName
      importedAt: new Date().toISOString(),
      parserName: selectedParser.name,
      parserId: selectedParser.id,
      rowCount: selectedRows.length,
      accountId,
    });

    // Convert parsed rows to Transaction objects
    const now = Date.now();
    const transactions: Transaction[] = selectedRows.map((row, idx) => ({
      id: `txn-${now}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      transactionId: row.transactionId,
      amount: row.amount,
      currency: row.currency || fallbackCurrency,
      categoryId: 'uncategorized',
      description: row.description,
      date: row.date,
      time: row.time,
      accountId,
      importBatchId: batch.id,
      metadata: row.metadata && row.metadata.length > 0 ? row.metadata : undefined,
      rawData: row.raw,
    }));

    // Apply automation rules (if configured) before persisting
    const automationRules = loadAutomationRules();
    const automationResult = applyAutomationRules(transactions, automationRules, 'on-import');

    // Persist to localStorage
    addTransactions(automationResult.transactions);

    // Calculate stats for the success screen
    let income = 0;
    let expense = 0;
    for (const row of selectedRows) {
      if (row.amount >= 0) income += row.amount;
      else expense += Math.abs(row.amount);
    }
    setImportResult({ count: selectedRows.length, income, expense });
    setStep('complete');
  }, [selectedParser, fileName]);

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
    <div className="page-container">
      {/* Header */}
      <PageHeader title="Import Transactions">
        <button
          onClick={() => navigate('/transactions')}
          className="btn-ghost"
        >
          <ArrowLeft size={16} />
          Transactions
        </button>
      </PageHeader>

      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={step} />
      </div>

      {/* ─── Step 1: Upload ────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div>
            <h2 className="heading-2 mb-1">Select a CSV file</h2>
            <p className="text-body">
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
            <FileText size={16} className="text-text-muted" />
            <span className="text-ui">{fileName}</span>
            <span className="text-ui text-text-muted">&middot; {dataRows.length} rows</span>
            <button
              onClick={handleBackToUpload}
              className="text-ui text-text-muted hover:text-text transition-colors ml-auto bg-transparent border-none cursor-pointer"
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
            <FileText size={16} className="text-text-muted" />
            <span className="text-ui">{fileName}</span>
            <span className="text-ui text-text-muted">
              &middot; parser: {selectedParser.name}
            </span>
            <button
              onClick={handleBackToParser}
              className="text-ui text-text-muted hover:text-text transition-colors ml-auto bg-transparent border-none cursor-pointer"
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
          <h2 className="heading-2 mb-2">Import complete</h2>
          <p className="text-body mb-6">
            Successfully imported {importResult.count} transaction{importResult.count !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-6 mb-8">
            <div className="text-center">
              <p className="text-ui text-text-muted mb-1">Income</p>
              <p className="text-ui text-income font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                +{formatCurrency(importResult.income)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-ui text-text-muted mb-1">Expenses</p>
              <p className="text-ui text-expense font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                -{formatCurrency(importResult.expense)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/transactions" className="btn-primary">
              View Transactions
            </Link>
            <button onClick={handleStartOver} className="btn-secondary">
              <Upload size={14} />
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
