
import { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileDropZoneProps {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  allowedFileTypes: string[];
}

export function FileDropZone({ selectedFile, setSelectedFile, allowedFileTypes }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedFileTypes.includes(fileExtension)) {
      toast.error(`Invalid file type. Please upload ${allowedFileTypes.join(' or ')} files.`);
      return;
    }
    
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-10 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300",
        selectedFile ? "bg-gray-50" : ""
      )}
    >
      {!selectedFile ? (
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">
              Drag and drop your file here, or{" "}
              <label className="text-primary hover:text-primary/80 cursor-pointer">
                browse
                <input
                  type="file"
                  className="hidden"
                  accept={allowedFileTypes.join(',')}
                  onChange={handleFileChange}
                />
              </label>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: {allowedFileTypes.join(', ')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded bg-white animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileUp className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={handleRemoveFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
