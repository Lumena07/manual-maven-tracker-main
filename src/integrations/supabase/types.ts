export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      amendments: {
        Row: {
          id: string
          section_id: string
          manual_id: string
          title: string
          content: string
          original_content: string
          status: 'pending' | 'quality' | 'approved' | 'rejected'
          created_by: string
          created_at: string
          approved_by_quality_by: string | null
          approved_by_quality_at: string | null
          approved_by_authority_by: string | null
          approved_by_authority_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          reason: string 
        }
        Insert: {
          id?: string
          section_id: string
          manual_id: string
          title: string
          content: string
          original_content: string
          status?: 'pending' | 'quality' | 'approved' | 'rejected'
          created_by: string
          created_at?: string
          approved_by_quality_by?: string | null
          approved_by_quality_at?: string | null
          approved_by_authority_by?: string | null
          approved_by_authority_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reason?: string
        }
        Update: {
          id?: string
          section_id?: string
          manual_id?: string
          title?: string
          content?: string
          original_content?: string
          status?: 'pending' | 'quality' | 'approved' | 'rejected'
          created_by?: string
          created_at?: string
          approved_by_quality_by?: string | null
          approved_by_quality_at?: string | null
          approved_by_authority_by?: string | null
          approved_by_authority_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "amendments_manual_id_fkey"
            columns: ["manual_id"]
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amendments_section_id_fkey"
            columns: ["section_id"]
            referencedRelation: "manual_sections"
            referencedColumns: ["id"]
          }
        ]
      }
      manuals: {
        Row: {
          id: string
          title: string
          description: string | null
          version: string
          created_by: string
          created_at: string
          updated_at: string
          company_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          version: string
          created_by: string
          created_at?: string
          updated_at?: string
          company_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          version?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          company_id?: string
        }
        Relationships: []
      }
      manual_sections: {
        Row: {
          id: string
          manual_id: string
          title: string
          content: string
          order: number
          level: number
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          manual_id: string
          title: string
          content: string
          order: number
          level: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          manual_id?: string
          title?: string
          content?: string
          order?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_sections_manual_id_fkey"
            columns: ["manual_id"]
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          }
        ]
      }
      final_revisions: {
        Row: {
          id: string
          manual_id: string
          revision_no: string
          revision_date: string
          affected_pages: string
          reason: string
          date_inserted: string
          inserted_by: string
          issue_no: string
        }
        Insert: {
          id?: string
          manual_id: string
          revision_no: string
          revision_date: string
          affected_pages: string
          reason: string
          date_inserted: string
          inserted_by: string
          issue_no: string
        }
        Update: {
          id?: string
          manual_id?: string
          revision_no?: string
          revision_date?: string
          affected_pages?: string
          reason?: string
          date_inserted?: string
          inserted_by?: string
          issue_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_revisions_manual_id_fkey"
            columns: ["manual_id"]
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'quality' | 'authority' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'quality' | 'authority' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'quality' | 'authority' | 'user'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      temporary_revisions: {
        Row: {
          id: string
          revision_number: string
          manual_id: string
          section_id: string
          description: string
          date_issued: string
          effective_date: string
          expiry_date: string
          issued_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          revision_number: string
          manual_id: string
          section_id: string
          description: string
          date_issued?: string
          effective_date: string
          expiry_date: string
          issued_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          revision_number?: string
          manual_id?: string
          section_id?: string
          description?: string
          date_issued?: string
          effective_date?: string
          expiry_date?: string
          issued_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temporary_revisions_manual_id_fkey"
            columns: ["manual_id"]
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_revisions_section_id_fkey"
            columns: ["section_id"]
            referencedRelation: "manual_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_revisions_issued_by_fkey"
            columns: ["issued_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
