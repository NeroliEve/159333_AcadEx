export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          id: string
          notes: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string
          course_name: string
          created_at: string
          created_by: string | null
          id: number
          university: string
          university_id: number | null
          updated_at: string
        }
        Insert: {
          course_code: string
          course_name: string
          created_at?: string
          created_by?: string | null
          id?: never
          university: string
          university_id?: number | null
          updated_at?: string
        }
        Update: {
          course_code?: string
          course_name?: string
          created_at?: string
          created_by?: string | null
          id?: never
          university?: string
          university_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          listing_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          listing_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          listing_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          archived_at: string | null
          author: string | null
          condition: Database["public"]["Enums"]["listing_condition"]
          course_id: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          edition: string | null
          id: string
          isbn: string | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          price: number | null
          primary_image_url: string | null
          publisher: string | null
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          study_area_id: number | null
          title: string
          updated_at: string
          wanted_trade_text: string | null
        }
        Insert: {
          archived_at?: string | null
          author?: string | null
          condition: Database["public"]["Enums"]["listing_condition"]
          course_id?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          edition?: string | null
          id?: string
          isbn?: string | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          price?: number | null
          primary_image_url?: string | null
          publisher?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          study_area_id?: number | null
          title: string
          updated_at?: string
          wanted_trade_text?: string | null
        }
        Update: {
          archived_at?: string | null
          author?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"]
          course_id?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          edition?: string | null
          id?: string
          isbn?: string | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price?: number | null
          primary_image_url?: string | null
          publisher?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          study_area_id?: number | null
          title?: string
          updated_at?: string
          wanted_trade_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["profile_account_status"]
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_verified: boolean
          last_name: string
          role: Database["public"]["Enums"]["profile_role"]
          suspended_at: string | null
          suspended_by: string | null
          transactions_seen_at: string | null
          university: string | null
          university_id: number | null
          updated_at: string
          username: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["profile_account_status"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id: string
          is_verified?: boolean
          last_name: string
          role?: Database["public"]["Enums"]["profile_role"]
          suspended_at?: string | null
          suspended_by?: string | null
          transactions_seen_at?: string | null
          university?: string | null
          university_id?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["profile_account_status"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_verified?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["profile_role"]
          suspended_at?: string | null
          suspended_by?: string | null
          transactions_seen_at?: string | null
          university?: string | null
          university_id?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          report_type: Database["public"]["Enums"]["report_type"]
          reported_conversation_id: string | null
          reported_listing_id: string | null
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_id: string | null
          resolution_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          report_type: Database["public"]["Enums"]["report_type"]
          reported_conversation_id?: string | null
          reported_listing_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reported_conversation_id?: string | null
          reported_listing_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_conversation_id_fkey"
            columns: ["reported_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_listing_id_fkey"
            columns: ["reported_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["review_role"]
          transaction_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["review_role"]
          transaction_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          reviewer_role?: Database["public"]["Enums"]["review_role"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_areas: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agreed_price: number | null
          agreed_trade_text: string | null
          buyer_confirmed_completed: boolean
          buyer_id: string
          cancelled_at: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string
          offered_listing_id: string | null
          reservation_confirmed_at: string | null
          reservation_expires_at: string | null
          reservation_requested_at: string
          seller_confirmed_completed: boolean
          seller_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          agreed_trade_text?: string | null
          buyer_confirmed_completed?: boolean
          buyer_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id: string
          offered_listing_id?: string | null
          reservation_confirmed_at?: string | null
          reservation_expires_at?: string | null
          reservation_requested_at?: string
          seller_confirmed_completed?: boolean
          seller_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          agreed_trade_text?: string | null
          buyer_confirmed_completed?: boolean
          buyer_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          offered_listing_id?: string | null
          reservation_confirmed_at?: string | null
          reservation_expires_at?: string | null
          reservation_requested_at?: string
          seller_confirmed_completed?: boolean
          seller_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "universities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_active_admin: {
        Args: never
        Returns: boolean
      }
      is_admin: {
        Args: never
        Returns: boolean
      }
    }
    Enums: {
      listing_condition: "new" | "like_new" | "good" | "fair" | "poor"
      listing_status: "available" | "pending" | "sold" | "archived"
      listing_type: "sale_only" | "trade_only" | "sale_or_trade"
      profile_account_status: "active" | "suspended"
      profile_role: "user" | "admin"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
      report_type: "user" | "listing" | "conversation" | "message"
      review_role: "buyer" | "seller"
      transaction_status: "pending" | "completed" | "cancelled" | "mismatch"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
      )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
    )[TableName] extends { Row: infer RowType }
    ? RowType
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (
      DefaultSchema["Tables"] & DefaultSchema["Views"]
    )
    ? (
        DefaultSchema["Tables"] & DefaultSchema["Views"]
      )[DefaultSchemaTableNameOrOptions] extends { Row: infer RowType }
      ? RowType
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer InsertType
    }
    ? InsertType
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer InsertType
      }
      ? InsertType
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer UpdateType
    }
    ? UpdateType
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer UpdateType
      }
      ? UpdateType
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      listing_condition: ["new", "like_new", "good", "fair", "poor"],
      listing_status: ["available", "pending", "sold", "archived"],
      listing_type: ["sale_only", "trade_only", "sale_or_trade"],
      profile_account_status: ["active", "suspended"],
      profile_role: ["user", "admin"],
      report_status: ["pending", "reviewed", "resolved", "dismissed"],
      report_type: ["user", "listing", "conversation", "message"],
      review_role: ["buyer", "seller"],
      transaction_status: ["pending", "completed", "cancelled", "mismatch"],
    },
  },
} as const

export type TableRow<TableName extends keyof Database["public"]["Tables"]> =
  Tables<TableName>;

export type TableInsert<TableName extends keyof Database["public"]["Tables"]> =
  TablesInsert<TableName>;

export type TableUpdate<TableName extends keyof Database["public"]["Tables"]> =
  TablesUpdate<TableName>;

export type PublicEnum<EnumName extends keyof Database["public"]["Enums"]> =
  Enums<EnumName>;
