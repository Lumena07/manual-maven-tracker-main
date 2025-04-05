import React from 'react';
import { cn } from '@/lib/utils';
import './SectionContentRenderer.css';

interface SectionContentRendererProps {
  content: string;
  originalContent?: string;
  isAmended?: boolean;
  className?: string;
}

export function SectionContentRenderer({ content, originalContent, isAmended, className }: SectionContentRendererProps) {
  // Function to detect if a string is a table (contains multiple rows with | or tab separators)
  const isTable = (text: string): boolean => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return false;
    
    // Check if at least 2 consecutive lines have the same number of separators
    const separatorCounts = lines.map(line => {
      const pipeCount = (line.match(/\|/g) || []).length;
      const tabCount = (line.match(/\t/g) || []).length;
      return pipeCount > 0 ? pipeCount : tabCount;
    });
    
    // Check for at least 2 consecutive lines with separators
    for (let i = 0; i < separatorCounts.length - 1; i++) {
      if (separatorCounts[i] > 0 && separatorCounts[i + 1] > 0) {
        return true;
      }
    }
    
    return false;
  };

  // Function to detect if a string is a simple two-column table (abbreviations and definitions)
  const isAbbreviationTable = (text: string): boolean => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return false;
    
    // Check if lines follow a pattern of abbreviation followed by definition
    // Pattern: 3-5 capital letters followed by whitespace and text
    const abbreviationPattern = /^[A-Z]{3,5}\s+/;
    
    // Count how many lines match the pattern
    const matchingLines = lines.filter(line => 
      line.trim() && abbreviationPattern.test(line)
    );
    
    // If at least 70% of non-empty lines match the pattern, consider it an abbreviation table
    const nonEmptyLines = lines.filter(line => line.trim());
    return matchingLines.length >= nonEmptyLines.length * 0.7;
  };

  // Function to render a table
  const renderTable = (tableText: string) => {
    const lines = tableText.trim().split('\n');
    
    // Determine separator type (| or tab)
    const hasPipes = lines.some(line => line.includes('|'));
    const separator = hasPipes ? '|' : '\t';
    
    // Process each line
    const rows = lines.map(line => {
      // Split by separator and trim each cell
      return line.split(separator).map(cell => cell.trim());
    });
    
    // Filter out empty rows
    const nonEmptyRows = rows.filter(row => row.some(cell => cell.length > 0));
    
    if (nonEmptyRows.length === 0) return <div>Empty table</div>;
    
    // Determine if this is likely a header row
    const hasHeader = nonEmptyRows.length > 1 && 
      nonEmptyRows[0].every(cell => cell.length > 0) && 
      nonEmptyRows[0].every(cell => /^[A-Z\s]+$/.test(cell) || cell.length < 20);
    
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300">
          {hasHeader && (
            <thead>
              <tr className="bg-gray-100 font-medium">
                {nonEmptyRows[0].map((cell, index) => (
                  <th key={index} className="border border-gray-300 p-2 text-left">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {nonEmptyRows.slice(hasHeader ? 1 : 0).map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-300 p-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Function to render an abbreviation table
  const renderAbbreviationTable = (tableText: string) => {
    const lines = tableText.trim().split('\n');
    
    // Process each line to extract abbreviation and definition
    const rows = lines.map(line => {
      // Try to match the pattern: 3-5 capital letters followed by whitespace and text
      const match = line.match(/^([A-Z]{3,5})\s+(.+)$/);
      if (match) {
        return [match[1], match[2]];
      }
      
      // If no match, try to find the first occurrence of 3-5 capital letters
      const capMatch = line.match(/([A-Z]{3,5})/);
      if (capMatch) {
        const index = capMatch.index || 0;
        const abbr = line.substring(index, index + capMatch[1].length);
        const def = line.substring(index + capMatch[1].length).trim();
        return [abbr, def];
      }
      
      // If still no match, just return the line as is
      return [line, ''];
    }).filter(row => row[0].trim());
    
    if (rows.length === 0) return <div>Empty table</div>;
    
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 font-medium">
              <th className="border border-gray-300 p-2 text-left w-1/4">Abbreviation</th>
              <th className="border border-gray-300 p-2 text-left">Definition</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 font-medium">{row[0]}</td>
                <td className="border border-gray-300 p-2">{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Function to detect and render lists
  const renderLists = (text: string) => {
    // Split by newlines
    const lines = text.split('\n');
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let listItems: string[] = [];
    let result: React.ReactNode[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line is a list item
      const isUnorderedItem = /^[-*•]\s/.test(line);
      const isOrderedItem = /^\d+\.\s/.test(line);
      
      if (isUnorderedItem || isOrderedItem) {
        // Start a new list if not already in one
        if (!inList) {
          inList = true;
          listType = isUnorderedItem ? 'ul' : 'ol';
          listItems = [];
        }
        
        // Add item to current list
        listItems.push(line.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, ''));
      } else {
        // End current list if exists
        if (inList) {
          result.push(
            listType === 'ul' ? (
              <ul key={`list-${i}`} className="list-disc pl-6 my-2">
                {listItems.map((item, idx) => (
                  <li key={idx} className="mb-1">{item}</li>
                ))}
              </ul>
            ) : (
              <ol key={`list-${i}`} className="list-decimal pl-6 my-2">
                {listItems.map((item, idx) => (
                  <li key={idx} className="mb-1">{item}</li>
                ))}
              </ol>
            )
          );
          inList = false;
          listType = null;
          listItems = [];
        }
        
        // Add non-list line
        if (line.trim()) {
          result.push(<p key={`p-${i}`} className="my-2">{line}</p>);
        }
      }
    }
    
    // Handle list at the end of text
    if (inList && listItems.length > 0) {
      result.push(
        listType === 'ul' ? (
          <ul key="list-end" className="list-disc pl-6 my-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="mb-1">{item}</li>
            ))}
          </ul>
        ) : (
          <ol key="list-end" className="list-decimal pl-6 my-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="mb-1">{item}</li>
            ))}
          </ol>
        )
      );
    }
    
    return result.length > 0 ? result : <p className="my-2">{text}</p>;
  };

  // Function to identify paragraphs in text
  const identifyParagraphs = (text: string): string[] => {
    // Split by double newlines to identify paragraphs
    return text.split(/\n\s*\n/);
  };

  // Function to split content into blocks (tables and non-tables)
  const splitContentBlocks = (text: string): { type: 'table' | 'text'; content: string }[] => {
    const blocks: { type: 'table' | 'text'; content: string }[] = [];
    const lines = text.split('\n');
    let currentBlock: string[] = [];
    let currentType: 'table' | 'text' | null = null;

    const processCurrentBlock = () => {
      if (currentBlock.length > 0) {
        blocks.push({
          type: currentType || 'text',
          content: currentBlock.join('\n')
        });
        currentBlock = [];
        currentType = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      const currentIsTable = isTable(line + '\n' + nextLine);

      // If we're starting a new block type
      if (currentType === null) {
        currentType = currentIsTable ? 'table' : 'text';
        currentBlock.push(line);
      }
      // If we're continuing the same type
      else if ((currentType === 'table' && currentIsTable) ||
               (currentType === 'text' && !currentIsTable)) {
        currentBlock.push(line);
      }
      // If we're switching types
      else {
        processCurrentBlock();
        currentType = currentIsTable ? 'table' : 'text';
        currentBlock.push(line);
      }
    }

    processCurrentBlock();
    return blocks;
  };

  // Main rendering logic
  const renderContent = () => {
    if (originalContent && isAmended) {
      // Handle amended content with paragraph marking
      const originalParagraphs = identifyParagraphs(originalContent);
      const newParagraphs = identifyParagraphs(content);
      
      const paragraphChanges = new Map<number, boolean>();
      
      for (let i = 0; i < Math.max(originalParagraphs.length, newParagraphs.length); i++) {
        if (i >= originalParagraphs.length || i >= newParagraphs.length || 
            originalParagraphs[i].trim() !== newParagraphs[i].trim()) {
          paragraphChanges.set(i, true);
        }
      }
      
      return (
        <div className="whitespace-pre-wrap">
          {newParagraphs.map((paragraph, index) => (
            <div 
              key={index} 
              className={paragraphChanges.get(index) ? "amended-paragraph" : ""}
            >
              {paragraph}
            </div>
          ))}
        </div>
      );
    }

    // Handle regular content with mixed blocks
    const blocks = splitContentBlocks(content);
    
    return (
      <div>
        {blocks.map((block, index) => (
          <div key={index}>
            {block.type === 'table' ? (
              isAbbreviationTable(block.content) ? 
                renderAbbreviationTable(block.content) : 
                renderTable(block.content)
            ) : (
              renderLists(block.content)
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("section-content", className, isAmended ? 'amended-content' : '')}>
      {renderContent()}
    </div>
  );
} 