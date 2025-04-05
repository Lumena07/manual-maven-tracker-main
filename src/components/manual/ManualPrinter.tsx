import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ManualSection } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLEPContent, generateLEPTable, LEPEntry } from '@/services/lepService';

interface ManualPrinterProps {
  manualId: string;
}

interface PrinterSettings {
  header: string;
  footer: string;
  showTOC: boolean;
  showLEP: boolean;
  selectedSections: string[];
}

export function ManualPrinter({ manualId }: ManualPrinterProps) {
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [lepEntries, setLepEntries] = useState<LEPEntry[]>([]);
  const [settings, setSettings] = useState<PrinterSettings>({
    header: '',
    footer: '',
    showTOC: true,
    showLEP: true,
    selectedSections: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [manualId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sectionsData, lepData] = await Promise.all([
        fetchSections(),
        fetchLEPContent()
      ]);
      setSections(sectionsData);
      setLepEntries(lepData);
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
      .select('*')
      .eq('manual_id', manualId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const fetchLEPContent = async () => {
    return await getLEPContent(manualId);
  };

  const handleSectionToggle = (sectionId: string) => {
    setSettings(prev => ({
      ...prev,
      selectedSections: prev.selectedSections.includes(sectionId)
        ? prev.selectedSections.filter(id => id !== sectionId)
        : [...prev.selectedSections, sectionId]
    }));
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }

    // Generate the print content
    const printContent = generatePrintContent();
    
    // Write the content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Manual Print</title>
          <style>
            @media print {
              @page {
                margin: 2cm;
              }
              .header {
                position: running(header);
                text-align: center;
                font-size: 12pt;
                margin-bottom: 1cm;
              }
              .footer {
                position: running(footer);
                text-align: center;
                font-size: 10pt;
                margin-top: 1cm;
              }
              .toc, .lep {
                page-break-after: always;
              }
              .section {
                page-break-before: always;
              }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 2cm;
              border-bottom: 1px solid #ccc;
              padding-bottom: 0.5cm;
            }
            .footer { 
              text-align: center; 
              margin-top: 2cm;
              border-top: 1px solid #ccc;
              padding-top: 0.5cm;
            }
            .toc, .lep { 
              margin-bottom: 2cm;
            }
            .section { 
              margin-top: 2cm;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #1a1a1a;
              margin-top: 1cm;
              margin-bottom: 0.5cm;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1cm 0;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 0.5cm;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
            }
            .page-number {
              text-align: right;
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
  };

  const generatePrintContent = () => {
    let content = '';

    // Add header
    if (settings.header) {
      content += `<div class="header">${settings.header}</div>`;
    }

    // Add Table of Contents
    if (settings.showTOC) {
      content += '<div class="toc"><h1>Table of Contents</h1>';
      sections.forEach(section => {
        if (settings.selectedSections.includes(section.id)) {
          content += `<div>${section.title}</div>`;
        }
      });
      content += '</div>';
    }

    // Add LEP section if enabled
    if (settings.showLEP) {
      content += '<div class="lep"><h1>List of Effective Pages</h1>';
      content += generateLEPTable(lepEntries);
      content += '</div>';
    }

    // Add selected sections
    sections.forEach(section => {
      if (settings.selectedSections.includes(section.id)) {
        content += `
          <div class="section">
            <h${section.level}>${section.title}</h${section.level}>
            <div>${section.content}</div>
          </div>
        `;
      }
    });

    // Add footer
    if (settings.footer) {
      content += `<div class="footer">${settings.footer}</div>`;
    }

    return content;
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
          <div className="space-y-2">
            <Label htmlFor="header">Header</Label>
            <Input
              id="header"
              value={settings.header}
              onChange={(e) => setSettings(prev => ({ ...prev, header: e.target.value }))}
              placeholder="Enter header text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer">Footer</Label>
            <Input
              id="footer"
              value={settings.footer}
              onChange={(e) => setSettings(prev => ({ ...prev, footer: e.target.value }))}
              placeholder="Enter footer text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showTOC"
              checked={settings.showTOC}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, showTOC: checked as boolean }))
              }
            />
            <Label htmlFor="showTOC">Include Table of Contents</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showLEP"
              checked={settings.showLEP}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, showLEP: checked as boolean }))
              }
            />
            <Label htmlFor="showLEP">Include List of Effective Pages</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Sections to Print</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {sections.map(section => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={section.id}
                    checked={settings.selectedSections.includes(section.id)}
                    onCheckedChange={() => handleSectionToggle(section.id)}
                  />
                  <Label htmlFor={section.id}>{section.title}</Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handlePrint}>Print Manual</Button>
      </div>
    </div>
  );
} 