import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { FileDropZone } from './FileDropZone';
import { UploadActions } from './UploadActions';
import { uploadManual } from '@/services/manualService';

export function ManualUploader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const allowedFileTypes = ['.docx', '.pdf', '.txt'];

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      if (!user) {
        toast.error('You must be logged in to upload a manual');
      }
      return;
    }
    
    setUploading(true);
    
    try {
      const result = await uploadManual(selectedFile, user.id);
      
      if (result.success && result.manualId) {
        toast.success('Manual uploaded successfully!');
        navigate(`/manual/${result.manualId}`);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error uploading manual:', error);
      toast.error('Failed to upload manual');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Upload Manual</CardTitle>
        <CardDescription>
          Upload a manual document in .docx, .pdf, or .txt format. The system will automatically extract the structure and content, preserving document organization and hierarchy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileDropZone 
          selectedFile={selectedFile} 
          setSelectedFile={setSelectedFile}
          allowedFileTypes={allowedFileTypes}
        />
        <div className="mt-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
          <p className="mb-2 font-medium">Supported formats:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium">.docx</span>: Extracts text and preserves basic structure</li>
            <li><span className="font-medium">.pdf</span>: Extracts text content with page markers</li>
            <li><span className="font-medium">.txt</span>: Analyzes plain text to identify headers and sections</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <UploadActions
          selectedFile={selectedFile}
          uploading={uploading}
          onCancel={() => setSelectedFile(null)}
          onUpload={handleUpload}
        />
      </CardFooter>
    </Card>
  );
}
