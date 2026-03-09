import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void;
}

export function FileUpload({ onFileLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Only CSV files are supported');
        return;
      }

      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large (max 10 MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content || content.trim().length === 0) {
          setError('File is empty');
          return;
        }
        setFileName(file.name);
        onFileLoaded(content, file.name);
      };
      reader.onerror = () => setError('Failed to read file');
      reader.readAsText(file);
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleClear = useCallback(() => {
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  if (fileName) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-(--radius-md) bg-income/10 flex items-center justify-center">
            <FileText size={20} className="text-income" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body text-text font-medium truncate">{fileName}</p>
            <p className="text-ui text-text-muted mt-0.5">Ready to configure parser</p>
          </div>
          <button
            onClick={handleClear}
            className="btn-icon"
            aria-label="Remove file" title="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'card cursor-pointer transition-all duration-150',
          'flex flex-col items-center justify-center gap-4 py-16 px-8',
          'border-dashed',
          isDragging
            ? 'border-text/40 bg-surface-hover'
            : 'border-border hover:border-text-muted hover:bg-surface-hover/50',
        )}
      >
        <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center">
          <Upload size={20} className="text-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-body text-text font-medium">
            Drop a CSV file here or click to browse
          </p>
          <p className="text-ui text-text-muted mt-1">
            Supports .csv files up to 10 MB
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="hidden"
      />
      {error && (
        <p className="text-ui text-expense mt-3">{error}</p>
      )}
    </div>
  );
}
