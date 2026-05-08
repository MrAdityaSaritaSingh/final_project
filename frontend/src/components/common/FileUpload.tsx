import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export default function FileUpload({ onFileSelect, accept = '.csv,.xlsx' }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        setFileName(file.name);
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`block border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
        dragOver
          ? 'border-accent bg-surface-container-low'
          : fileName
            ? 'border-success bg-surface-container-lowest'
            : 'border-outline hover:border-accent bg-surface-container-lowest'
      }`}
    >
      <input type="file" accept={accept} onChange={handleChange} className="hidden" />
      {fileName ? (
        <>
          <p className="text-success font-semibold text-body-md">{fileName}</p>
          <p className="text-status-label text-on-surface-variant mt-1">Click or drop to replace</p>
        </>
      ) : (
        <>
          <p className="text-on-surface font-medium text-body-md">Drop your GL file here or click to browse</p>
          <p className="text-status-label text-on-surface-variant mt-1">Supports .csv and .xlsx</p>
        </>
      )}
    </label>
  );
}
