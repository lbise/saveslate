import { Download, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="whitespace-nowrap"
        onClick={onImport}
        disabled={importDisabled}
      >
        <Upload size={14} />
        {importLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="whitespace-nowrap"
        onClick={onExport}
        disabled={exportDisabled}
      >
        <Download size={14} />
        {exportLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        className="whitespace-nowrap"
        onClick={onCreate}
        disabled={createDisabled}
      >
        <Plus size={14} />
        {createLabel}
      </Button>
    </div>
  );
}
