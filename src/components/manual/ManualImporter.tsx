import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { importManualFromUrl } from '@/services/manualService';
import { Link } from 'lucide-react';

export function ManualImporter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to import a manual');
      return;
    }
    
    setImporting(true);
    
    try {
      const result = await importManualFromUrl(url, user.id, title || undefined);
      
      if (result.success && result.manualId) {
        toast.success('Manual imported successfully!');
        navigate(`/manual/${result.manualId}`);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error importing manual:', error);
      toast.error('Failed to import manual');
    } finally {
      setImporting(false);
      setUrl('');
      setTitle('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Import Manual from URL</CardTitle>
        <CardDescription>
          Import a manual document from a URL. Supports PDF, DOCX, and TXT files with automatic structure detection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Document URL</Label>
          <div className="flex items-center space-x-2">
            <Link className="h-4 w-4 text-gray-500" />
            <Input 
              id="url"
              type="url"
              placeholder="https://example.com/document.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
          </div>
          <p className="text-sm text-gray-500">
            Enter the direct URL to a document file (.pdf, .docx, .txt)
          </p>
        </div>
        
        <div className="mt-4 bg-blue-50 p-3 rounded-md">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Supported formats and features:
          </p>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li><span className="font-medium">.docx</span>: Microsoft Word documents with full text extraction</li>
            <li><span className="font-medium">.pdf</span>: PDF documents with page-by-page text extraction</li>
            <li><span className="font-medium">.txt</span>: Plain text with intelligent section detection</li>
          </ul>
          <p className="text-sm text-gray-500 mt-2">
            The system will automatically analyze headers and create a structured table of contents.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="title">Manual Title (Optional)</Label>
          <Input 
            id="title"
            placeholder="Enter manual title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            If left blank, the filename will be used as the title
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          disabled={importing}
        >
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!url || importing}
          className={importing ? 'opacity-70' : ''}
        >
          {importing ? 'Importing...' : 'Import Manual'}
        </Button>
      </CardFooter>
    </Card>
  );
} 