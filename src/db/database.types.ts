export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      ai_generated_cards: {
        Row: {
          accepted: boolean;
          accepted_at: string | null;
          answer: string;
          card_id: string | null;
          created_at: string;
          generation_id: string;
          id: string;
          question: string;
          user_id: string;
        };
        Insert: {
          accepted?: boolean;
          accepted_at?: string | null;
          answer: string;
          card_id?: string | null;
          created_at?: string;
          generation_id: string;
          id?: string;
          question: string;
          user_id: string;
        };
        Update: {
          accepted?: boolean;
          accepted_at?: string | null;
          answer?: string;
          card_id?: string | null;
          created_at?: string;
          generation_id?: string;
          id?: string;
          question?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generated_cards_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: true;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generated_cards_generation_user_fkey";
            columns: ["generation_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      ai_generation_attempts: {
        Row: {
          advisory_lock_key: number | null;
          created_at: string;
          error_code: string | null;
          generation_id: string | null;
          id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          advisory_lock_key?: number | null;
          created_at?: string;
          error_code?: string | null;
          generation_id?: string | null;
          id?: string;
          status: string;
          user_id: string;
        };
        Update: {
          advisory_lock_key?: number | null;
          created_at?: string;
          error_code?: string | null;
          generation_id?: string | null;
          id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generation_attempts_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_generations: {
        Row: {
          completed_at: string | null;
          created_at: string;
          error_code: string | null;
          id: string;
          meta: Json | null;
          model: string | null;
          prompt: string;
          raw_response: Json | null;
          status: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          meta?: Json | null;
          model?: string | null;
          prompt: string;
          raw_response?: Json | null;
          status: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          meta?: Json | null;
          model?: string | null;
          prompt?: string;
          raw_response?: Json | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      card_issue_reports: {
        Row: {
          card_id: string;
          created_at: string;
          description: string;
          id: string;
          resolution_notes: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          description: string;
          id?: string;
          resolution_notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          resolution_notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_issue_reports_card_user_fkey";
            columns: ["card_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      card_reviews: {
        Row: {
          card_id: string;
          id: string;
          new_box: number;
          prev_box: number;
          response_ms: number | null;
          result: Database["public"]["Enums"]["card_review_result"];
          reviewed_at: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          id?: string;
          new_box: number;
          prev_box: number;
          response_ms?: number | null;
          result: Database["public"]["Enums"]["card_review_result"];
          reviewed_at?: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          id?: string;
          new_box?: number;
          prev_box?: number;
          response_ms?: number | null;
          result?: Database["public"]["Enums"]["card_review_result"];
          reviewed_at?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_reviews_card_user_fkey";
            columns: ["card_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "card_reviews_session_user_fkey";
            columns: ["session_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      cards: {
        Row: {
          answer: string;
          created_at: string;
          deck_id: string;
          due_at: string;
          id: string;
          last_reviewed_at: string | null;
          leitner_box: number;
          origin: string;
          question: string;
          question_normalized: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          deck_id: string;
          due_at?: string;
          id?: string;
          last_reviewed_at?: string | null;
          leitner_box?: number;
          origin?: string;
          question: string;
          question_normalized?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          deck_id?: string;
          due_at?: string;
          id?: string;
          last_reviewed_at?: string | null;
          leitner_box?: number;
          origin?: string;
          question?: string;
          question_normalized?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cards_deck_user_fkey";
            columns: ["deck_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "decks";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      deck_stats: {
        Row: {
          cards_total: number;
          deck_id: string;
          due_count: number;
          last_calculated_at: string;
          user_id: string;
        };
        Insert: {
          cards_total?: number;
          deck_id: string;
          due_count?: number;
          last_calculated_at?: string;
          user_id: string;
        };
        Update: {
          cards_total?: number;
          deck_id?: string;
          due_count?: number;
          last_calculated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deck_stats_deck_user_fkey";
            columns: ["deck_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "decks";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      decks: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          cards_reviewed: number;
          deck_id: string;
          dont_know_count: number;
          ended_at: string | null;
          id: string;
          know_count: number;
          started_at: string;
          user_id: string;
        };
        Insert: {
          cards_reviewed?: number;
          deck_id: string;
          dont_know_count?: number;
          ended_at?: string | null;
          id?: string;
          know_count?: number;
          started_at?: string;
          user_id: string;
        };
        Update: {
          cards_reviewed?: number;
          deck_id?: string;
          dont_know_count?: number;
          ended_at?: string | null;
          id?: string;
          know_count?: number;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_deck_user_fkey";
            columns: ["deck_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "decks";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      apply_review: {
        Args: {
          p_card_id: string;
          p_result: Database["public"]["Enums"]["card_review_result"];
        };
        Returns: undefined;
      };
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown };
        Returns: string;
      };
      citext_hash: {
        Args: { "": string };
        Returns: number;
      };
      citextin: {
        Args: { "": unknown };
        Returns: string;
      };
      citextout: {
        Args: { "": string };
        Returns: unknown;
      };
      citextrecv: {
        Args: { "": unknown };
        Returns: string;
      };
      citextsend: {
        Args: { "": string };
        Returns: string;
      };
      enforce_ai_attempt_quota: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      refresh_deck_stats: {
        Args: { p_deck_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      card_review_result: "know" | "dont_know";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      card_review_result: ["know", "dont_know"],
    },
  },
} as const;
