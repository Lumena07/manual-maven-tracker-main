import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AmendmentManager } from '../amendment/AmendmentManager';
import { TemporaryRevisionManager } from '@/components/temporary-revision/TemporaryRevisionManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { proposeAmendment } from '@/services/manualService';
import { SectionContentRenderer } from './SectionContentRenderer';
import { ManualPrinter } from './ManualPrinter';

interface ManualViewerProps {
  manualId: string;
}

interface Section {
  id: string;
  manual_id: string;
  title: string;
  content: string;
  order: number;
  level: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  hasTemporaryRevision?: boolean;
  children?: Section[];
  amendment?: {
    id: string;
    content: string;
    originalContent: string;
    status: string;
  };
  temporaryRevision?: {
    id: string;
    revision_number: string;
    description: string;
    date_issued: string;
    effective_date: string;
    expiry_date: string;
    issued_by: string;
  };
}

interface DBSection {
    id: string;
  manual_id: string;
    title: string;
    content: string;
  order: number;
    level: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Manual {
  id: string;
  title: string;
  description: string | null;
  updated_at: string;
  sections: Section[];
}

interface TemporaryRevision {
  id: string;
  section_id: string;
  revision_number: string;
  description: string;
  date_issued: string;
  effective_date: string;
  expiry_date: string;
  issued_by: string;
}

function processContent(content: string, sectionNumber: string): string {
  if (!content) return '';
  
  const lines = content.split('\n');
  const processedLines = lines.map(line => {
    // If this is a heading line (starts with #)
    if (line.match(/^#+\s/)) {
      return `${line} [${sectionNumber}]`;
    }
    return line;
  });
  
  return processedLines.join('\n');
}

export function ManualViewer({ manualId }: ManualViewerProps) {
  const { id } = useParams<{ id: string }>();
  const [manual, setManual] = useState<Manual | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showProposeDialog, setShowProposeDialog] = useState(false);
  const [amendmentTitle, setAmendmentTitle] = useState('');
  const [amendmentDescription, setAmendmentDescription] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [temporaryRevisions, setTemporaryRevisions] = useState<TemporaryRevision[]>([]);
  const [finalRevisions, setFinalRevisions] = useState<any[]>([]);
  const [sectionNumbers, setSectionNumbers] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchManual();
  }, [id]);

  useEffect(() => {
    if (!manual) return;

    const newSectionNumbers: { [key: string]: string } = {};
    let currentNumbers = [0, 0, 0, 0, 0]; // Track numbers for each level (0-based array)
    let lastLevel = 1;

    // Process sections in order to generate numbers
    manual.sections.forEach(section => {
      // Reset lower level numbers when moving to a higher level
      if (section.level <= lastLevel) {
        for (let i = section.level; i < currentNumbers.length; i++) {
          currentNumbers[i] = 0;
        }
      }

      // For level 1, increment the first number
      if (section.level === 1) {
        currentNumbers[0]++;
        newSectionNumbers[section.id] = `Section ${currentNumbers[0] - 1}`; // Subtract 1 to start at Section 0
      } else {
        // For other levels, increment their respective counter
        currentNumbers[section.level - 1]++;
        
        // Build the section number using all relevant levels
        const numberParts = [];
        for (let i = 0; i < section.level; i++) {
          if (i === 0) {
            // Always include the parent section number (currentNumbers[0] - 1 for zero-based)
            numberParts.push(currentNumbers[0] - 1);
          } else {
            // For other levels, use their current number
            numberParts.push(currentNumbers[i]);
          }
        }
        newSectionNumbers[section.id] = numberParts.join('.');
      }

      lastLevel = section.level;
    });

    setSectionNumbers(newSectionNumbers);
  }, [manual, expandedSections]);

  const toggleSection = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent section selection when toggling
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        // When collapsing, also collapse all children recursively
        const sectionToCollapse = findSectionById(manual?.sections || [], sectionId);
        if (sectionToCollapse?.children) {
          const getAllChildIds = (section: Section): string[] => {
            let ids = [section.id];
            if (section.children) {
              section.children.forEach(child => {
                ids = [...ids, ...getAllChildIds(child)];
              });
            }
            return ids;
          };
          getAllChildIds(sectionToCollapse).forEach(id => newSet.delete(id));
        }
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Helper function to find a section by ID in the hierarchy
  const findSectionById = (sections: Section[], id: string): Section | null => {
    for (const section of sections) {
      if (section.id === id) return section;
      if (section.children) {
        const found = findSectionById(section.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const renderSection = (section: Section, level: number = 0) => {
    const isExpanded = expandedSections.has(section.id);
    const hasChildren = section.children && section.children.length > 0;
    const sectionNumber = sectionNumbers[section.id] || '';
    const shouldShow = level === 0 || (level > 0 && expandedSections.has(section.parent_id || ''));

    if (!shouldShow) return null;

    return (
      <div key={section.id} className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg cursor-pointer",
            "hover:bg-gray-100",
            section.hasTemporaryRevision && "bg-yellow-50 border-l-4 border-l-yellow-500",
            selectedSection?.id === section.id && "bg-blue-50"
          )}
          onClick={() => setSelectedSection(section)}
        >
          <div style={{ width: '24px', minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
            {hasChildren && (
              <button
                onClick={(e) => toggleSection(section.id, e)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded font-bold text-black"
              >
                {isExpanded ? '▼' : '►'}
              </button>
            )}
          </div>
          <div 
            className="flex-1 font-medium" 
            style={{ paddingLeft: level * 20 }}
          >
            <span>
              <span className="mr-2">{sectionNumber}</span>
              {section.level === 1 ? section.title.toUpperCase() : section.title}
            </span>
            {section.hasTemporaryRevision && (
              <span className="ml-2 text-xs text-yellow-600">(Has Temporary Revision)</span>
            )}
          </div>
        </div>
        {hasChildren && (
          <div className="ml-4">
            {section.children.map(child => renderSection(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleProposeAmendment = async () => {
    if (!selectedSection) {
      toast.error('Please select a section first');
      return;
    }

    if (!amendmentReason.trim()) {
      toast.error('Please provide a reason for the amendment');
      return;
    }

    try {
      // Get the current user's ID from the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session?.user?.id) {
        toast.error('You must be logged in to propose amendments');
        return;
      }

      const result = await proposeAmendment(
        id!,
        selectedSection.id,
        amendmentDescription,
        session.user.id,
        amendmentTitle,
        amendmentReason
      );

      if (result.success) {
        toast.success('Amendment proposed successfully');
        setShowProposeDialog(false);
        setAmendmentTitle('');
        setAmendmentDescription('');
        setAmendmentReason('');
        fetchManual();
      } else {
        toast.error(result.error?.message || 'Failed to propose amendment');
      }
    } catch (error) {
      console.error('Error proposing amendment:', error);
      toast.error('Failed to propose amendment');
    }
  };

  const handleOpenProposeDialog = () => {
    if (!selectedSection) {
      toast.error('Please select a section first');
      return;
    }
    setAmendmentTitle(`Amendment to ${selectedSection.title}`);
    setAmendmentDescription(selectedSection.content);
    setShowProposeDialog(true);
  };

  // Render the Record of Revision section
  const renderRecordOfRevision = () => {
    return (
      <div className="space-y-4">
        <div className="whitespace-pre-wrap">
          <p>
            Retain this record in front of this manual. On receipt of revisions, insert the revised pages in the manual and enter the revision number, date, insertion date and name of the person incorporating the revision in the appropriate block.
          </p>
          <p className="mt-2">
            <strong>Note:</strong> Refer to OM-A Chapter 1.3 Control and Amendments of Manual
          </p>
        </div>
        
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Issue No.</th>
                <th className="border border-gray-300 p-2 text-left">Revision No.</th>
                <th className="border border-gray-300 p-2 text-left">Revision Date</th>
                <th className="border border-gray-300 p-2 text-left">Affected Pages</th>
                <th className="border border-gray-300 p-2 text-left">Reason</th>
                <th className="border border-gray-300 p-2 text-left">Date Inserted</th>
                <th className="border border-gray-300 p-2 text-left">Inserted By</th>
              </tr>
            </thead>
            <tbody>
              {finalRevisions.length > 0 ? (
                finalRevisions.map((revision) => (
                  <tr key={revision.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2">{revision.issue_no}</td>
                    <td className="border border-gray-300 p-2">{revision.revision_no}</td>
                    <td className="border border-gray-300 p-2">{new Date(revision.revision_date).toLocaleDateString()}</td>
                    <td className="border border-gray-300 p-2">{revision.affected_pages}</td>
                    <td className="border border-gray-300 p-2">{revision.reason}</td>
                    <td className="border border-gray-300 p-2">{new Date(revision.date_inserted).toLocaleDateString()}</td>
                    <td className="border border-gray-300 p-2">{revision.inserted_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="border border-gray-300 p-2 text-center text-gray-500">
                    No revisions recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const fetchManual = async () => {
    try {
      setLoading(true);
      const { data: manualData, error: manualError } = await supabase
        .from('manuals')
        .select('*')
        .eq('id', id)
        .single();

      if (manualError) throw manualError;

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('manual_sections')
        .select('id, manual_id, title, content, order, level, parent_id, created_at, updated_at')
        .eq('manual_id', id)
        .order('order', { ascending: true });

      if (sectionsError) throw sectionsError;
      if (!sectionsData) throw new Error('No sections found');

      const typedSections = sectionsData as unknown as DBSection[];

      // Fetch amendments for the manual instead of by section IDs
      const { data: amendmentsData, error: amendmentsError } = await supabase
        .from('amendments')
        .select('id, section_id, content, original_content, status')
        .eq('manual_id', id);

      if (amendmentsError) throw amendmentsError;

      // Fetch temporary revisions for the manual instead of by section IDs
      const { data: tempRevisions, error: revisionsError } = await supabase
        .from('temporary_revisions')
        .select('id, section_id, revision_number, description, date_issued, effective_date, expiry_date, issued_by')
        .eq('manual_id', id);

      if (revisionsError) throw revisionsError;
      
      // Store temporary revisions in state
      setTemporaryRevisions(tempRevisions || []);

      // Fetch final revisions for this manual
      const { data: finalRevisionsData, error: finalRevisionsError } = await supabase
        .from('final_revisions')
        .select('*')
        .eq('manual_id', id)
        .order('revision_no', { ascending: false });

      if (finalRevisionsError) throw finalRevisionsError;
      
      // Store final revisions in state
      setFinalRevisions(finalRevisionsData || []);

      // Build hierarchical structure
      const sectionsMap = new Map<string, Section>();
      const rootSections: Section[] = [];

      typedSections.forEach(section => {
        const amendment = amendmentsData?.find(a => a.section_id === section.id);
        const temporaryRevision = tempRevisions?.find(rev => rev.section_id === section.id);
        
        // Only show temporary revision indicator if the amendment is not approved
        const hasTemporaryRevision = !!temporaryRevision && 
          (!amendment || amendment.status !== 'approved');
        
        const sectionWithRevisions: Section = {
          ...section,
          hasTemporaryRevision,
          amendment: amendment ? {
            id: amendment.id,
            content: amendment.content,
            originalContent: amendment.original_content,
            status: amendment.status
          } : undefined,
          temporaryRevision: temporaryRevision ? {
            id: temporaryRevision.id,
            revision_number: temporaryRevision.revision_number,
            description: temporaryRevision.description,
            date_issued: temporaryRevision.date_issued,
            effective_date: temporaryRevision.effective_date,
            expiry_date: temporaryRevision.expiry_date,
            issued_by: temporaryRevision.issued_by
          } : undefined,
          children: []
        };
        sectionsMap.set(section.id, sectionWithRevisions);

        if (!section.parent_id) {
          rootSections.push(sectionWithRevisions);
        } else {
          const parent = sectionsMap.get(section.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(sectionWithRevisions);
          }
        }
      });

      setManual({
        ...manualData,
        sections: rootSections
      });
    } catch (error) {
      console.error('Error fetching manual:', error);
      toast.error('Failed to load manual');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">Manual not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{manual.title}</CardTitle>
              {manual.description && (
                <p className="text-gray-600 mt-2">{manual.description}</p>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date(manual.updated_at).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
          <TabsTrigger value="amendments" className="flex-1">Amendments</TabsTrigger>
          <TabsTrigger value="temporary-revisions" className="flex-1">Temporary Revisions</TabsTrigger>
          <TabsTrigger value="print" className="flex-1">Print</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Table of Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {manual?.sections.map(section => renderSection(section))}
                </ScrollArea>
              </CardContent>
            </Card>
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSection ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">
                        {selectedSection.level === 1 ? (
                          <span>
                            <span className="mr-2">{sectionNumbers[selectedSection.id]}</span>
                            {selectedSection.title.toUpperCase()}
                          </span>
                        ) : (
                          <>
                            <span className="mr-2">{sectionNumbers[selectedSection.id]}</span>
                            {selectedSection.title}
                          </>
                        )}
                      </h3>
                      <div className="flex gap-2">
                        <Dialog open={showProposeDialog} onOpenChange={setShowProposeDialog}>
                          <DialogTrigger asChild>
                            <Button onClick={handleOpenProposeDialog}>
                              <Plus className="mr-2 h-4 w-4" />
                              Propose Amendment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Propose Amendment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="title">Title</Label>
                                <Input
                                  id="title"
                                  value={amendmentTitle}
                                  onChange={(e) => setAmendmentTitle(e.target.value)}
                                  placeholder="Brief description of the amendment"
                                />
                              </div>
                              <div>
                                <Label htmlFor="content">Proposed Changes</Label>
                                <Textarea
                                  id="content"
                                  value={amendmentDescription}
                                  onChange={(e) => setAmendmentDescription(e.target.value)}
                                  placeholder="Enter the amended content"
                                  className="min-h-[300px]"
                                />
                              </div>
                              <div>
                                <Label htmlFor="reason">Reason for Amendment</Label>
                                <Textarea
                                  id="reason"
                                  value={amendmentReason}
                                  onChange={(e) => setAmendmentReason(e.target.value)}
                                  placeholder="Explain why this amendment is needed"
                                  className="min-h-[100px]"
                                  required
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                <Button variant="outline" onClick={() => setShowProposeDialog(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleProposeAmendment}>
                                  Propose
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {selectedSection.title === "Record of Temporary Revision" || selectedSection.title === "Record of Temporary Revisions" ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-1 text-left">Rev #</th>
                                <th className="border border-gray-300 p-1 text-left">Section</th>
                                <th className="border border-gray-300 p-1 text-left">Description</th>
                                <th className="border border-gray-300 p-1 text-left">Issued</th>
                                <th className="border border-gray-300 p-1 text-left">Effective</th>
                                <th className="border border-gray-300 p-1 text-left">Expiry</th>
                                <th className="border border-gray-300 p-1 text-left">By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {temporaryRevisions?.map((revision) => {
                                // Find the section title for this revision
                                const section = manual?.sections.find(s => s.id === revision.section_id);
                                const sectionTitle = section?.title || 'Unknown Section';
                                
                                return (
                                  <tr key={revision.id} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 p-1">{revision.revision_number}</td>
                                    <td className="border border-gray-300 p-1">{sectionTitle}</td>
                                    <td className="border border-gray-300 p-1">{revision.description}</td>
                                    <td className="border border-gray-300 p-1">{new Date(revision.date_issued).toLocaleDateString()}</td>
                                    <td className="border border-gray-300 p-1">{new Date(revision.effective_date).toLocaleDateString()}</td>
                                    <td className="border border-gray-300 p-1">{new Date(revision.expiry_date).toLocaleDateString()}</td>
                                    <td className="border border-gray-300 p-1">{revision.issued_by}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : selectedSection.title === "Record of Revision" || selectedSection.title === "Record of Revisions" ? (
                        renderRecordOfRevision()
                      ) : selectedSection.amendment ? (
                        <div className="amendment-content">
                          <SectionContentRenderer 
                            content={processContent(
                              selectedSection.amendment.content,
                              sectionNumbers[selectedSection.id] || ''
                            )} 
                            originalContent={selectedSection.amendment.originalContent}
                            isAmended={true}
                          />
                        </div>
                      ) : (
                        <SectionContentRenderer 
                          content={processContent(
                            selectedSection.content,
                            sectionNumbers[selectedSection.id] || ''
                          )} 
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-gray-500">
                    Select a section from the table of contents to view its content
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="amendments">
          <AmendmentManager
            manualId={id!}
            onAmendmentStatusChange={fetchManual}
          />
        </TabsContent>

        <TabsContent value="temporary-revisions">
          <TemporaryRevisionManager manualId={id!} />
        </TabsContent>

        <TabsContent value="print">
          <ManualPrinter manualId={manualId} sectionNumber={selectedSection ? sectionNumbers[selectedSection.id] || '' : ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
