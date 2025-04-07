import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManualSection } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ManualHeader, HeaderData } from './ManualHeader';
import { ManualFooter } from './ManualFooter';
import { Download } from 'lucide-react';
import { getCompanyById } from '@/services/companyService';
import { Company } from '@/services/manualService';
import ReactDOMServer from 'react-dom/server';
import { SectionContentRenderer } from './SectionContentRenderer';
// @ts-ignore
import htmlToPdfmake from 'html-to-pdfmake';

interface ManualPrinterProps {
  manualId: string;
  sectionNumber?: string;
}

interface ManualData {
  title: string;
  company_id: string | null;
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

interface FinalRevision {
  id: string;
  issue_no: string;
  revision_no: string;
  revision_date: string;
  affected_pages: string;
  reason: string;
  date_inserted: string;
  inserted_by: string;
}

interface ListItem {
  type: 'numeric' | 'alphabetic' | 'roman' | 'star';
  number: string;
  content: string;
  subItems?: ListItem[];
}

interface ListSection {
  type: 'numeric' | 'alphabetic' | 'roman' | 'star';
  items: ListItem[];
}

function detectListType(items: string[]): ListSection | null {
  if (items.length < 2) return null;

  // Check for star-based lists
  const isStarList = items.every(item => /^\*\s/.test(item));
  if (isStarList) {
    // First list uses alphabetic, second list uses roman numerals
    const useAlphabetic = !items.some(item => item.toLowerCase().includes('Auric Air emphasizes'));
    
    return {
      type: 'star',
      items: items.map((item, index) => ({
        type: useAlphabetic ? 'alphabetic' : 'roman',
        number: useAlphabetic 
          ? String.fromCharCode(97 + index) // a, b, c...
          : ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][index], // i, ii, iii...
        content: item.replace(/^\*\s*/, '')
      }))
    };
  }

  // Check for numbered lists with starred sub-items
  const isNumberedList = items.some(item => /^\d+\./.test(item));
  if (isNumberedList) {
    const processedItems: ListItem[] = [];
    let currentItem: ListItem | null = null;
    let subItems: string[] = [];

    for (const item of items) {
      if (/^\d+\./.test(item)) {
        // If we have a previous item with sub-items, add it
        if (currentItem && subItems.length > 0) {
          const subList = detectListType(subItems);
          if (subList) {
            currentItem.subItems = subList.items;
          }
          processedItems.push(currentItem);
          subItems = [];
        }

        // Start new numbered item
        const match = item.match(/^(\d+)\.\s*(.*)/);
        if (match) {
          currentItem = {
            type: 'numeric',
            number: match[1],
            content: match[2]
          };
        }
      } else if (/^\*\s/.test(item) && currentItem) {
        // Add to sub-items
        subItems.push(item);
      } else {
        // If we have a previous item with sub-items, add it
        if (currentItem && subItems.length > 0) {
          const subList = detectListType(subItems);
          if (subList) {
            currentItem.subItems = subList.items;
          }
          processedItems.push(currentItem);
          subItems = [];
        }

        // Add as regular item
        processedItems.push({
          type: 'numeric',
          number: (processedItems.length + 1).toString(),
          content: item
        });
      }
    }

    // Handle last item with sub-items
    if (currentItem && subItems.length > 0) {
      const subList = detectListType(subItems);
      if (subList) {
        currentItem.subItems = subList.items;
      }
      processedItems.push(currentItem);
    }

    if (processedItems.length > 0) {
      return {
        type: 'numeric',
        items: processedItems
      };
    }
  }

  // Check if all items start with the same number (definition list pattern)
  const allStartWithOne = items.every(item => /^1\./.test(item));
  if (allStartWithOne) {
    return {
      type: 'numeric',
      items: items.map((item, index) => ({
        type: 'numeric',
        number: (index + 1).toString(),
        content: item.replace(/^1\.\s*/, '')
      }))
    };
  }

