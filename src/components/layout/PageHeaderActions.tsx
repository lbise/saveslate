import { Download, Plus, Upload } from 'lucide-react';

interface PageHeaderActionsProps {
  onImport: () => void;
  onExport: () => void;
  onCreate: () => void;
  importDisabled?: boolean;
  exportDisabled?: boolean;
  createDisabled?: boolean;
  importLabel?: string;
  exportLabel?: string;
  createLabel?: string;
}

export function PageHeaderActions({
  onImport,
  onExport,
  onCreate,
  importDisabled = false,
  exportDisabled = false,
  createDisabled = false,
  importLabel = 'Import',
  exportLabel = 'Export',
  createLabel = 'New',
}: PageHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 self-start">
      <button
        type="button"
        className="btn-secondary h-9 px-3.5 py-0 whitespace-nowrap"
        onClick={onImport}
        disabled={importDisabled}
      >
        <Upload size={14} />
        {importLabel}
      </button>
      <button
        type="button"
        className="btn-secondary h-9 px-3.5 py-0 whitespace-nowrap"
        onClick={onExport}
        disabled={exportDisabled}
      >
        <Download size={14} />
        {exportLabel}
      </button>
      <button
        type="button"
        className="btn-primary h-9 px-4 py-0 whitespace-nowrap"
        onClick={onCreate}
        disabled={createDisabled}
      >
        <Plus size={14} />
        {createLabel}
      </button>
    </div>
  );
}
