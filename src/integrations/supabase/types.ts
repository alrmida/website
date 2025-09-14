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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      daily_production_summary: {
        Row: {
          created_at: string
          date: string
          disconnected_percentage: number
          drainage_events_count: number
          first_event_time: string | null
          full_water_percentage: number
          id: string
          idle_percentage: number
          last_event_time: string | null
          machine_id: string
          producing_percentage: number
          production_events_count: number
          total_production_liters: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id?: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_ingestion_logs: {
        Row: {
          created_at: string
          data_freshness_minutes: number | null
          data_timestamp: string | null
          error_details: string | null
          id: string
          influx_query: string | null
          influx_response_size: number | null
          log_type: string
          machine_id: string
          message: string
        }
        Insert: {
          created_at?: string
          data_freshness_minutes?: number | null
          data_timestamp?: string | null
          error_details?: string | null
          id?: string
          influx_query?: string | null
          influx_response_size?: number | null
          log_type: string
          machine_id: string
          message: string
        }
        Update: {
          created_at?: string
          data_freshness_minutes?: number | null
          data_timestamp?: string | null
          error_details?: string | null
          id?: string
          influx_query?: string | null
          influx_response_size?: number | null
          log_type?: string
          machine_id?: string
          message?: string
        }
        Relationships: []
      }
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
      machine_microcontrollers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          machine_id: number
          microcontroller_uid: string
          notes: string | null
          unassigned_at: string | null
          unassigned_by: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          machine_id: number
          microcontroller_uid: string
          notes?: string | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          machine_id?: number
          microcontroller_uid?: string
          notes?: string | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_microcontrollers_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_production_totals: {
        Row: {
          created_at: string
          id: string
          last_production_event_id: string | null
          last_updated: string
          machine_id: string
          total_production_liters: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_production_event_id?: string | null
          last_updated?: string
          machine_id: string
          total_production_liters?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_production_event_id?: string | null
          last_updated?: string
          machine_id?: string
          total_production_liters?: number
          updated_at?: string
        }
        Relationships: []
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
      monthly_production_summary: {
        Row: {
          created_at: string
          disconnected_percentage: number
          drainage_events_count: number
          first_event_time: string | null
          full_water_percentage: number
          id: string
          idle_percentage: number
          last_event_time: string | null
          machine_id: string
          month: number
          month_year: string
          producing_percentage: number
          production_events_count: number
          total_production_liters: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id: string
          month: number
          month_year: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id?: string
          month?: number
          month_year?: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
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
          defrosting: boolean | null
          disinfecting: boolean | null
          eev_position: number | null
          exhaust_rh_pct: number | null
          exhaust_temp_c: number | null
          frost_identified: boolean | null
          full_tank: boolean | null
          id: string
          ingestion_source: string
          machine_id: string
          producing_water: boolean | null
          refrigerant_temp_c: number | null
          serving_water: boolean | null
          time_seconds: number | null
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
          defrosting?: boolean | null
          disinfecting?: boolean | null
          eev_position?: number | null
          exhaust_rh_pct?: number | null
          exhaust_temp_c?: number | null
          frost_identified?: boolean | null
          full_tank?: boolean | null
          id?: string
          ingestion_source?: string
          machine_id: string
          producing_water?: boolean | null
          refrigerant_temp_c?: number | null
          serving_water?: boolean | null
          time_seconds?: number | null
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
          defrosting?: boolean | null
          disinfecting?: boolean | null
          eev_position?: number | null
          exhaust_rh_pct?: number | null
          exhaust_temp_c?: number | null
          frost_identified?: boolean | null
          full_tank?: boolean | null
          id?: string
          ingestion_source?: string
          machine_id?: string
          producing_water?: boolean | null
          refrigerant_temp_c?: number | null
          serving_water?: boolean | null
          time_seconds?: number | null
          timestamp_utc?: string
          treating_water?: boolean | null
          water_level_l?: number | null
        }
        Relationships: []
      }
      simple_water_snapshots: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          timestamp_utc: string
          water_level_l: number
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          timestamp_utc?: string
          water_level_l: number
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          timestamp_utc?: string
          water_level_l?: number
        }
        Relationships: []
      }
      water_level_snapshots: {
        Row: {
          created_at: string
          full_tank: boolean | null
          id: string
          machine_id: string
          machine_status: string | null
          timestamp_utc: string
          water_level_l: number | null
        }
        Insert: {
          created_at?: string
          full_tank?: boolean | null
          id?: string
          machine_id: string
          machine_status?: string | null
          timestamp_utc: string
          water_level_l?: number | null
        }
        Update: {
          created_at?: string
          full_tank?: boolean | null
          id?: string
          machine_id?: string
          machine_status?: string | null
          timestamp_utc?: string
          water_level_l?: number | null
        }
        Relationships: []
      }
      water_production_events: {
        Row: {
          created_at: string
          current_level: number
          event_type: string | null
          id: string
          machine_id: string
          previous_level: number
          production_liters: number
          timestamp_utc: string
        }
        Insert: {
          created_at?: string
          current_level: number
          event_type?: string | null
          id?: string
          machine_id: string
          previous_level: number
          production_liters: number
          timestamp_utc?: string
        }
        Update: {
          created_at?: string
          current_level?: number
          event_type?: string | null
          id?: string
          machine_id?: string
          previous_level?: number
          production_liters?: number
          timestamp_utc?: string
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
      water_production_periods: {
        Row: {
          created_at: string
          full_tank_end: boolean | null
          full_tank_start: boolean | null
          id: string
          machine_id: string
          period_end: string
          period_start: string
          period_status: string
          production_liters: number | null
          water_level_end: number | null
          water_level_start: number | null
        }
        Insert: {
          created_at?: string
          full_tank_end?: boolean | null
          full_tank_start?: boolean | null
          id?: string
          machine_id: string
          period_end: string
          period_start: string
          period_status?: string
          production_liters?: number | null
          water_level_end?: number | null
          water_level_start?: number | null
        }
        Update: {
          created_at?: string
          full_tank_end?: boolean | null
          full_tank_start?: boolean | null
          id?: string
          machine_id?: string
          period_end?: string
          period_start?: string
          period_status?: string
          production_liters?: number | null
          water_level_end?: number | null
          water_level_start?: number | null
        }
        Relationships: []
      }
      weekly_production_summary: {
        Row: {
          created_at: string
          disconnected_percentage: number
          drainage_events_count: number
          first_event_time: string | null
          full_water_percentage: number
          id: string
          idle_percentage: number
          last_event_time: string | null
          machine_id: string
          producing_percentage: number
          production_events_count: number
          total_production_liters: number
          updated_at: string
          week_number: number
          week_start: string
          week_year: number
        }
        Insert: {
          created_at?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
          week_number: number
          week_start: string
          week_year: number
        }
        Update: {
          created_at?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id?: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
          week_number?: number
          week_start?: string
          week_year?: number
        }
        Relationships: []
      }
      yearly_production_summary: {
        Row: {
          created_at: string
          disconnected_percentage: number
          drainage_events_count: number
          first_event_time: string | null
          full_water_percentage: number
          id: string
          idle_percentage: number
          last_event_time: string | null
          machine_id: string
          producing_percentage: number
          production_events_count: number
          total_production_liters: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          disconnected_percentage?: number
          drainage_events_count?: number
          first_event_time?: string | null
          full_water_percentage?: number
          id?: string
          idle_percentage?: number
          last_event_time?: string | null
          machine_id?: string
          producing_percentage?: number
          production_events_count?: number
          total_production_liters?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_contact_email?: string
          p_contact_phone?: string
          p_email: string
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_username: string
        }
        Returns: string
      }
      admin_delete_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_update_user_profile: {
        Args: {
          p_contact_email?: string
          p_contact_phone?: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
          p_username: string
        }
        Returns: undefined
      }
      assign_microcontroller_uid: {
        Args: {
          p_assigned_by?: string
          p_machine_id: number
          p_microcontroller_uid: string
          p_notes?: string
        }
        Returns: string
      }
      create_demo_sales_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_invitation: {
        Args: {
          p_created_by: string
          p_email: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_microcontroller_uid: {
        Args: { p_machine_id: number }
        Returns: string
      }
      get_machine_id_from_uid: {
        Args: { p_uid: string }
        Returns: number
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_with_auth_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_email: string
          contact_email: string
          contact_phone: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          username: string
        }[]
      }
      reset_machine_metrics: {
        Args: { p_admin_user_id: string; p_machine_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "client" | "kumulus_personnel" | "kumulus_admin"
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
      user_role: ["client", "kumulus_personnel", "kumulus_admin"],
    },
  },
} as const
