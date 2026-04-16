export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
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
