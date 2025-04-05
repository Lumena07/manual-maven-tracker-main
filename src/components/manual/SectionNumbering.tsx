import React from 'react';

interface Section {
  children: any;
  id: string;
  title: string;
  content: string;
  level: number;
  parent_id: string | null;
}

export function findMainSectionNumber(content: string): number {
  // Find the first h1 header in the content
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (!h1Match) return -1;

  // Get the line number of this h1
  const lines = content.split('\n');
  const h1LineIndex = lines.findIndex(line => line.match(/^#\s+(.+)$/));
  
  // Count how many h1 headers come before this one in the entire content
  const allH1s = content.match(/^#\s+(.+)$/gm) || [];
  const sectionNumber = allH1s.findIndex((h1, index) => {
    const h1LineNumber = content.split('\n').findIndex(line => line === h1);
    return h1LineNumber === h1LineIndex;
  });

  return sectionNumber;
}

export function generateSubSectionNumber(content: string, mainSectionNumber: number): string {
  // Split content into lines
  const lines = content.split('\n');
  
  // Find all headers (h1, h2, h3, h4)
  const headers: { level: number; index: number }[] = [];
  lines.forEach((line, index) => {
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      headers.push({
        level: headerMatch[1].length,
        index
      });
    }
  });

  if (headers.length === 0) return '';

  // Find the current header's position
  const currentHeader = headers[0];
  if (currentHeader.level === 1) {
    return `Section ${mainSectionNumber}`;
  }

  // Find the preceding headers to build the numbering
  const numbers: number[] = [mainSectionNumber];
  let currentLevel = 1;
  let subSectionCount = 0;

  headers.forEach(header => {
    if (header.index >= currentHeader.index) return;
    
    if (header.level === 1) {
      // Reset counters when encountering a new h1
      currentLevel = 1;
      subSectionCount = 0;
    } else if (header.level > currentLevel) {
      // Going deeper in level
      currentLevel = header.level;
      subSectionCount = 1;
      numbers[currentLevel - 1] = subSectionCount;
    } else if (header.level === currentLevel) {
      // Same level
      subSectionCount++;
      numbers[currentLevel - 1] = subSectionCount;
    } else {
      // Going back up in level
      currentLevel = header.level;
      subSectionCount++;
      numbers[currentLevel - 1] = subSectionCount;
      // Reset deeper levels
      numbers.splice(currentLevel);
    }
  });

  // Add the current header's number
  if (currentHeader.level > currentLevel) {
    numbers[currentHeader.level - 1] = 1;
  } else if (currentHeader.level === currentLevel) {
    numbers[currentHeader.level - 1] = subSectionCount + 1;
  }

  // Format the number
  if (currentHeader.level === 1) {
    return `Section ${numbers[0]}`;
  }
  return numbers.slice(0, currentHeader.level).join('.');
}

export function processContent(content: string): string {
  const mainSectionNumber = findMainSectionNumber(content);
  
  // Split content into lines and process each line
  const lines = content.split('\n');
  const processedLines = lines.map((line, index) => {
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2];
      const sectionNumber = level === 1 
        ? `Section ${mainSectionNumber}` 
        : generateSubSectionNumber(content.split('\n').slice(0, index + 1).join('\n'), mainSectionNumber);
      return `${headerMatch[1]} ${sectionNumber} ${title}`;
    }
    return line;
  });

  return processedLines.join('\n');
}

interface SectionNumberingProps {
  sections: Section[];
}

export function SectionNumbering({ sections }: SectionNumberingProps) {
  const generateSectionNumber = (section: Section, parentNumbers: number[] = []): string => {
    // For level 1 (h1), use "Section X"
    if (section.level === 1) {
      return `Section ${parentNumbers[0]}`;
    }
    
    // For deeper levels, join the numbers with dots
    return parentNumbers.join('.');
  };

  const renderSection = (section: Section, index: number, parentNumbers: number[] = []): React.ReactNode => {
    // Calculate current section numbers
    const currentNumbers = [...parentNumbers];
    if (section.level === 1) {
      currentNumbers[0] = index;
    } else {
      currentNumbers.push(index + 1);
    }

    return (
      <div key={section.id} className="mb-2">
        <div className={`flex items-center gap-2 ${section.level > 1 ? 'ml-' + (section.level * 4) : ''}`}>
          <span className="font-medium">{generateSectionNumber(section, currentNumbers)}</span>
          <span>{section.title}</span>
        </div>
        {section.children && section.children.length > 0 && (
          <div className="ml-4">
            {section.children.map((child, childIndex) =>
              renderSection(child, childIndex, currentNumbers)
            )}
          </div>
        )}
      </div>
    );
  };

  // Start with main sections (level 1)
  const mainSections = sections.filter(s => s.level === 1);

  return (
    <div className="section-numbering">
      {mainSections.map((section, index) =>
        renderSection(section, index)
      )}
    </div>
  );
}

interface NumberedSectionProps {
  content: string;
  sectionNumber: string;
}

export function NumberedSection({ content, sectionNumber }: NumberedSectionProps) {
  // Split content into lines to process headings
  const lines = content.split('\n');
  const processedLines = lines.map(line => {
    // Match heading patterns (# for h1, ## for h2, etc.)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      return `${headingMatch[1]} ${sectionNumber} ${title}`;
    }
    return line;
  });

  return (
    <div className="numbered-section">
      {processedLines.join('\n')}
    </div>
  );
} 