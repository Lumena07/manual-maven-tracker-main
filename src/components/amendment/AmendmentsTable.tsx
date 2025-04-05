import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AmendmentRow } from '@/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AmendmentStatus } from './AmendmentStatus';

export function AmendmentsTable() {
  const [selectedAmendment, setSelectedAmendment] = useState<AmendmentRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  // Fetch amendments grouped by status
  const { data: amendments, isLoading } = useQuery({
    queryKey: ['amendments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amendments')
        .select(`
          id,
          section_id,
          manual_id,
          title,
          content,
          original_content,
          status,
          created_by,
          created_at,
          rejection_reason,
          reason,
          manual_title:manuals(title)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Ensure manual_title is a string, not an object
      return data.map(item => ({
        ...item,
        manual_title: typeof item.manual_title === 'object' ? 
          (item.manual_title?.title || 'Unknown Manual') : 
          (item.manual_title || 'Unknown Manual'),
        approved_by_quality_by: null,
        approved_by_quality_at: null,
        approved_by_authority_by: null,
        approved_by_authority_at: null,
              })) as unknown as AmendmentRow[];
    }
  });

  // Group amendments by status
  const pendingAmendments = amendments?.filter(a => a.status === 'pending') || [];
  const qualityAmendments = amendments?.filter(a => a.status === 'quality') || [];
  const approvedAmendments = amendments?.filter(a => a.status === 'approved') || [];
  const rejectedAmendments = amendments?.filter(a => a.status === 'rejected') || [];

  // Mutation for approving an amendment
  const approveAmendmentMutation = useMutation({
    mutationFn: async (amendment: AmendmentRow) => {
      // Start a transaction
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');

      // 1. Update amendment status to approved
      const { error: updateError } = await supabase
        .from('amendments')
        .update({ 
          status: 'approved',
          approved_by_authority_at: new Date().toISOString(),
          approved_by_authority_by: session.user.id
        })
        .eq('id', amendment.id);

      if (updateError) throw updateError;

      // 2. Get the manual version number
      const { data: manualData, error: manualError } = await supabase
        .from('manuals')
        .select('version')
        .eq('id', amendment.manual_id)
        .single();

      if (manualError) throw manualError;

      // 3. Get the latest revision number
      const { data: latestRevision, error: revisionError } = await supabase
        .from('final_revisions')
        .select('revision_no')
        .eq('manual_id', amendment.manual_id)
        .order('revision_no', { ascending: false })
        .limit(1)
        .single();

      // Calculate the next revision number
      const nextRevisionNo = latestRevision 
        ? parseInt(latestRevision.revision_no) + 1 
        : 1;

      // 4. Create a final revision
      const { error: finalRevisionError } = await supabase
        .from('final_revisions')
        .insert({
          issue_no: manualData.version || '1.0',
          revision_no: nextRevisionNo.toString(),
          revision_date: amendment.approved_by_quality_at || new Date().toISOString(),
          affected_pages: amendment.title,
          reason: amendment.reason,
          date_inserted: new Date().toISOString(),
          inserted_by: amendment.created_by,
          manual_id: amendment.manual_id
        });

      if (finalRevisionError) throw finalRevisionError;

      return amendment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
      toast.success('Amendment approved and final revision created');
    },
    onError: (error) => {
      toast.error(`Failed to approve amendment: ${error.message}`);
    }
  });

  // Mutation for rejecting an amendment
  const rejectAmendmentMutation = useMutation({
    mutationFn: async ({ amendment, reason }: { amendment: AmendmentRow, reason: string }) => {
      const { error } = await supabase
        .from('amendments')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', amendment.id);

      if (error) throw error;
      return amendment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
      toast.success('Amendment rejected');
      setSelectedAmendment(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(`Failed to reject amendment: ${error.message}`);
    }
  });

  const handleApprove = (amendment: AmendmentRow) => {
    approveAmendmentMutation.mutate(amendment);
  };

  const handleReject = () => {
    if (!selectedAmendment) return;
    rejectAmendmentMutation.mutate({ 
      amendment: selectedAmendment, 
      reason: rejectionReason 
    });
  };

  const renderAmendmentTable = (amendments: AmendmentRow[]) => {
    if (amendments.length === 0) {
      return <div className="text-center py-4 text-gray-500">No amendments found</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Manual</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {amendments.map((amendment) => (
            <TableRow key={amendment.id}>
              <TableCell className="font-medium">{amendment.title}</TableCell>
              <TableCell>{amendment.title || 'Unknown Manual'}</TableCell>
              <TableCell>{amendment.reason}</TableCell>
              <TableCell>
                <AmendmentStatus status={amendment.status} />
              </TableCell>
              <TableCell>{new Date(amendment.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                   {amendment.status === 'quality' && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleApprove(amendment)}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedAmendment(amendment);
                          setRejectionReason('');
                        }}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {renderAmendmentTable(pendingAmendments)}
        </TabsContent>
        <TabsContent value="quality">
          {renderAmendmentTable(qualityAmendments)}
        </TabsContent>
        <TabsContent value="approved">
          {renderAmendmentTable(approvedAmendments)}
        </TabsContent>
        <TabsContent value="rejected">
          {renderAmendmentTable(rejectedAmendments)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedAmendment} onOpenChange={() => {
        setSelectedAmendment(null);
        setRejectionReason('');
      }}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedAmendment?.status === 'rejected' ? 'Reject Amendment' : 'View Amendment'}
            </DialogTitle>
          </DialogHeader>

          {selectedAmendment && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <h3 className="font-medium mb-2">Original Content</h3>
                <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                  {selectedAmendment.original_content}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Proposed Changes</h3>
                <div className="p-4 border rounded-md whitespace-pre-wrap">
                  {selectedAmendment.content}
                </div>
              </div>

              {selectedAmendment.status === 'rejected' && (
                <div>
                  <h3 className="font-medium mb-2">Rejection Reason</h3>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => {
              setSelectedAmendment(null);
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            {selectedAmendment?.status === 'rejected' && (
              <Button onClick={handleReject}>
                Reject
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 