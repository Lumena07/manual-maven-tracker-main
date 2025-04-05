
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

interface UploadActionsProps {
  selectedFile: File | null;
  uploading: boolean;
  onCancel: () => void;
  onUpload: () => void;
}

export function UploadActions({ 
  selectedFile, 
  uploading, 
  onCancel, 
  onUpload 
}: UploadActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        disabled={uploading}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button 
        onClick={onUpload} 
        disabled={!selectedFile || uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Upload Manual
          </>
        )}
      </Button>
    </div>
  );
}