  // Check for regular numeric lists (1, 2, 3...)
  const numericPattern = /^(\d+)\./;
  if (items.every(item => numericPattern.test(item))) {
    return {
      type: 'numeric',
      items: items.map(item => {
        const match = item.match(numericPattern);
        return {
          type: 'numeric',
          number: match![1],
          content: item.replace(numericPattern, '').trim()
        };
      })
    };
  }

  // Check for alphabetic lists (a, b, c...)
  const alphaPattern = /^([a-z])\./i;
  if (items.every(item => alphaPattern.test(item))) {
    return {
      type: 'alphabetic',
      items: items.map(item => {
        const match = item.match(alphaPattern);
        return {
          type: 'alphabetic',
          number: match![1],
          content: item.replace(alphaPattern, '').trim()
        };
      })
    };
  }

  // Check for roman numeral lists (i, ii, iii...)
  const romanPattern = /^([ivxlcdm]+)\./i;
  if (items.every(item => romanPattern.test(item))) {
    return {
      type: 'roman',
      items: items.map(item => {
        const match = item.match(romanPattern);
        return {
          type: 'roman',
          number: match![1],
          content: item.replace(romanPattern, '').trim()
        };
      })
    };
  }

  return null;
}

function parseContent(content: string): (string | ListItem)[] {
  const lines = content.split('\n');
  const result: (string | ListItem)[] = [];
  let currentListItems: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (currentListItems.length > 0) {
        const listSection = detectListType(currentListItems);
        if (listSection) {
          result.push(...listSection.items);
        } else {
          result.push(...currentListItems);
        }
        currentListItems = [];
      }
      continue;
    }

    // Check if this line could be part of a list
    const isListItem = /^(\d+|[a-z]|[ivxlcdm]+|[\*])\.?\s+.+$/i.test(line);
    
    if (isListItem) {
      currentListItems.push(line);
    } else {
      // If we have accumulated list items and encounter a non-list line,
      // process the current list
      if (currentListItems.length > 0) {
        const listSection = detectListType(currentListItems);
        if (listSection) {
          result.push(...listSection.items);
        } else {
          result.push(...currentListItems);
        }
        currentListItems = [];
      }
      result.push(line);
    }
  }

  // Handle any remaining list items
  if (currentListItems.length > 0) {
    const listSection = detectListType(currentListItems);
    if (listSection) {
      result.push(...listSection.items);
    } else {
      result.push(...currentListItems);
    }
  }

  return result;
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

