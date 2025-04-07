import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { DocumentNumberManager } from './DocumentNumberManager';

interface ManualHeaderProps {
  manualId: string;
  documentTitle: string;
  onHeaderChange: (headerData: HeaderData) => void;
  isPrintMode?: boolean;
  sectionNumber?: string;
}

export interface HeaderData {
  companyName: string;
  documentTitle: string;
  docNumber: string;
  docName: string;
  issueNo: string;
  revisionNo: string;
  date: string;
  sectionNumber: string;
  pageNumber: number;
  logoUrl?: string;
}

export function ManualHeader({ 
  manualId, 
  documentTitle, 
  onHeaderChange,
  isPrintMode = false,
  sectionNumber = ''
}: ManualHeaderProps) {
  const [headerData, setHeaderData] = useState<HeaderData>({
    companyName: '',
    documentTitle: documentTitle,
    docNumber: '',
    docName: '',
    issueNo: '',
    revisionNo: '',
    date: '',
    sectionNumber: sectionNumber,
    pageNumber: 1,
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevisionData();
  }, [manualId, sectionNumber]);

  const fetchRevisionData = async () => {
    try {
      setLoading(true);
      
      // Fetch the latest revision data
      const { data: revisionData, error: revisionError } = await supabase
        .from('final_revisions')
        .select('issue_no, revision_no, revision_date')
        .eq('manual_id', manualId)
        .order('revision_date', { ascending: false })
        .limit(1);

      if (revisionError) throw revisionError;

      // Fetch manual settings for company name
      const { data: manualData, error: manualError } = await supabase
        .from('manuals')
        .select(`
          company:companies (
            name
          )
        `)
        .eq('id', manualId)
        .single();

      if (manualError) throw manualError;

      // Update header data
      const latestRevision = revisionData && revisionData.length > 0 ? revisionData[0] : null;
      const revisionDate = latestRevision ? new Date(latestRevision.revision_date) : new Date();

      // Set the date to the first day of the month
      const firstDayOfMonth = new Date(revisionDate.getFullYear(), revisionDate.getMonth(), 1);

      setHeaderData(prev => ({
        ...prev,
        companyName: manualData?.company?.name || '',
        issueNo: latestRevision ? latestRevision.issue_no : '',
        revisionNo: latestRevision ? latestRevision.revision_no : '',
        date: firstDayOfMonth.toISOString().split('T')[0],
        logoUrl: null, // Set to null since the column doesn't exist
        sectionNumber: sectionNumber
      }));

      // Notify parent component of the header data
      onHeaderChange({
        ...headerData,
        companyName: manualData?.company?.name || '',
        issueNo: latestRevision ? latestRevision.issue_no : '',
        revisionNo: latestRevision ? latestRevision.revision_no : '',
        date: firstDayOfMonth.toISOString().split('T')[0],
        logoUrl: null, // Set to null since the column doesn't exist
        sectionNumber: sectionNumber
      });
    } catch (error) {
      console.error('Error fetching header data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof HeaderData, value: string) => {
    const updatedData = { ...headerData, [field]: value };
    setHeaderData(updatedData);
    onHeaderChange(updatedData);
  };

  const handleDocumentNumberChange = (docNumber: string, docName: string) => {
    const updatedData = { 
      ...headerData, 
      docNumber,
      docName
    };
    setHeaderData(updatedData);
    onHeaderChange(updatedData);
  };

  if (loading) {
    return <div>Loading header data...</div>;
  }

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <div className="p-2 border rounded-md bg-gray-50">{headerData.companyName}</div>
        </div>

        <DocumentNumberManager 
          manualId={manualId} 
          onDocumentNumberChange={handleDocumentNumberChange} 
        />

        <div className="space-y-2">
          <Label htmlFor="document-title">Document Title</Label>
          {isPrintMode ? (
            <div className="p-2 border rounded-md bg-gray-50">{headerData.documentTitle}</div>
          ) : (
            <Input
              id="document-title"
              value={headerData.documentTitle}
              onChange={(e) => handleInputChange('documentTitle', e.target.value)}
              placeholder="Enter document title"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue-no">Issue No.</Label>
          <div className="p-2 border rounded-md bg-gray-50">{headerData.issueNo}</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="revision-no">Revision No.</Label>
          <div className="p-2 border rounded-md bg-gray-50">{headerData.revisionNo}</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <div className="p-2 border rounded-md bg-gray-50">{headerData.date}</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="section-number">Section Number</Label>
          <div className="p-2 border rounded-md bg-gray-50">{headerData.sectionNumber}</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-number">Page Number</Label>
          {isPrintMode ? (
            <div className="p-2 border rounded-md bg-gray-50">{headerData.pageNumber}</div>
          ) : (
            <Input
              id="page-number"
              type="number"
              value={headerData.pageNumber}
              onChange={(e) => handleInputChange('pageNumber', e.target.value)}
              min="1"
            />
          )}
        </div>
      </div>
    </div>
  );
} 