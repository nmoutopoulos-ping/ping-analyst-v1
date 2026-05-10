export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _temp_files: {
        Row: {
          chunk_order: number | null
          content: string
          created_at: string | null
          filename: string
          id: number
        }
        Insert: {
          chunk_order?: number | null
          content: string
          created_at?: string | null
          filename: string
          id?: number
        }
        Update: {
          chunk_order?: number | null
          content?: string
          created_at?: string | null
          filename?: string
          id?: number
        }
        Relationships: []
      }
      assumption_templates: {
        Row: {
          api_key: string
          assumptions: Json
          created_at: string | null
          email: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          api_key: string
          assumptions: Json
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          api_key?: string
          assumptions?: Json
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assumption_templates_api_key_fkey"
            columns: ["api_key"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["api_key"]
          },
        ]
      }
      deal_files: {
        Row: {
          category: string | null
          created_at: string | null
          deal_id: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          notes: string | null
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deal_id: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          notes?: string | null
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deal_id?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          notes?: string | null
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          content: string
          created_at: string | null
          deal_id: string
          id: string
          is_pinned: boolean | null
          parent_note_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deal_id: string
          id?: string
          is_pinned?: boolean | null
          parent_note_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deal_id?: string
          id?: string
          is_pinned?: boolean | null
          parent_note_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_parent_note_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "deal_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_photos: {
        Row: {
          api_key: string
          caption: string | null
          created_at: string | null
          deal_id: string
          file_name: string
          file_size: number | null
          id: string
          image_url: string | null
          label: string | null
          mime_type: string | null
          sort_order: number
          storage_path: string
        }
        Insert: {
          api_key: string
          caption?: string | null
          created_at?: string | null
          deal_id: string
          file_name: string
          file_size?: number | null
          id?: string
          image_url?: string | null
          label?: string | null
          mime_type?: string | null
          sort_order?: number
          storage_path: string
        }
        Update: {
          api_key?: string
          caption?: string | null
          created_at?: string | null
          deal_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          image_url?: string | null
          label?: string | null
          mime_type?: string | null
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_photos_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tasks: {
        Row: {
          assignee_id: string | null
          blocked_by: string[] | null
          created_at: string | null
          deal_id: string | null
          deal_stage: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          sort_order: number | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignee_id?: string | null
          blocked_by?: string[] | null
          created_at?: string | null
          deal_id?: string | null
          deal_stage?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignee_id?: string | null
          blocked_by?: string[] | null
          created_at?: string | null
          deal_id?: string | null
          deal_stage?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_versions: {
        Row: {
          assumption_overrides: Json
          created_at: string
          created_by: string | null
          deal_id: string
          error: string | null
          id: string
          label: string
          parent_version_id: string | null
          results: Json | null
          status: string
          version_number: number
          workbook_path: string | null
        }
        Insert: {
          assumption_overrides?: Json
          created_at?: string
          created_by?: string | null
          deal_id: string
          error?: string | null
          id?: string
          label?: string
          parent_version_id?: string | null
          results?: Json | null
          status?: string
          version_number?: number
          workbook_path?: string | null
        }
        Update: {
          assumption_overrides?: Json
          created_at?: string
          created_by?: string | null
          deal_id?: string
          error?: string | null
          id?: string
          label?: string
          parent_version_id?: string | null
          results?: Json | null
          status?: string
          version_number?: number
          workbook_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_versions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "deal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          address: string
          api_key: string | null
          archived: boolean | null
          assumptions_snapshot: Json | null
          combos: Json | null
          comp_rows: Json | null
          comp_summary: Json | null
          cost: string | null
          created_at: string | null
          deal_stage: string | null
          docx_data: string | null
          docx_path: string | null
          email: string
          excel_data: string | null
          excel_path: string | null
          id: string
          image_url: string | null
          preset_name: string | null
          price: string | null
          radius: string | null
          results: Json | null
          search_id: string
          short_address: string | null
          sqft: string | null
          status: string | null
          total_units: string | null
        }
        Insert: {
          address: string
          api_key?: string | null
          archived?: boolean | null
          assumptions_snapshot?: Json | null
          combos?: Json | null
          comp_rows?: Json | null
          comp_summary?: Json | null
          cost?: string | null
          created_at?: string | null
          deal_stage?: string | null
          docx_data?: string | null
          docx_path?: string | null
          email: string
          excel_data?: string | null
          excel_path?: string | null
          id?: string
          image_url?: string | null
          preset_name?: string | null
          price?: string | null
          radius?: string | null
          results?: Json | null
          search_id: string
          short_address?: string | null
          sqft?: string | null
          status?: string | null
          total_units?: string | null
        }
        Update: {
          address?: string
          api_key?: string | null
          archived?: boolean | null
          assumptions_snapshot?: Json | null
          combos?: Json | null
          comp_rows?: Json | null
          comp_summary?: Json | null
          cost?: string | null
          created_at?: string | null
          deal_stage?: string | null
          docx_data?: string | null
          docx_path?: string | null
          email?: string
          excel_data?: string | null
          excel_path?: string | null
          id?: string
          image_url?: string | null
          preset_name?: string | null
          price?: string | null
          radius?: string | null
          results?: Json | null
          search_id?: string
          short_address?: string | null
          sqft?: string | null
          status?: string | null
          total_units?: string | null
        }
        Relationships: []
      }
      extension_downloads: {
        Row: {
          downloaded_at: string
          id: string
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      lease_extractions: {
        Row: {
          api_key: string
          asset_class: string | null
          base_rent_annual: number | null
          base_rent_monthly: number | null
          completion_tokens: number | null
          confidently_extracted: Json | null
          created_at: string | null
          document_type: string
          estimated_cost: number | null
          expense_structure: string | null
          file_size: number | null
          filename: string
          free_rent_months: number | null
          guarantor_name: string | null
          id: string
          landlord_responsible_expenses: Json | null
          lease_end_date: string | null
          lease_start_date: string | null
          lease_term_months: number | null
          notes: string | null
          parsed_data: Json | null
          prompt_tokens: number | null
          property_address: string | null
          renewal_options: Json | null
          rent_escalation_type: string | null
          rent_escalation_value: number | null
          security_deposit: number | null
          storage_path: string | null
          tenant_entity_type: string | null
          tenant_improvement_allowance: number | null
          tenant_name: string | null
          tenant_responsible_expenses: Json | null
          termination_notice_months: number | null
          termination_option: string | null
          unit_number: string | null
        }
        Insert: {
          api_key: string
          asset_class?: string | null
          base_rent_annual?: number | null
          base_rent_monthly?: number | null
          completion_tokens?: number | null
          confidently_extracted?: Json | null
          created_at?: string | null
          document_type?: string
          estimated_cost?: number | null
          expense_structure?: string | null
          file_size?: number | null
          filename: string
          free_rent_months?: number | null
          guarantor_name?: string | null
          id?: string
          landlord_responsible_expenses?: Json | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          lease_term_months?: number | null
          notes?: string | null
          parsed_data?: Json | null
          prompt_tokens?: number | null
          property_address?: string | null
          renewal_options?: Json | null
          rent_escalation_type?: string | null
          rent_escalation_value?: number | null
          security_deposit?: number | null
          storage_path?: string | null
          tenant_entity_type?: string | null
          tenant_improvement_allowance?: number | null
          tenant_name?: string | null
          tenant_responsible_expenses?: Json | null
          termination_notice_months?: number | null
          termination_option?: string | null
          unit_number?: string | null
        }
        Update: {
          api_key?: string
          asset_class?: string | null
          base_rent_annual?: number | null
          base_rent_monthly?: number | null
          completion_tokens?: number | null
          confidently_extracted?: Json | null
          created_at?: string | null
          document_type?: string
          estimated_cost?: number | null
          expense_structure?: string | null
          file_size?: number | null
          filename?: string
          free_rent_months?: number | null
          guarantor_name?: string | null
          id?: string
          landlord_responsible_expenses?: Json | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          lease_term_months?: number | null
          notes?: string | null
          parsed_data?: Json | null
          prompt_tokens?: number | null
          property_address?: string | null
          renewal_options?: Json | null
          rent_escalation_type?: string | null
          rent_escalation_value?: number | null
          security_deposit?: number | null
          storage_path?: string | null
          tenant_entity_type?: string | null
          tenant_improvement_allowance?: number | null
          tenant_name?: string | null
          tenant_responsible_expenses?: Json | null
          termination_notice_months?: number | null
          termination_option?: string | null
          unit_number?: string | null
        }
        Relationships: []
      }
      lease_group_members: {
        Row: {
          added_at: string | null
          api_key: string
          group_id: string
          id: string
          lease_extraction_id: string
        }
        Insert: {
          added_at?: string | null
          api_key: string
          group_id: string
          id?: string
          lease_extraction_id: string
        }
        Update: {
          added_at?: string | null
          api_key?: string
          group_id?: string
          id?: string
          lease_extraction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "lease_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_group_members_lease_extraction_id_fkey"
            columns: ["lease_extraction_id"]
            isOneToOne: false
            referencedRelation: "lease_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_groups: {
        Row: {
          api_key: string
          created_at: string | null
          deal_id: string | null
          id: string
          name: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          name: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_groups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          api_key: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          search_id: string
          type: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          search_id: string
          type?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          search_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      rentcast_comps: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          comp_id: string | null
          created_at: string | null
          days_on_market: number | null
          deal_id: string
          distance_km: number | null
          distance_m: number | null
          filter_baths: number | null
          filter_beds: number | null
          formatted_address: string | null
          id: string
          improvements: number | null
          latitude: number | null
          listing_status: string | null
          longitude: number | null
          price: number | null
          property_type: string | null
          purchase_price: number | null
          rank: number | null
          search_id: string | null
          square_footage: number | null
          url: string | null
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          comp_id?: string | null
          created_at?: string | null
          days_on_market?: number | null
          deal_id: string
          distance_km?: number | null
          distance_m?: number | null
          filter_baths?: number | null
          filter_beds?: number | null
          formatted_address?: string | null
          id?: string
          improvements?: number | null
          latitude?: number | null
          listing_status?: string | null
          longitude?: number | null
          price?: number | null
          property_type?: string | null
          purchase_price?: number | null
          rank?: number | null
          search_id?: string | null
          square_footage?: number | null
          url?: string | null
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          comp_id?: string | null
          created_at?: string | null
          days_on_market?: number | null
          deal_id?: string
          distance_km?: number | null
          distance_m?: number | null
          filter_baths?: number | null
          filter_beds?: number | null
          formatted_address?: string | null
          id?: string
          improvements?: number | null
          latitude?: number | null
          listing_status?: string | null
          longitude?: number | null
          price?: number | null
          property_type?: string | null
          purchase_price?: number | null
          rank?: number | null
          search_id?: string | null
          square_footage?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rentcast_comps_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          address: string
          api_key: string
          combos: Json | null
          commercial_spaces: Json | null
          created_at: string | null
          email: string
          id: string
          improvements: number | null
          is_default: boolean | null
          lat: number | null
          lng: number | null
          max_comps: number | null
          min_comps: number | null
          name: string
          price: number | null
          radius: number | null
          sqft: number | null
          status: string | null
          total_units: number | null
        }
        Insert: {
          address?: string
          api_key: string
          combos?: Json | null
          commercial_spaces?: Json | null
          created_at?: string | null
          email: string
          id?: string
          improvements?: number | null
          is_default?: boolean | null
          lat?: number | null
          lng?: number | null
          max_comps?: number | null
          min_comps?: number | null
          name: string
          price?: number | null
          radius?: number | null
          sqft?: number | null
          status?: string | null
          total_units?: number | null
        }
        Update: {
          address?: string
          api_key?: string
          combos?: Json | null
          commercial_spaces?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          improvements?: number | null
          is_default?: boolean | null
          lat?: number | null
          lng?: number | null
          max_comps?: number | null
          min_comps?: number | null
          name?: string
          price?: number | null
          radius?: number | null
          sqft?: number | null
          status?: string | null
          total_units?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          api_key: string
          assumptions: Json | null
          auth_user_id: string | null
          created_at: string | null
          email: string
          extension_password: string | null
          id: string
          name: string
          role: string
        }
        Insert: {
          api_key: string
          assumptions?: Json | null
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          extension_password?: string | null
          id?: string
          name: string
          role?: string
        }
        Update: {
          api_key?: string
          assumptions?: Json | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          extension_password?: string | null
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_api_key: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
