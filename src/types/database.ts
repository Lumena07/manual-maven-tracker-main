// This file contains type definitions for our application that reference Supabase tables
// Import types from here instead of modifying the auto-generated types.ts file

import { Database } from '@/integrations/supabase/types';

// Re-export the Database type
export type { Database };

// Define types based on the Database schema
export type Tables = Database['public']['Tables'];

// Manual table types
export interface ManualRow {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_obsolete: boolean;
}
export type ManualInsert = Tables['manuals']['Insert'];
export type ManualUpdate = Tables['manuals']['Update'];

// Manual section types
export type ManualSectionRow = Tables['manual_sections']['Row'];
export type ManualSectionInsert = Tables['manual_sections']['Insert'];
export type ManualSectionUpdate = Tables['manual_sections']['Update'];

// Amendment types
export type AmendmentRow = Tables['amendments']['Row'];
export type AmendmentInsert = Tables['amendments']['Insert'];
export type AmendmentUpdate = Tables['amendments']['Update'];

// Temp revision types
export type TempRevisionRow = Tables['temporary_revisions']['Row'];
export type TempRevisionInsert = Tables['temporary_revisions']['Insert'];
export type TempRevisionUpdate = Tables['temporary_revisions']['Update'];

// Final revision types
export interface FinalRevision {
  id: string;
  manual_id: string;
  revision_number: string;
  description: string;
  date_issued: string;
  effective_date: string;
  created_by: string;
  created_at: string;
}
export type FinalRevisionInsert = Tables['final_revisions']['Insert'];
export type FinalRevisionUpdate = Tables['final_revisions']['Update'];

// Profile types
export type ProfileRow = Tables['profiles']['Row'];
export type ProfileInsert = Tables['profiles']['Insert'];
export type ProfileUpdate = Tables['profiles']['Update'];
