import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemporaryRevision {
  id: string;
  revision_number: string;
  section_id: string;
  description: string;
  date_issued: string;
  effective_date: string;
  expiry_date: string;
  issued_by: string;
  section_title?: string;
}

interface TemporaryRevisionManagerProps {
  manualId: string;
}

export function TemporaryRevisionManager({ manualId }: TemporaryRevisionManagerProps) {
  const [revisions, setRevisions] = useState<TemporaryRevision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevisions();
  }, [manualId]);

  const fetchRevisions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temporary_revisions')
        .select(`
          *,
          sections:section_id (
            title
          )
        `)
        .eq('manual_id', manualId)
        .order('date_issued', { ascending: false });

      if (error) throw error;

      const transformedData = data?.map(revision => ({
        ...revision,
        section_title: revision.sections?.title
      })) || [];

      setRevisions(transformedData);
    } catch (error) {
      console.error('Error fetching temporary revisions:', error);
      toast.error('Failed to load temporary revisions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          Temporary Revisions
        </h3>
        <p className="text-sm text-muted-foreground">
          View and manage temporary revisions for this manual
        </p>
      </div>
      <div className="p-6 pt-0">
        {loading ? (
          <div className="text-center py-4">Loading revisions...</div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No temporary revisions found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Revision Number</TableHead>
                <TableHead>Affected Section</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date Issued</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Issued By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell className="font-medium">{revision.revision_number}</TableCell>
                  <TableCell>{revision.section_title}</TableCell>
                  <TableCell>{revision.description}</TableCell>
                  <TableCell>{new Date(revision.date_issued).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(revision.effective_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(revision.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{revision.issued_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
} 