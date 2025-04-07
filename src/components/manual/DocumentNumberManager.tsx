import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface DocumentNumber {
  id: string;
  doc_number: string;
  doc_name: string;
  created_at: string;
}

interface DocumentNumberManagerProps {
  manualId: string;
  onDocumentNumberChange: (docNumber: string, docName: string) => void;
}

export function DocumentNumberManager({ manualId, onDocumentNumberChange }: DocumentNumberManagerProps) {
  const [documentNumbers, setDocumentNumbers] = useState<DocumentNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [selectedDocNumber, setSelectedDocNumber] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchDocumentNumbers();
  }, [manualId]);

  const fetchDocumentNumbers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_numbers')
        .select('*')
        .eq('manual_id', manualId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentNumbers(data || []);
      
      // If there are document numbers, select the most recent one
      if (data && data.length > 0) {
        setSelectedDocNumber(data[0].id);
        onDocumentNumberChange(data[0].doc_number, data[0].doc_name);
      }
    } catch (error) {
      console.error('Error fetching document numbers:', error);
      toast.error('Failed to load document numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocumentNumber = async () => {
    if (!newDocNumber || !newDocName) {
      toast.error('Please enter both document number and name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('document_numbers')
        .insert({
          manual_id: manualId,
          doc_number: newDocNumber,
          doc_name: newDocName
        })
        .select()
        .single();

      if (error) throw error;
      
      setDocumentNumbers([data, ...documentNumbers]);
      setSelectedDocNumber(data.id);
      onDocumentNumberChange(data.doc_number, data.doc_name);
      setNewDocNumber('');
      setNewDocName('');
      setIsDialogOpen(false);
      toast.success('Document number added successfully');
    } catch (error) {
      console.error('Error adding document number:', error);
      toast.error('Failed to add document number');
    }
  };

  const handleSelectDocumentNumber = (id: string) => {
    setSelectedDocNumber(id);
    const selected = documentNumbers.find(doc => doc.id === id);
    if (selected) {
      onDocumentNumberChange(selected.doc_number, selected.doc_name);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="document-number">Document Number</Label>
          {documentNumbers.length > 0 ? (
            <Select value={selectedDocNumber || ''} onValueChange={handleSelectDocumentNumber}>
              <SelectTrigger id="document-number" className="w-full">
                <SelectValue placeholder="Select a document number" />
              </SelectTrigger>
              <SelectContent>
                {documentNumbers.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.doc_number} - {doc.doc_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">
              No document numbers found. Please add one.
            </div>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Add New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Document Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-doc-number">Document Number</Label>
                <Input
                  id="new-doc-number"
                  value={newDocNumber}
                  onChange={(e) => setNewDocNumber(e.target.value)}
                  placeholder="Enter document number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-doc-name">Document Name</Label>
                <Input
                  id="new-doc-name"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
              <Button onClick={handleAddDocumentNumber} className="w-full">
                Add Document Number
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 