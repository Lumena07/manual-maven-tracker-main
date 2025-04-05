import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualViewer } from '@/components/manual/ManualViewer';
import { Separator } from '@/components/ui/separator';
import { AmendmentStatus } from '@/components/amendment/AmendmentStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// Types for our data
type ManualSection = {
  id: string;
  title: string;
  content: string;
  level: number;
  order: number;
  parent_id: string | null;
};

type Amendment = {
  id: string;
  section: string;
  title: string;
  status: 'pending' | 'quality' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
};

type TempRevision = {
  id: string;
  revisionNumber: string;
  affectedSection: string;
  description: string;
  dateIssued: string;
  effectiveDate: string;
  expiryDate?: string;
  issuedBy: string;
};

type FinalRevision = {
  id: string;
  manual_id: string;
  revision_number: string;
  description: string;
  date_issued: string;
  effective_date: string;
  created_by: string;
  created_at: string;
};

const Manual = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('content');
  
  const [manual, setManual] = useState<{
    id: string;
    title: string;
    description: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    sections: ManualSection[];
  } | null>(null);
  
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [tempRevisions, setTempRevisions] = useState<TempRevision[]>([]);
  const [finalRevisions, setFinalRevisions] = useState<FinalRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManualData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        console.log("Fetching manual data for ID:", id);
        
        // Fetch the manual
        const { data: manualData, error: manualError } = await supabase
          .from('manuals')
          .select('*')
          .eq('id', id)
          .single();
        
        if (manualError) throw manualError;
        if (!manualData) {
          console.error("Manual not found:", id);
          setError('Manual not found');
          return;
        }
        
        console.log("Successfully fetched manual:", manualData.title);
        
        // Fetch the sections
        const { data: sectionData, error: sectionError } = await supabase
          .from('manual_sections')
          .select('*')
          .eq('manual_id', id)
          .order('order', { ascending: true });
          
        if (sectionError) throw sectionError;
        
        // Fetch amendments
        const { data: amendmentData, error: amendmentError } = await supabase
          .from('amendments')
          .select(`
            id,
            section_id,
            title,
            status,
            created_at,
            created_by
          `)
          .eq('manual_id', id);
          
        if (amendmentError) throw amendmentError;
        
        // Fetch temp revisions
        const { data: tempRevData, error: tempRevError } = await supabase
          .from('temporary_revisions')
          .select(`
            id,
            revision_number,
            section_id,
            description,
            date_issued,
            effective_date,
            expiry_date,
            issued_by
          `)
          .eq('manual_id', id);
          
        if (tempRevError) throw tempRevError;
        
        // Fetch final revisions
        const { data: finalRevData, error: finalRevError } = await supabase
          .from('final_revisions')
          .select('*')
          .eq('manual_id', id)
          .order('revision_date', { ascending: false });
          
        if (finalRevError) throw finalRevError;
        
        // Transform section data
        const formattedSections = sectionData?.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          level: section.level,
          order: section.order,
          parent_id: section.parent_id
        })) || [];
        
        // Transform amendments data
        const formattedAmendments = amendmentData?.map(amend => {
          // Find the section title from section_id
          const sectionTitle = sectionData?.find(s => s.id === amend.section_id)?.title || 'Unknown Section';
          
          return {
            id: amend.id,
            section: sectionTitle,
            title: amend.title,
            status: amend.status,
            createdBy: amend.created_by || 'Unknown',
            createdAt: amend.created_at
          };
        }) || [];
        
        // Transform temp revisions data
        const formattedTempRevs = tempRevData?.map(rev => ({
          id: rev.id,
          revisionNumber: rev.revision_number,
          affectedSection: rev.section_id,
          description: rev.description,
          dateIssued: rev.date_issued,
          effectiveDate: rev.effective_date,
          expiryDate: rev.expiry_date,
          issuedBy: rev.issued_by
        })) || [];
        
        // Transform final revisions data
        const formattedFinalRevs = finalRevData?.map(rev => ({
          id: rev.id,
          manual_id: rev.manual_id,
          revision_number: rev.revision_number,
          description: rev.description,
          date_issued: rev.date_issued,
          effective_date: rev.effective_date,
          created_by: rev.created_by,
          created_at: rev.created_at
        })) || [];
        
        setManual({
          id: manualData.id,
          title: manualData.title,
          description: manualData.description,
          created_by: manualData.created_by,
          created_at: manualData.created_at,
          updated_at: manualData.updated_at,
          sections: formattedSections
        });
        
        setAmendments(formattedAmendments);
        setTempRevisions(formattedTempRevs);
        setFinalRevisions(formattedFinalRevs);
        
      } catch (err: any) {
        console.error('Error fetching manual data:', err);
        setError(err.message || 'Failed to load manual data');
        toast.error('Failed to load manual data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchManualData();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1 max-w-2xl">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-4 bg-gray-200 rounded col-span-2"></div>
                  <div className="h-4 bg-gray-200 rounded col-span-1"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !manual) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {error || 'Manual not found'}
          </h2>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-6 space-y-6 animate-fade-in">
        <ManualViewer manualId={id!} />
      </div>
    </Layout>
  );
};

export default Manual;