export function ManualPrinter({ manualId, sectionNumber = '' }: ManualPrinterProps) {
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualTitle, setManualTitle] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [temporaryRevisions, setTemporaryRevisions] = useState<TemporaryRevision[]>([]);
  const [finalRevisions, setFinalRevisions] = useState<FinalRevision[]>([]);
  const [headerData, setHeaderData] = useState<HeaderData>({
    companyName: '',
    documentTitle: '',
    docNumber: '',
    docName: '',
    issueNo: '',
    revisionNo: '',
    date: '',
    sectionNumber: sectionNumber,
    pageNumber: 1,
    logoUrl: null
  });
  const [sectionNumbers, setSectionNumbers] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, [manualId, sectionNumber]);

  useEffect(() => {
    if (!sections.length) return;

    const newSectionNumbers: { [key: string]: string } = {};
    let currentNumbers = [0, 0, 0, 0, 0]; // Track numbers for each level (0-based array)
    let lastLevel = 1;

    // Process sections in order to generate numbers
    sections.forEach(section => {
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
  }, [sections]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sectionsData, manualData, tempRevisions, finalRevisionsData] = await Promise.all([
        fetchSections(),
        fetchManualData(),
        fetchTemporaryRevisions(),
        fetchFinalRevisions()
      ]);

      setSections(sectionsData.map(section => ({
        ...section,
        manualId: section.manual_id,
        amendment: section.amendment?.[0] ? {
          content: section.amendment[0].content,
          originalContent: section.amendment[0].original_content,
          status: section.amendment[0].status
        } : undefined
      })));
      setManualTitle(manualData?.title || '');
      setTemporaryRevisions(tempRevisions);
      setFinalRevisions(finalRevisionsData);

      if (manualData?.company_id) {
        const companyData = await getCompanyById(manualData.company_id);
        if (companyData) {
          setCompany(companyData);
          setHeaderData(prev => ({
            ...prev,
            companyName: companyData.name,
            logoUrl: null
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load manual data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('manual_sections')
      .select(`
        *,
        amendment:amendments (
          id,
          content,
          original_content,
          status
        )
      `)
      .eq('manual_id', manualId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const fetchTemporaryRevisions = async () => {
    const { data, error } = await supabase
      .from('temporary_revisions')
      .select('id, revision_number, manual_id, section_id, description, date_issued, effective_date, expiry_date, issued_by, created_at, updated_at')
      .eq('manual_id', manualId);

    if (error) throw error;
    return data || [];
  };

  const fetchFinalRevisions = async () => {
    const { data, error } = await supabase
      .from('final_revisions')
      .select('*')
      .eq('manual_id', manualId)
      .order('revision_no', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchManualData = async (): Promise<ManualData> => {
    try {
      const { data, error } = await supabase
        .from('manuals')
        .select('title, company_id')
        .eq('id', manualId)
        .single();

      if (error) {
        console.error('Error fetching manual data:', error);
        return { title: '', company_id: null };
      }
      
      if (!data) {
        return { title: '', company_id: null };
      }
      
      return {
        title: data.title || '',
        company_id: data.company_id || null
      };
    } catch (error) {
      console.error('Error fetching manual data:', error);
      return { title: '', company_id: null };
    }
  };

  const handleHeaderChange = (data: HeaderData) => {
    setHeaderData(data);
  };

  const renderSectionContent = (section: ManualSection, sectionNumber: string) => {
    const content = section.amendment ? section.amendment.content : section.content;
    const originalContent = section.amendment?.originalContent || (section.amendment as any)?.original_content;
    const isAmended = !!section.amendment;

    const parsedContent = parseContent(content);
    const contentArray = [];

    // If this is amended content, process it differently
    if (isAmended && originalContent) {
      const originalParsed = parseContent(originalContent);
      const paragraphChanges = new Map<number, boolean>();
      
      // Compare original and new content
      for (let i = 0; i < Math.max(originalParsed.length, parsedContent.length); i++) {
        if (i >= originalParsed.length || i >= parsedContent.length || 
            JSON.stringify(originalParsed[i]) !== JSON.stringify(parsedContent[i])) {
          paragraphChanges.set(i, true);
        }
      }

      // Process each paragraph
      parsedContent.forEach((item, index) => {
        if (paragraphChanges.get(index)) {
          if (typeof item === 'string') {
            contentArray.push({
              columns: [
                {
                  canvas: [
                    {
                      type: 'line',
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 30,
                      lineWidth: 1,
                      lineColor: 'black'
                    }
                  ],
                  width: 2
                },
                {
                  text: item,
                  style: 'amendedContent',
                  margin: [5, 2, 0, 2]
                }
              ]
            });
          } else {
            // Handle list items
            contentArray.push({
              columns: [
                {
                  canvas: [
                    {
                      type: 'line',
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 30,
                      lineWidth: 1,
                      lineColor: 'black'
                    }
                  ],
                  width: 2
                },
                {
                  stack: [
                    {
                      text: `${item.number}. ${item.content}`,
                      style: 'amendedContent',
                      margin: [5, 2, 0, 2]
                    }
                  ]
                }
              ]
            });
          }
        } else {
          if (typeof item === 'string') {
            contentArray.push({
              text: item,
              style: 'normalContent',
              margin: [0, 2, 0, 2]
            });
          } else {
            contentArray.push({
              text: `${item.number}. ${item.content}`,
              style: 'normalContent',
              margin: [0, 2, 0, 2]
            });
          }
        }
      });

      return contentArray;
    }

    // Handle non-amended content
    let currentTable: any[] = [];
    let isInTable = false;
    let expectedColumns = 0;

    for (const item of parsedContent) {
      if (typeof item === 'string') {
        const line = item.trim();
        
        // Check if this line is part of a table (contains | or tab separators)
        const isTableRow = line.includes('|') || line.includes('\t');
        
        if (isTableRow) {
          if (!isInTable) {
            isInTable = true;
          }
          
          // Split the row into cells and filter out empty cells
          const cells = line.split(/[\t|]/).map(cell => cell.trim()).filter(Boolean);
          
          // If this is the first row, set the expected number of columns
          if (currentTable.length === 0) {
            expectedColumns = cells.length;
          }
          
          // Ensure the row has the correct number of cells
          const rowCells = cells.slice(0, expectedColumns);
          while (rowCells.length < expectedColumns) {
            rowCells.push('');
          }
          
          // Add the row to the current table
          currentTable.push(rowCells.map(cell => ({
            text: cell,
            style: 'tableCell'
          })));
        } else {
          // If we were in a table and now we're not, add the table to content
          if (isInTable) {
            if (currentTable.length > 0) {
              contentArray.push({
                table: {
                  headerRows: 1,
                  widths: Array(expectedColumns).fill('*'),
                  body: currentTable
                },
                layout: {
                  hLineWidth: (i: number) => 0.5,
                  vLineWidth: (i: number) => 0.5,
                  hLineColor: (i: number) => '#000000',
                  vLineColor: (i: number) => '#000000',
                  paddingLeft: (i: number) => 4,
                  paddingRight: (i: number) => 4,
                  paddingTop: (i: number) => 2,
                  paddingBottom: (i: number) => 2
                },
                margin: [0, 5, 0, 5]
              });
            }
            currentTable = [];
            isInTable = false;
            expectedColumns = 0;
          }
          
          // Add non-table content
          if (line) {
            contentArray.push({
              text: line,
              style: 'sectionContent',
              margin: [0, 2, 0, 2]
            });
          }
        }
      } else {
        // Handle list items in non-amended content
        const listItem = item as ListItem;
        if (listItem.subItems) {
          // Render main item
          contentArray.push({
            text: `${listItem.number}. ${listItem.content}`,
            style: 'normalContent',
            margin: [0, 2, 0, 2]
          });
          
          // Render sub-items with indentation
          listItem.subItems.forEach(subItem => {
            contentArray.push({
              text: `${subItem.number}. ${subItem.content}`,
              style: 'normalContent',
              margin: [20, 2, 0, 2]
            });
          });
        } else {
          contentArray.push({
            text: `${listItem.number}. ${listItem.content}`,
            style: 'normalContent',
            margin: [0, 2, 0, 2]
          });
        }
      }
    }

    // Handle any remaining table
    if (isInTable && currentTable.length > 0) {
      contentArray.push({
        table: {
          headerRows: 1,
          widths: Array(expectedColumns).fill('*'),
          body: currentTable
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#000000',
          vLineColor: (i: number) => '#000000',
          paddingLeft: (i: number) => 4,
          paddingRight: (i: number) => 4,
          paddingTop: (i: number) => 2,
          paddingBottom: (i: number) => 2
        },
        margin: [0, 5, 0, 5]
      });
    }

    return contentArray;
  };

  const generatePDF = async () => {
    const pdfMake = await import('pdfmake/build/pdfmake');
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    (pdfMake.default as any).vfs = (pdfFonts as any).default.vfs;
    
    const contentArray = [];
    
    // Create a map of sections with unapproved temporary revisions
    const sectionsWithRevisions = new Set(
      temporaryRevisions
        .filter(rev => {
          const section = sections.find(s => s.id === rev.section_id);
          return section && (!section.amendment || section.amendment.status !== 'approved');
        })
        .map(rev => rev.section_id)
    );

    sections.forEach(section => {
      const sectionNumber = sectionNumbers[section.id] || '';
      
      // Add section title with proper formatting based on level
      contentArray.push({
        text: section.level === 1 
          ? `${sectionNumber} ${section.title.toUpperCase()}`
          : `${sectionNumber} ${section.title}`,
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
        background: sectionsWithRevisions.has(section.id) ? '#FFFF00' : undefined
      });

      if (section.title === "Record of Temporary Revision" || section.title === "Record of Temporary Revisions") {
        // Add description text
        contentArray.push({
          text: 'The following temporary revisions have been incorporated in this manual:',
          margin: [0, 0, 0, 10]
        });

        // Add temporary revisions table
        contentArray.push({
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Rev #', style: 'tableHeader' },
                { text: 'Section', style: 'tableHeader' },
                { text: 'Description', style: 'tableHeader' },
                { text: 'Issued', style: 'tableHeader' },
                { text: 'Effective', style: 'tableHeader' },
                { text: 'Expiry', style: 'tableHeader' },
                { text: 'By', style: 'tableHeader' }
              ],
              ...temporaryRevisions.map(revision => {
                const sectionTitle = sections.find(s => s.id === revision.section_id)?.title || 'Unknown Section';
                return [
                  { text: revision.revision_number || '', style: 'tableCell' },
                  { text: sectionTitle, style: 'tableCell' },
                  { text: revision.description || '', style: 'tableCell' },
                  { text: new Date(revision.date_issued).toLocaleDateString(), style: 'tableCell' },
                  { text: new Date(revision.effective_date).toLocaleDateString(), style: 'tableCell' },
                  { text: new Date(revision.expiry_date).toLocaleDateString(), style: 'tableCell' },
                  { text: revision.issued_by || '', style: 'tableCell' }
                ];
              })
            ]
          },
          layout: {
            hLineWidth: (i: number) => 0.5,
            vLineWidth: (i: number) => 0.5,
            hLineColor: (i: number) => '#000000',
            vLineColor: (i: number) => '#000000',
            paddingLeft: (i: number) => 4,
            paddingRight: (i: number) => 4,
            paddingTop: (i: number) => 2,
            paddingBottom: (i: number) => 2
          },
          margin: [0, 0, 0, 20]
        });
      } else if (section.title === "Record of Revision" || section.title === "Record of Revisions") {
        // Add description text
        contentArray.push({
          text: [
            'Retain this record in front of this manual. On receipt of revisions, insert the revised pages in the manual and enter the revision number, date, insertion date and name of the person incorporating the revision in the appropriate block.\n\n',
            { text: 'Note:', bold: true },
            ' Refer to OM-A Chapter 1.3 Control and Amendments of Manual'
          ],
          margin: [0, 0, 0, 10]
        });

        // Add final revisions table
        contentArray.push({
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', '*', '*', 'auto', 'auto'],
            body: [
              [
                { text: 'Issue No.', style: 'tableHeader' },
                { text: 'Revision No.', style: 'tableHeader' },
                { text: 'Revision Date', style: 'tableHeader' },
                { text: 'Affected Pages', style: 'tableHeader' },
                { text: 'Reason', style: 'tableHeader' },
                { text: 'Date Inserted', style: 'tableHeader' },
                { text: 'Inserted By', style: 'tableHeader' }
              ],
              ...finalRevisions.map(revision => [
                { text: revision.issue_no || '', style: 'tableCell' },
                { text: revision.revision_no || '', style: 'tableCell' },
                { text: new Date(revision.revision_date).toLocaleDateString(), style: 'tableCell' },
                { text: revision.affected_pages || '', style: 'tableCell' },
                { text: revision.reason || '', style: 'tableCell' },
                { text: new Date(revision.date_inserted).toLocaleDateString(), style: 'tableCell' },
                { text: revision.inserted_by || '', style: 'tableCell' }
              ])
            ]
          },
          layout: {
            hLineWidth: (i: number) => 0.5,
            vLineWidth: (i: number) => 0.5,
            hLineColor: (i: number) => '#000000',
            vLineColor: (i: number) => '#000000',
            paddingLeft: (i: number) => 4,
            paddingRight: (i: number) => 4,
            paddingTop: (i: number) => 2,
            paddingBottom: (i: number) => 2
          },
          margin: [0, 0, 0, 20]
        });
      } else {
        // Use the new content renderer for regular and amended content
        const sectionContent = renderSectionContent(section, sectionNumber);
        if (sectionsWithRevisions.has(section.id)) {
          // Add yellow background to all content items in this section
          sectionContent.forEach(item => {
            if (typeof item === 'object') {
              item.background = '#FFFF00';
            }
          });
        }
        contentArray.push(...sectionContent);
      }
    });
    
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [70, 70, 70, 70],
      
      header: (currentPage: number) => ({
        table: {
          widths: ['auto', '*'],
          body: [
            [
              { text: 'Doc. No:', style: 'tableHeader' },
              { text: headerData.docNumber, style: 'tableCell' }
            ],
            [
              { text: 'Doc. Name:', style: 'tableHeader' },
              { text: headerData.docName, style: 'tableCell' }
            ],
            [
              { text: 'Issue No:', style: 'tableHeader' },
              { text: headerData.issueNo, style: 'tableCell' }
            ],
            [
              { text: 'Rev. No:', style: 'tableHeader' },
              { text: headerData.revisionNo, style: 'tableCell' }
            ],
            [
              { text: 'Date:', style: 'tableHeader' },
              { text: headerData.date, style: 'tableCell' }
            ],
            [
              { text: 'Page:', style: 'tableHeader' },
              { text: currentPage.toString(), style: 'tableCell' }
            ]
          ]
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#000000',
          vLineColor: (i: number) => '#000000',
          paddingLeft: (i: number) => 4,
          paddingRight: (i: number) => 4,
          paddingTop: (i: number) => 2,
          paddingBottom: (i: number) => 2
        },
        margin: [350, 10, 0, 0],
        width: 'auto'
      }),

      footer: (currentPage: number, pageCount: number) => ({
        text: 'NOT CONTROLLED ONCE PRINTED',
        alignment: 'center',
        fontSize: 8,
        margin: [0, 10, 0, 0]
      }),

      content: contentArray,

      styles: {
        title: {
          fontSize: 11,
          bold: true,
          margin: [0, 0, 0, 20]
        },
        sectionHeader: {
          fontSize: 11,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        sectionContent: {
          fontSize: 11,
          lineHeight: 1.3
        },
        amendedContent: {
          fontSize: 11,
          lineHeight: 1.3
        },
        normalContent: {
          fontSize: 11,
          lineHeight: 1.3
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          fillColor: '#f3f4f6'
        },
        tableCell: {
          fontSize: 10
        },
        heading1: {
          font: 'Arial',
          fontSize: 16,
          bold: true,
          color: 'black',
          margin: [0, 10, 0, 5]
        },
        heading2: {
          font: 'Arial',
          fontSize: 14,
          bold: true,
          color: 'black',
          margin: [0, 8, 0, 4]
        },
        heading3: {
          font: 'Arial',
          fontSize: 13,
          bold: true,
          color: 'black',
          margin: [0, 6, 0, 3]
        },
        heading4: {
          font: 'Arial',
          fontSize: 12,
          bold: true,
          color: 'black',
          margin: [0, 4, 0, 2]
        },
        listItem: {
          font: 'Arial',
          fontSize: 11,
          color: 'black',
          margin: [0, 2, 0, 2]
        },
        listNumber: {
          font: 'Arial',
          fontSize: 11,
          color: 'black',
          margin: [0, 2, 5, 2]
        }
      },

      defaultStyle: {
        font: 'Roboto'
      }
    };

    (pdfMake.default as any).createPdf(docDefinition).download(`${headerData.documentTitle}.pdf`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manual Printer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-6">
            <ManualHeader 
              manualId={manualId} 
              documentTitle={manualTitle} 
              onHeaderChange={handleHeaderChange}
              isPrintMode={true}
              sectionNumber={sectionNumber}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={generatePDF}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <ManualFooter />
    </div>
  );
} 