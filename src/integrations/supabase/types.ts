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
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          payment_id: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_id: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      paywall_events: {
        Row: {
          context: Json | null
          created_at: string
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          id: string
          interval: string
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          id: string
          interval?: string
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          display_name: string | null
          first_payment_at: string | null
          id: string
          is_premium: boolean | null
          last_payment_at: string | null
          last_paywall_dismissed_at: string | null
          last_paywall_shown_at: string | null
          payment_id: string | null
          payment_provider: string | null
          payment_status: string | null
          paywall_dismiss_count_7d: number
          paywall_show_count_7d: number
          plan_type: string
          premium_plan_id: string | null
          premium_since: string | null
          provider_payment_id: string | null
          provider_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_status: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          display_name?: string | null
          first_payment_at?: string | null
          id?: string
          is_premium?: boolean | null
          last_payment_at?: string | null
          last_paywall_dismissed_at?: string | null
          last_paywall_shown_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          paywall_dismiss_count_7d?: number
          paywall_show_count_7d?: number
          plan_type?: string
          premium_plan_id?: string | null
          premium_since?: string | null
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          display_name?: string | null
          first_payment_at?: string | null
          id?: string
          is_premium?: boolean | null
          last_payment_at?: string | null
          last_paywall_dismissed_at?: string | null
          last_paywall_shown_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          paywall_dismiss_count_7d?: number
          paywall_show_count_7d?: number
          plan_type?: string
          premium_plan_id?: string | null
          premium_since?: string | null
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          plan: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          plan: string
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          plan?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_cancellation_feedback: {
        Row: {
          created_at: string
          final_action: string | null
          had_issues: boolean | null
          id: string
          is_within_7_days: boolean | null
          issue_details: string | null
          nps: number | null
          plan_type: string | null
          price: number | null
          provider: string | null
          provider_payload: Json | null
          provider_payment_id: string | null
          provider_subscription_id: string | null
          reason_details: string | null
          reason_primary: string
          refund_status: string | null
          retention_offer_accepted: boolean | null
          retention_offer_shown: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          final_action?: string | null
          had_issues?: boolean | null
          id?: string
          is_within_7_days?: boolean | null
          issue_details?: string | null
          nps?: number | null
          plan_type?: string | null
          price?: number | null
          provider?: string | null
          provider_payload?: Json | null
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          reason_details?: string | null
          reason_primary: string
          refund_status?: string | null
          retention_offer_accepted?: boolean | null
          retention_offer_shown?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          final_action?: string | null
          had_issues?: boolean | null
          id?: string
          is_within_7_days?: boolean | null
          issue_details?: string | null
          nps?: number | null
          plan_type?: string | null
          price?: number | null
          provider?: string | null
          provider_payload?: Json | null
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          reason_details?: string | null
          reason_primary?: string
          refund_status?: string | null
          retention_offer_accepted?: boolean | null
          retention_offer_shown?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tutorial_assets: {
        Row: {
          created_at: string
          id: string
          image_url: string
          intervention_type: string
          key: string
          locale: string
          prompt_hash: string
          step_index: number
          style: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          intervention_type: string
          key: string
          locale?: string
          prompt_hash: string
          step_index: number
          style?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          intervention_type?: string
          key?: string
          locale?: string
          prompt_hash?: string
          step_index?: number
          style?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      user_data: {
        Row: {
          analysis_history: Json | null
          created_at: string
          id: string
          last_analysis_score: number | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_history?: Json | null
          created_at?: string
          id?: string
          last_analysis_score?: number | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_history?: Json | null
          created_at?: string
          id?: string
          last_analysis_score?: number | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notification_id: string | null
          payload: Json | null
          processed_at: string | null
          provider: string
          request_id: string | null
          resource_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          notification_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider: string
          request_id?: string | null
          resource_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notification_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          request_id?: string | null
          resource_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: { Args: { requester_uid: string }; Returns: Json }
      ban_user: {
        Args: { reason?: string; target_user_id: string }
        Returns: Json
      }
      block_user: { Args: { target_uid: string }; Returns: Json }
      cancel_friend_request: { Args: { target_uid: string }; Returns: Json }
      get_admin_purchases: {
        Args: never
        Returns: {
          amount_cents: number
          created_at: string
          email: string
          id: string
          payment_method: string
          plan: string
          provider: string
          status: string
          user_id: string
          username: string
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          banned: boolean
          banned_at: string
          banned_reason: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_premium: boolean
          is_ugc: boolean
          plan_type: string
          subscription_expires_at: string
          subscription_status: string
          username: string
        }[]
      }
      grant_premium: {
        Args: { plan?: string; target_user_id: string }
        Returns: Json
      }
      grant_ugc: { Args: { target_user_id: string }; Returns: Json }
      reject_friend_request: { Args: { requester_uid: string }; Returns: Json }
      revoke_ugc: { Args: { target_user_id: string }; Returns: Json }
      search_users: {
        Args: {
          limit_count?: number
          offset_count?: number
          search_query: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          friendship_status: string
          full_name: string
          id: string
          public_id: string
          short_id: string
          username: string
        }[]
      }
      send_friend_request: { Args: { target_user_id: string }; Returns: Json }
      unban_user: { Args: { target_user_id: string }; Returns: Json }
      unblock_user: { Args: { target_uid: string }; Returns: Json }
      unfriend: { Args: { target_uid: string }; Returns: Json }
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
