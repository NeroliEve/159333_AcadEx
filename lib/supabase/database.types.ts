export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      reviews: {
        Row: {
          id: string;
          transaction_id: string;
          reviewer_id: string;
          reviewee_id: string;
          reviewer_role: Database["public"]["Enums"]["review_role"];
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          reviewer_id: string;
          reviewee_id: string;
          reviewer_role: Database["public"]["Enums"]["review_role"];
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          reviewer_role?: Database["public"]["Enums"]["review_role"];
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          course_code: string;
          course_name: string;
          created_at: string;
          created_by: string | null;
          id: number;
          university: string;
          university_id: number | null;
          updated_at: string;
        };
        Insert: {
          course_code: string;
          course_name: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          university: string;
          university_id?: number | null;
          updated_at?: string;
        };
        Update: {
          course_code?: string;
          course_name?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          university?: string;
          university_id?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          is_primary: boolean;
          listing_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          is_primary?: boolean;
          listing_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          is_primary?: boolean;
          listing_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          archived_at: string | null;
          author: string | null;
          condition: Database["public"]["Enums"]["listing_condition"];
          course_id: number | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          edition: string | null;
          id: string;
          isbn: string | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          price: number | null;
          primary_image_url: string | null;
          publisher: string | null;
          seller_id: string;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          study_area_id: number | null;
          wanted_trade_text: string | null;
        };
        Insert: {
          archived_at?: string | null;
          author?: string | null;
          condition: Database["public"]["Enums"]["listing_condition"];
          course_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          edition?: string | null;
          id?: string;
          isbn?: string | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          price?: number | null;
          primary_image_url?: string | null;
          publisher?: string | null;
          seller_id: string;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at?: string;
          study_area_id?: number | null;
          wanted_trade_text?: string | null;
        };
        Update: {
          archived_at?: string | null;
          author?: string | null;
          condition?: Database["public"]["Enums"]["listing_condition"];
          course_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          edition?: string | null;
          id?: string;
          isbn?: string | null;
          listing_type?: Database["public"]["Enums"]["listing_type"];
          price?: number | null;
          primary_image_url?: string | null;
          publisher?: string | null;
          seller_id?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          updated_at?: string;
          study_area_id?: number | null;
          wanted_trade_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listings_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_study_area_id_fkey";
            columns: ["study_area_id"];
            isOneToOne: false;
            referencedRelation: "study_areas";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          is_verified: boolean;
          last_name: string;
          role: Database["public"]["Enums"]["profile_role"];
          university: string | null;
          university_id: number | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          first_name: string;
          id: string;
          is_verified?: boolean;
          last_name: string;
          role?: Database["public"]["Enums"]["profile_role"];
          university?: string | null;
          university_id?: number | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          is_verified?: boolean;
          last_name?: string;
          role?: Database["public"]["Enums"]["profile_role"];
          university?: string | null;
          university_id?: number | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      study_areas: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          listing_id: string;
          conversation_id: string | null;
          buyer_id: string;
          seller_id: string;
          agreed_price: number | null;
          agreed_trade_text: string | null;
          status: Database["public"]["Enums"]["transaction_status"];
          buyer_confirmed_completed: boolean;
          seller_confirmed_completed: boolean;
          reservation_requested_at: string | null;
          reservation_confirmed_at: string | null;
          reservation_expires_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          conversation_id?: string | null;
          buyer_id: string;
          seller_id: string;
          agreed_price?: number | null;
          agreed_trade_text?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          buyer_confirmed_completed?: boolean;
          seller_confirmed_completed?: boolean;
          reservation_requested_at?: string | null;
          reservation_confirmed_at?: string | null;
          reservation_expires_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          conversation_id?: string | null;
          buyer_id?: string;
          seller_id?: string;
          agreed_price?: number | null;
          agreed_trade_text?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          buyer_confirmed_completed?: boolean;
          seller_confirmed_completed?: boolean;
          reservation_requested_at?: string | null;
          reservation_confirmed_at?: string | null;
          reservation_expires_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      universities: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: number;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "universities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      listing_condition: "new" | "like_new" | "good" | "fair" | "poor";
      listing_status: "available" | "pending" | "sold" | "archived";
      listing_type: "sale_only" | "trade_only" | "sale_or_trade";
      profile_role: "user" | "admin";
      transaction_status: "pending" | "completed" | "cancelled" | "mismatch";
      review_role: "buyer" | "seller";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type TableRow<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];

export type TableInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Insert"];

export type PublicEnum<EnumName extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][EnumName];
