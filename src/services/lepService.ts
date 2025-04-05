import { supabase } from '@/integrations/supabase/client';

export interface LEPEntry {
  id: string;
  manual_id: string;
  section_id: string;
  page_number: number;
  revision_number: string;
  effective_date: string;
  status: 'active' | 'superseded';
}

export async function getLEPContent(manualId: string): Promise<LEPEntry[]> {
  try {
    const { data, error } = await supabase
      .from('lep_entries')
      .select(`
        *,
        manual_sections (
          title,
          level
        )
      `)
      .eq('manual_id', manualId)
      .order('page_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching LEP content:', error);
    return [];
  }
}

export function generateLEPTable(entries: LEPEntry[]): string {
  if (entries.length === 0) {
    return '<p>No LEP entries found.</p>';
  }

  let table = `
    <table class="lep-table">
      <thead>
        <tr>
          <th>Page</th>
          <th>Section</th>
          <th>Revision</th>
          <th>Effective Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  entries.forEach(entry => {
    table += `
      <tr>
        <td>${entry.page_number}</td>
        <td>${entry.manual_sections?.title || 'Unknown'}</td>
        <td>${entry.revision_number}</td>
        <td>${new Date(entry.effective_date).toLocaleDateString()}</td>
        <td>${entry.status}</td>
      </tr>
    `;
  });

  table += '</tbody></table>';
  return table;
} 