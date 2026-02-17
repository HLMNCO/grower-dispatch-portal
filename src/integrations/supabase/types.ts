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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          abn: string | null
          address: string | null
          business_type: string
          city: string | null
          created_at: string
          email: string | null
          grower_code: string | null
          id: string
          name: string
          owner_id: string
          phone: string | null
          region: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          abn?: string | null
          address?: string | null
          business_type: string
          city?: string | null
          created_at?: string
          email?: string | null
          grower_code?: string | null
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          abn?: string | null
          address?: string | null
          business_type?: string
          city?: string | null
          created_at?: string
          email?: string | null
          grower_code?: string | null
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          id: string
          receiver_business_id: string
          requested_at: string
          responded_at: string | null
          status: string
          supplier_business_id: string
        }
        Insert: {
          id?: string
          receiver_business_id: string
          requested_at?: string
          responded_at?: string | null
          status?: string
          supplier_business_id: string
        }
        Update: {
          id?: string
          receiver_business_id?: string
          requested_at?: string
          responded_at?: string | null
          status?: string
          supplier_business_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_receiver_business_id_fkey"
            columns: ["receiver_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_supplier_business_id_fkey"
            columns: ["supplier_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_items: {
        Row: {
          created_at: string
          dispatch_id: string
          id: string
          product: string
          quantity: number
          size: string | null
          tray_type: string | null
          variety: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          id?: string
          product: string
          quantity?: number
          size?: string | null
          tray_type?: string | null
          variety?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          id?: string
          product?: string
          quantity?: number
          size?: string | null
          tray_type?: string | null
          variety?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          carrier: string | null
          con_note_number: string
          created_at: string
          dispatch_date: string
          display_id: string
          expected_arrival: string | null
          grower_code: string | null
          grower_name: string
          id: string
          notes: string | null
          photos: string[] | null
          receiver_business_id: string | null
          status: string
          supplier_business_id: string | null
          supplier_id: string
          total_pallets: number
          truck_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          con_note_number: string
          created_at?: string
          dispatch_date: string
          display_id?: string
          expected_arrival?: string | null
          grower_code?: string | null
          grower_name: string
          id?: string
          notes?: string | null
          photos?: string[] | null
          receiver_business_id?: string | null
          status?: string
          supplier_business_id?: string | null
          supplier_id: string
          total_pallets?: number
          truck_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          con_note_number?: string
          created_at?: string
          dispatch_date?: string
          display_id?: string
          expected_arrival?: string | null
          grower_code?: string | null
          grower_name?: string
          id?: string
          notes?: string | null
          photos?: string[] | null
          receiver_business_id?: string | null
          status?: string
          supplier_business_id?: string | null
          supplier_id?: string
          total_pallets?: number
          truck_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_receiver_business_id_fkey"
            columns: ["receiver_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_supplier_business_id_fkey"
            columns: ["supplier_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string | null
          company_name: string
          created_at: string
          display_name: string
          grower_code: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          company_name?: string
          created_at?: string
          display_name?: string
          grower_code?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          company_name?: string
          created_at?: string
          display_name?: string
          grower_code?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_issues: {
        Row: {
          created_at: string
          description: string
          dispatch_id: string
          flagged_by: string | null
          id: string
          issue_type: string
          photo_url: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          description: string
          dispatch_id: string
          flagged_by?: string | null
          id?: string
          issue_type: string
          photo_url?: string | null
          severity?: string
        }
        Update: {
          created_at?: string
          description?: string
          dispatch_id?: string
          flagged_by?: string | null
          id?: string
          issue_type?: string
          photo_url?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_issues_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "staff" | "supplier"
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
    Enums: {
      app_role: ["staff", "supplier"],
    },
  },
} as const
