import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Add this line after the imports to set the worker source
// In a real app, you'd want to use a webpack configuration to handle the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Define the shape of our sections
interface Section {
  title: string;
  content: string;
  level: number;
}

interface UploadManualResult {
  success: boolean;
  manualId?: string;
  error?: Error;
}

export interface ManualSection {
  id: string;
  manual_id?: string;
  title: string;
  content: string;
  level: number;
  parent_id: string | null;
  order: number;
}

export interface Manual {
  id: string;
  title: string;
  version: string;
  sections: ManualSection[];
}

export async function uploadManual(
  file: File, 
  userId: string
): Promise<UploadManualResult> {
  try {
    const manualTitle = file.name.split('.')[0]; // Use filename as title
    
    // Create a new manual record
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .insert({
        title: manualTitle,
        description: `Uploaded from ${file.name}`,
        version: '1.0',
        created_by: userId
      })
      .select('id')
      .single();
    
    if (manualError) {
      console.error('Error creating manual:', manualError);
      throw manualError;
    }
    
    // Extract content from the file
    const content = await extractContentFromFile(file);
    
    // Parse the content into sections
    const sections = parseContentIntoSections(content, file.name);
    
    // Insert all sections
    const { error: sectionsError } = await supabase
      .from('manual_sections')
      .insert(sections.map((section, index) => ({
        manual_id: manual.id,
        title: section.title,
        content: section.content,
        order: index + 1,
        level: section.level
      })));
    
    if (sectionsError) {
      console.error('Error creating sections:', sectionsError);
      throw sectionsError;
    }
    
    return { success: true, manualId: manual.id };
  } catch (error) {
    console.error('Error uploading manual:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
}

// Extract text content from the uploaded file
async function extractContentFromFile(file: File): Promise<string> {
  try {
    // Handle different file types
    if (file.name.endsWith('.txt')) {
      return await file.text();
    }
    else if (file.name.endsWith('.docx')) {
      try {
        // Get the file as an array buffer for mammoth.js processing
        const arrayBuffer = await file.arrayBuffer();
        
        // Use mammoth.js convertToHtml with proper options format
        const result = await mammoth.convertToHtml({
          arrayBuffer: arrayBuffer,
          // Since styleMap may not be recognized in the type, we'll use a more basic approach
          // or cast the object to any to bypass the type checker
        } as any);
        
        // Get both the HTML and warnings
        const html = result.value;
        const warnings = result.messages;
        
        // Apply our custom style mapping by post-processing the HTML
        let processedHtml = html;
        
        // Enhanced heading style mapping
        processedHtml = processedHtml.replace(/<p class="(heading|Heading) ?1[^>]*>(.*?)<\/p>/g, '<h1>$2</h1>');
        processedHtml = processedHtml.replace(/<p class="(heading|Heading) ?2[^>]*>(.*?)<\/p>/g, '<h2>$2</h2>');
        processedHtml = processedHtml.replace(/<p class="(heading|Heading) ?3[^>]*>(.*?)<\/p>/g, '<h3>$2</h3>');
        processedHtml = processedHtml.replace(/<p class="(heading|Heading) ?4[^>]*>(.*?)<\/p>/g, '<h4>$2</h4>');
        processedHtml = processedHtml.replace(/<p class="(heading|Heading) ?5[^>]*>(.*?)<\/p>/g, '<h5>$2</h5>');
        processedHtml = processedHtml.replace(/<p class="(heading|Heading) ?6[^>]*>(.*?)<\/p>/g, '<h6>$2</h6>');
        
        // Handle special heading styles
        processedHtml = processedHtml.replace(/<p class="Title[^>]*>(.*?)<\/p>/g, '<h1 class="title">$1</h1>');
        processedHtml = processedHtml.replace(/<p class="Subtitle[^>]*>(.*?)<\/p>/g, '<h2 class="subtitle">$2</h2>');
        
        // Enhanced list handling
        processedHtml = processedHtml.replace(/<p class="List Paragraph[^>]*>(.*?)<\/p>/g, '<li>$1</li>');
        processedHtml = processedHtml.replace(/<p class="List Bullet[^>]*>(.*?)<\/p>/g, '<li class="bullet">$1</li>');
        processedHtml = processedHtml.replace(/<p class="List Number[^>]*>(.*?)<\/p>/g, '<li class="number">$1</li>');
        
        // Handle document metadata
        const metadata = extractDocumentMetadata(html);
        if (metadata) {
          processedHtml = `<div class="document-metadata">${metadata}</div>${processedHtml}`;
        }
        
        // Identify headers and footers based on position and content
        const lines = html.split('\n');
        
        // Headers are typically in the first few lines
        const headerLines = lines.slice(0, Math.min(5, lines.length)).join('');
        if (headerLines.includes('class="Header"') || /Page \d+ of \d+/.test(headerLines)) {
          processedHtml = '<div class="header">' + headerLines + '</div>' + processedHtml;
        }
        
        // Footers are typically in the last few lines
        const footerLines = lines.slice(-5).join('');
        if (footerLines.includes('class="Footer"') || /Page \d+ of \d+/.test(footerLines)) {
          processedHtml = processedHtml + '<div class="footer">' + footerLines + '</div>';
        }
        
        // Log any warnings
        if (warnings.length > 0) {
          console.log("Mammoth warnings:", warnings);
        }
        
        // Convert the HTML to markdown-like format for our section parser
        let markdownContent = convertHtmlToStructuredText(processedHtml);
        
        console.log("Extracted DOCX content with structure:", markdownContent.substring(0, 500) + "...");
        return markdownContent;
      } catch (error) {
        console.error('Error parsing DOCX:', error);
        // Fallback to basic text extraction if mammoth.js fails
        return await file.text();
      }
    }
    else if (file.name.endsWith('.pdf')) {
      try {
        // Convert the file to array buffer for PDF.js
        const arrayBuffer = await file.arrayBuffer();
        
        // Load the PDF document
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        // Extract title page if exists (usually the first page)
        const page1 = await pdf.getPage(1);
        const page1Text = await page1.getTextContent();
        const titlePageText = page1Text.items.map(item => 'str' in item ? item.str : '').join(' ');
        
        // Check if first page seems to be a title page
        const isTitlePage = titlePageText.length < 500 || 
                           titlePageText.toLowerCase().includes('title') || 
                           titlePageText.toLowerCase().includes('cover') ||
                           titlePageText.toLowerCase().includes('manual');
        
        // Start our structured text
        let fullText = '';
        
        // Add title page marker if detected
        if (isTitlePage) {
          fullText += `# Title Page\n\n${titlePageText}\n\n`;
        }
        
        // Extract text from all pages with improved structure detection
        for (let i = 1; i <= pdf.numPages; i++) {
          // Skip separate processing for first page if already handled as title page
          if (i === 1 && isTitlePage) continue;
          
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Get page dimensions to help identify headers/footers
          const viewport = page.getViewport({ scale: 1.0 });
          const pageHeight = viewport.height;
          const pageWidth = viewport.width;
          
          // Separate header, footer, and main content based on positions
          let headerText = '';
          let footerText = '';
          let mainContent = '';
          
          // Check each text item's position
          textContent.items.forEach(item => {
            if ('str' in item && item.str.trim()) {
              const itemHeight = item.transform[5]; // y-position
              const text = item.str;
              
              // Header is usually at the top 10% of the page
              if (itemHeight > pageHeight * 0.9) {
                headerText += text + ' ';
              }
              // Footer is usually at the bottom 10% of the page
              else if (itemHeight < pageHeight * 0.1) {
                footerText += text + ' ';
              }
              // Main content is in the middle
              else {
                mainContent += text + ' ';
              }
            }
          });
          
          // Add structured page content
          fullText += `# Page ${i}\n\n`;
          
          if (headerText.trim()) {
            fullText += `## Header\n${headerText.trim()}\n\n`;
          }
          
          fullText += `## Main Content\n${mainContent.trim()}\n\n`;
          
          if (footerText.trim()) {
            fullText += `## Footer\n${footerText.trim()}\n\n`;
          }
        }
        
        return fullText;
      } catch (error) {
        console.error('Error parsing PDF:', error);
        return `Failed to extract content from PDF: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    else {
      // For unknown file types, just try to read as text
      return await file.text();
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    return `Error extracting content from ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Parse the content into sections based on improved heuristics
function parseContentIntoSections(content: string, fileName: string): Section[] {
  console.log('\n=== Starting Section Parsing ===');
  console.log(`Processing file: ${fileName}`);
  console.log(`Content length: ${content.length} characters`);
  
  const lines = content.split('\n').filter(line => line.trim() !== '');
  console.log(`Found ${lines.length} non-empty lines`);
  
  if (lines.length === 0) {
    console.log('No content found, creating default section');
    return [{
      title: 'Introduction',
      content: `No content found in ${fileName}`,
      level: 1
    }];
  }
  
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let contentBuffer: string[] = [];
  let currentLevel = 1;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for markdown headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      console.log(`\nFound header at line ${i + 1}:`);
      console.log(`- Level: ${headerMatch[1].length}`);
      console.log(`- Title: ${headerMatch[2]}`);
      
      // Save previous section if exists
      if (currentSection) {
        console.log(`\nSaving previous section:`);
        console.log(`- Title: ${currentSection.title}`);
        console.log(`- Level: ${currentSection.level}`);
        console.log(`- Content length: ${contentBuffer.length} lines`);
        
        currentSection.content = contentBuffer.join('\n');
        sections.push(currentSection);
        contentBuffer = [];
      }
      
      // Create new section
      const level = headerMatch[1].length;
      currentSection = {
        title: headerMatch[2],
        content: '',
        level: level
      };
      currentLevel = level;
      
      console.log(`Created new section: ${currentSection.title} (Level ${currentSection.level})`);
    } else if (currentSection) {
      // Add content to current section
      contentBuffer.push(line);
    } else {
      // If no section exists yet, create a default one
      console.log('\nNo section exists, creating default Introduction section');
      currentSection = {
        title: 'Introduction',
        content: '',
        level: 1
      };
      contentBuffer.push(line);
    }
  }
  
  // Don't forget to add the last section
  if (currentSection) {
    console.log(`\nSaving final section:`);
    console.log(`- Title: ${currentSection.title}`);
    console.log(`- Level: ${currentSection.level}`);
    console.log(`- Content length: ${contentBuffer.length} lines`);
    
    currentSection.content = contentBuffer.join('\n');
    sections.push(currentSection);
  }
  
  // If no sections were created, create a default one
  if (sections.length === 0) {
    console.log('\nNo sections created, adding default Main Content section');
    sections.push({
      title: 'Main Content',
      content: content,
      level: 1
    });
  }
  
  console.log('\n=== Section Parsing Complete ===');
  console.log(`Total sections created: ${sections.length}`);
  sections.forEach((section, index) => {
    console.log(`\nSection ${index + 1}:`);
    console.log(`- Title: ${section.title}`);
    console.log(`- Level: ${section.level}`);
    console.log(`- Content length: ${section.content.length} characters`);
  });
  
  return sections;
}

// Function to get the table of contents for a manual
export async function getManualTOC(manualId: string): Promise<ManualSection[]> {
  try {
    const { data, error } = await supabase
      .from('manual_sections')
      .select('id, title, level, order, parent_id, content')
      .eq('manual_id', manualId)
      .order('order', { ascending: true });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching TOC:', error);
    return [];
  }
}

// Function to get complete manual details by ID
export async function getManualById(manualId: string): Promise<Manual | null> {
  try {
    console.log(`Fetching manual with ID: ${manualId}`);
    
    // Fetch manual details
    const { data: manualData, error: manualError } = await supabase
      .from('manuals')
      .select('id, title, version')
      .eq('id', manualId)
      .single();
    
    if (manualError) {
      console.error(`Error fetching manual details: ${manualError.message}`);
      throw manualError;
    }
    
    if (!manualData) {
      console.error(`No manual found with ID: ${manualId}`);
      return null;
    }
    
    console.log(`Found manual: ${manualData.title}, Version: ${manualData.version}`);
    
    // Fetch manual sections with full content
    const { data: sectionData, error: sectionError } = await supabase
      .from('manual_sections')
      .select('id, title, content, level, order, parent_id')
      .eq('manual_id', manualId)
      .order('order', { ascending: true });
    
    if (sectionError) {
      console.error(`Error fetching section data: ${sectionError.message}`);
      throw sectionError;
    }
    
    console.log(`Found ${sectionData?.length || 0} sections for manual ${manualId}`);
    
    // Format the sections - ensure content is properly processed
    const sections = sectionData.map(section => {
      // Make sure content is a string
      let processedContent = section.content;
      
      // If content is empty or null, provide a placeholder
      if (!processedContent) {
        console.log(`Empty content for section: ${section.id} - ${section.title}`);
        processedContent = "No content available for this section.";
      }
      
      // If content is somehow an object, stringify it
      if (typeof processedContent !== 'string') {
        console.log(`Non-string content for section: ${section.id} - ${section.title}`);
        processedContent = JSON.stringify(processedContent);
      }
      
      return {
        id: section.id,
        title: section.title,
        content: processedContent,
        level: section.level,
        parent_id: section.parent_id,
        order: section.order || 0
      };
    });
    
    return {
      id: manualData.id,
      title: manualData.title,
      version: manualData.version,
      sections
    };
  } catch (error) {
    console.error('Error fetching manual:', error);
    return null;
  }
}

// Function to import a manual from an external URL (could be PDF, DOCX, etc.)
export async function importManualFromUrl(
  url: string,
  userId: string,
  title?: string
): Promise<UploadManualResult> {
  try {
    // In a real implementation, you would:
    // 1. Fetch the document from the URL
    // 2. Extract the content using appropriate libraries
    // 3. Parse into sections
    // 4. Save to database
    
    // For now, we'll simulate this process
    const response = await fetch(url);
    const blob = await response.blob();
    const filename = url.split('/').pop() || 'imported-manual';
    const file = new File([blob], filename, { type: blob.type });
    
    // Use the existing upload function
    return await uploadManual(file, userId);
  } catch (error) {
    console.error('Error importing manual:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Failed to import manual') 
    };
  }
}

// Function to propose an amendment to a manual section
export async function proposeAmendment(
  manualId: string,
  sectionId: string,
  content: string,
  userId: string,
  title: string,
  reason: string
): Promise<{
  success: boolean;
  amendmentId?: string;
  error?: Error;
}> {
  try {
    // Get the manual version
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .select('version')
      .eq('id', manualId)
      .single();

    if (manualError) throw manualError;

    // Get the section content
    const { data: section, error: sectionError } = await supabase
      .from('manual_sections')
      .select('content')
      .eq('id', sectionId)
      .single();

    if (sectionError) throw sectionError;

    // Create the amendment
    const { data: amendment, error: amendmentError } = await supabase
      .from('amendments')
      .insert({
        manual_id: manualId,
        section_id: sectionId,
        title,
        content,
        original_content: section.content,
        status: 'pending',
        created_by: userId,
        reason
      })
      .select()
      .single();

    if (amendmentError) throw amendmentError;

    // Get the latest revision number
    const { data: latestRevision, error: revisionError } = await supabase
      .from('final_revisions')
      .select('revision_no')
      .eq('manual_id', manualId)
      .order('revision_no', { ascending: false })
      .limit(1)
      .single();

    // Calculate the next revision number
    const nextRevisionNo = latestRevision 
      ? parseInt(latestRevision.revision_no) + 1 
      : 1;

 
    toast.success('Amendment proposal submitted successfully');
    
    return {
      success: true,
      amendmentId: amendment.id
    };
  } catch (error) {
    console.error('Error proposing amendment:', error);
    
    toast.error('Failed to submit amendment proposal');
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to propose amendment')
    };
  }
}

// Helper function to convert mammoth HTML output to structured text format
function convertHtmlToStructuredText(html: string): string {
  console.log('\n=== Starting HTML to Structured Text Conversion ===');
  console.log(`Input HTML length: ${html.length} characters`);
  
  let structuredText = '';
  
  // Create a temporary DOM element to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Process main content with headings
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  console.log(`Found ${headings.length} headings in the document`);
  
  // If we have structured headings
  if (headings.length > 0) {
    console.log('\nProcessing document with structured headings:');
    // Process each heading and its content
    headings.forEach((heading, index) => {
      // Determine heading level
      const level = parseInt(heading.tagName.substring(1));
      const prefix = '#'.repeat(level);
      
      console.log(`\nProcessing heading ${index + 1}:`);
      console.log(`- Level: ${level}`);
      console.log(`- Text: ${heading.textContent}`);
      
      // Add heading to structured text
      structuredText += `${prefix} ${heading.textContent}\n\n`;
      
      // Get content between this heading and the next heading of same or higher level
      let content = '';
      let nextElement = heading.nextElementSibling;
      let contentElements = 0;
      
      while (nextElement && !nextElement.tagName.match(/^H[1-6]$/)) {
        contentElements++;
        // Extract text content based on element type
        if (nextElement.tagName === 'UL' || nextElement.tagName === 'OL') {
          // Handle lists
          const listItems = nextElement.querySelectorAll('li');
          console.log(`Found list with ${listItems.length} items`);
          listItems.forEach(item => {
            if (nextElement?.tagName === 'OL') {
              content += `1. ${item.textContent}\n`;
            } else {
              content += `* ${item.textContent}\n`;
            }
          });
          content += '\n';
        } else if (nextElement.tagName === 'P') {
          // Handle paragraphs
          const paragraphText = nextElement.textContent?.trim() || '';
          if (paragraphText) {
            content += `${paragraphText}\n\n`;
          }
        } else if (nextElement.tagName === 'TABLE') {
          // Handle tables
          const rows = nextElement.querySelectorAll('tr');
          console.log(`Found table with ${rows.length} rows`);
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            const rowText = Array.from(cells).map(cell => cell.textContent?.trim() || '').join(' | ');
            if (rowIndex === 0) {
              content += `| ${rowText} |\n`;
              content += `| ${Array(cells.length).fill('---').join(' | ')} |\n`;
            } else {
              content += `| ${rowText} |\n`;
            }
          });
          content += '\n';
        } else {
          // Default handling for other elements
          const text = nextElement.textContent?.trim();
          if (text) {
            content += `${text}\n\n`;
          }
        }
        
        nextElement = nextElement.nextElementSibling;
      }
      
      console.log(`- Processed ${contentElements} content elements`);
      console.log(`- Content length: ${content.length} characters`);
      
      // Add the content to structured text
      structuredText += `${content}\n`;
    });
  } else {
    console.log('\nNo headings found, processing as flat content');
    // If no headings found, process all content
    const elements = doc.querySelectorAll('p, ul, ol, table');
    console.log(`Found ${elements.length} content elements`);
    
    elements.forEach((element, index) => {
      console.log(`\nProcessing element ${index + 1}: ${element.tagName}`);
      if (element.tagName === 'P') {
        const paragraphText = element.textContent?.trim() || '';
        if (paragraphText) {
          structuredText += `${paragraphText}\n\n`;
        }
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        // Handle lists
        const listItems = element.querySelectorAll('li');
        console.log(`Found list with ${listItems.length} items`);
        listItems.forEach(item => {
          if (element.tagName === 'OL') {
            structuredText += `1. ${item.textContent}\n`;
          } else {
            structuredText += `* ${item.textContent}\n`;
          }
        });
        structuredText += '\n';
      } else if (element.tagName === 'TABLE') {
        // Handle tables
        const rows = element.querySelectorAll('tr');
        console.log(`Found table with ${rows.length} rows`);
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('td, th');
          const rowText = Array.from(cells).map(cell => cell.textContent?.trim() || '').join(' | ');
          if (rowIndex === 0) {
            structuredText += `| ${rowText} |\n`;
            structuredText += `| ${Array(cells.length).fill('---').join(' | ')} |\n`;
          } else {
            structuredText += `| ${rowText} |\n`;
          }
        });
        structuredText += '\n';
      }
    });
  }
  
  console.log('\n=== HTML to Structured Text Conversion Complete ===');
  console.log(`Output text length: ${structuredText.length} characters`);
  
  return structuredText;
}

// Polyfill for browsers without DOMParser in Node environment
if (typeof DOMParser === 'undefined') {
  class NodeDOMParser {
    parseFromString(html: string, mimeType: string) {
      // A simple HTML parser implementation that extracts text
      // This is a very basic implementation for Node environments
      const extractText = (html: string) => {
        // Remove HTML tags, preserve content
        return html
          .replace(/<\/?[^>]+(>|$)/g, "\n")
          .replace(/\n+/g, "\n")
          .trim();
      };
      
      // Create a basic document structure
      return {
        querySelector: (selector: string) => {
          if (html.includes(`class="${selector.replace('.', '')}"`)) {
            return { textContent: extractText(html) };
          }
          return null;
        },
        querySelectorAll: (selector: string) => {
          // Naive implementation for headings
          const headingMatch = selector.match(/h([1-6])/i);
          if (headingMatch) {
            const level = headingMatch[1];
            const pattern = new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, 'gi');
            const matches = [...html.matchAll(pattern)];
            return matches.map(m => ({ 
              tagName: `H${level}`,
              textContent: m[1],
              nextElementSibling: null 
            }));
          }
          
          // Simple matcher for list items, paragraphs, etc.
          if (selector === 'p') {
            const pattern = /<p[^>]*>(.*?)<\/p>/gi;
            const matches = [...html.matchAll(pattern)];
            return matches.map(m => ({ textContent: m[1] }));
          }
          
          return [];
        }
      };
    }
  }
  
  // @ts-ignore - Polyfill for Node environment
  global.DOMParser = NodeDOMParser;
}

// Helper function to extract document metadata
function extractDocumentMetadata(html: string): string {
  const metadata: string[] = [];
  
  // Extract document properties
  const docProps = {
    title: html.match(/<p class="Title[^>]*>(.*?)<\/p>/)?.[1] || '',
    subtitle: html.match(/<p class="Subtitle[^>]*>(.*?)<\/p>/)?.[1] || '',
    version: html.match(/Version[^>]*>(.*?)<\/p>/)?.[1] || '',
    date: html.match(/Date[^>]*>(.*?)<\/p>/)?.[1] || '',
    author: html.match(/Author[^>]*>(.*?)<\/p>/)?.[1] || ''
  };
  
  // Build metadata string
  if (docProps.title) metadata.push(`Title: ${docProps.title}`);
  if (docProps.subtitle) metadata.push(`Subtitle: ${docProps.subtitle}`);
  if (docProps.version) metadata.push(`Version: ${docProps.version}`);
  if (docProps.date) metadata.push(`Date: ${docProps.date}`);
  if (docProps.author) metadata.push(`Author: ${docProps.author}`);
  
  return metadata.length > 0 ? metadata.join('\n') : '';
}