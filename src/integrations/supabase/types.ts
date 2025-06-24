export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      invitations: {
        Row: {
          created_at: string | null
          created_by: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          email: string
          expires_at: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: number
          location: string | null
          machine_id: string
          machine_model: string | null
          manager_id: string | null
          name: string
          purchase_date: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: number
          location?: string | null
          machine_id: string
          machine_model?: string | null
          manager_id?: string | null
          name: string
          purchase_date?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: number
          location?: string | null
          machine_id?: string
          machine_model?: string | null
          manager_id?: string | null
          name?: string
          purchase_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          notification_preferences: Json | null
          preferences: Json | null
          preferred_currency: string | null
          preferred_timezone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id: string
          notification_preferences?: Json | null
          preferences?: Json | null
          preferred_currency?: string | null
          preferred_timezone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json | null
          preferences?: Json | null
          preferred_currency?: string | null
          preferred_timezone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      raw_machine_data: {
        Row: {
          ambient_rh_pct: number | null
          ambient_temp_c: number | null
          collector_ls1: number | null
          compressor_on: number | null
          created_at: string
          current_a: number | null
          disinfecting: boolean | null
          exhaust_temp_c: number | null
          full_tank: boolean | null
          id: string
          machine_id: string
          producing_water: boolean | null
          refrigerant_temp_c: number | null
          serving_water: boolean | null
          timestamp_utc: string
          treating_water: boolean | null
          water_level_l: number | null
        }
        Insert: {
          ambient_rh_pct?: number | null
          ambient_temp_c?: number | null
          collector_ls1?: number | null
          compressor_on?: number | null
          created_at?: string
          current_a?: number | null
          disinfecting?: boolean | null
          exhaust_temp_c?: number | null
          full_tank?: boolean | null
          id?: string
          machine_id: string
          producing_water?: boolean | null
          refrigerant_temp_c?: number | null
          serving_water?: boolean | null
          timestamp_utc: string
          treating_water?: boolean | null
          water_level_l?: number | null
        }
        Update: {
          ambient_rh_pct?: number | null
          ambient_temp_c?: number | null
          collector_ls1?: number | null
          compressor_on?: number | null
          created_at?: string
          current_a?: number | null
          disinfecting?: boolean | null
          exhaust_temp_c?: number | null
          full_tank?: boolean | null
          id?: string
          machine_id?: string
          producing_water?: boolean | null
          refrigerant_temp_c?: number | null
          serving_water?: boolean | null
          timestamp_utc?: string
          treating_water?: boolean | null
          water_level_l?: number | null
        }
        Relationships: []
      }
      water_production_metrics: {
        Row: {
          average_production_per_cycle: number
          calculation_period_end: string
          calculation_period_start: string
          created_at: string
          id: string
          last_pump_event: string | null
          machine_id: string
          production_rate_lh: number
          pump_cycles_count: number
          total_water_produced: number
          updated_at: string
        }
        Insert: {
          average_production_per_cycle?: number
          calculation_period_end: string
          calculation_period_start: string
          created_at?: string
          id?: string
          last_pump_event?: string | null
          machine_id: string
          production_rate_lh?: number
          pump_cycles_count?: number
          total_water_produced?: number
          updated_at?: string
        }
        Update: {
          average_production_per_cycle?: number
          calculation_period_end?: string
          calculation_period_start?: string
          created_at?: string
          id?: string
          last_pump_event?: string | null
          machine_id?: string
          production_rate_lh?: number
          pump_cycles_count?: number
          total_water_produced?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_demo_sales_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_invitation: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_created_by: string
        }
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "client" | "kumulus_personnel"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["client", "kumulus_personnel"],
    },
  },
} as const
