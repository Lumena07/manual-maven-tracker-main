import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AmendmentStatus } from './AmendmentStatus';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { diffWords } from 'diff';

interface Amendment {
  id: string;
  section_id: string;
  manual_id: string;
  title: string;
  content: string;
  original_content: string;
  status: 'pending' | 'quality' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  rejection_reason?: string;
  manual_title?: string;
}

interface AmendmentManagerProps {
  manualId: string;
  onAmendmentStatusChange?: () => void;
}

function renderDiff(original: string, proposed: string) {
  if (!original || !proposed) return null;
  
  const differences = diffWords(original, proposed);
  
  return (
    <div className="space-y-1">
      {differences.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="bg-green-200 text-green-900 px-1 rounded inline">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="line-through bg-red-200 text-red-900 px-1 rounded inline">
              {part.value}
            </span>
          );
        }
        return <span key={index} className="inline">{part.value}</span>;
      })}
    </div>
  );
}

export function AmendmentManager({ manualId, onAmendmentStatusChange }: AmendmentManagerProps) {
  const { user } = useAuth();
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchAmendments();
  }, [manualId]);

  const fetchAmendments = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('amendments')
        .select(`
          *,
          manuals:manual_id (
            title
          )
        `)
        .order('created_at', { ascending: false });

      // Only apply the manual_id filter if we're not viewing all manuals
      const { data, error } = await (manualId === 'all' 
        ? query 
        : query.eq('manual_id', manualId));

      if (error) throw error;

      // Transform the data to include manual title
      const transformedData = data?.map(amendment => ({
        ...amendment,
        manual_title: amendment.manuals?.title
      })) || [];

      setAmendments(transformedData);
    } catch (error) {
      console.error('Error fetching amendments:', error);
      toast.error('Failed to load amendments');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (amendment: Amendment) => {
    try {
      console.log('Starting amendment acceptance process for:', amendment.id);
      console.log('Amendment data:', amendment);
      console.log('Current user:', user);
      
      // Update the amendment status to 'quality' - this will trigger the database function
      // to update the section content and create a temporary revision automatically
      console.log('Updating amendment status to quality for:', amendment.id);
      console.log('Update data:', {
        status: 'quality',
        approved_by_quality_by: user?.id,
        approved_by_quality_at: new Date().toISOString()
      });
      
      const { data: amendmentData, error: amendmentError } = await supabase
        .from('amendments')
        .update({
          status: 'quality',
          approved_by_quality_by: user?.id,
          approved_by_quality_at: new Date().toISOString()
        })
        .eq('id', amendment.id)
        .select();

      if (amendmentError) {
        console.error('Error updating amendment status:', amendmentError);
        console.error('Error details:', {
          code: amendmentError.code,
          message: amendmentError.message,
          details: amendmentError.details,
          hint: amendmentError.hint
        });
        console.error('Amendment ID that failed:', amendment.id);
        console.error('User ID that attempted update:', user?.id);
        
        // Check if it's an authentication error
        if (amendmentError.message.includes('No API key found in request')) {
          console.error('Authentication error: No API key found in request');
          toast.error('Authentication error. Please try logging out and back in.');
          return;
        }
        
        throw amendmentError;
      }
      
      console.log('Amendment status updated successfully:', amendmentData);

      toast.success('Amendment accepted');
      fetchAmendments();
      onAmendmentStatusChange?.();
    } catch (error) {
      console.error('Error accepting amendment:', error);
      toast.error('Failed to accept amendment');
    }
  };

  const handleReject = async (amendment: Amendment) => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase
        .from('amendments')
        .update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', amendment.id);

      if (error) throw error;

      toast.success('Amendment rejected');
      setSelectedAmendment(null);
      setRejectionReason('');
      fetchAmendments();
      onAmendmentStatusChange?.();
    } catch (error) {
      console.error('Error rejecting amendment:', error);
      toast.error('Failed to reject amendment');
    }
  };

  const viewAmendment = (amendment: Amendment) => {
    setSelectedAmendment(amendment);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          Amendment Management
        </h3>
        <p className="text-sm text-muted-foreground">
          {manualId === 'all' 
            ? 'Review and manage pending amendments across all manuals'
            : 'Review and manage pending amendments for this manual'
          }
        </p>
      </div>
      <div className="p-6 pt-0">
        {loading ? (
          <div className="text-center py-4">Loading amendments...</div>
        ) : amendments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No amendments found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {manualId === 'all' && <TableHead>Manual</TableHead>}
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amendments.map((amendment) => (
                <TableRow key={amendment.id}>
                  {manualId === 'all' && (
                    <TableCell className="font-medium">{amendment.manual_title}</TableCell>
                  )}
                  <TableCell className="font-medium">{amendment.title}</TableCell>
                  <TableCell>
                    <AmendmentStatus status={amendment.status} />
                  </TableCell>
                  <TableCell>{amendment.created_by}</TableCell>
                  <TableCell>
                    {new Date(amendment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewAmendment(amendment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                                       </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!selectedAmendment} onOpenChange={() => {
          setSelectedAmendment(null);
          setRejectionReason('');
        }}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedAmendment?.status === 'rejected' ? 'Reject Amendment' : 'View Amendment'}
              </DialogTitle>
              <DialogDescription>
                {selectedAmendment?.status === 'rejected'
                  ? 'Please provide a reason for rejecting this amendment'
                  : 'Review the proposed changes'}
              </DialogDescription>
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
                    {renderDiff(selectedAmendment.original_content, selectedAmendment.content)}
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
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAmendment(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              {selectedAmendment?.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedAmendment({ ...selectedAmendment, status: 'rejected' });
                    }}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => handleAccept(selectedAmendment)}>
                    Approve
                  </Button>
                </>
              )}
              {selectedAmendment?.status === 'rejected' && (
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedAmendment)}
                >
                  Reject Amendment
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 