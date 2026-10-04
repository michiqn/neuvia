export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      content_bubble_completions: {
        Row: {
          completed_at: string
          content_bubble_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          content_bubble_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          content_bubble_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_bubble_completions_content_bubble_id_fkey"
            columns: ["content_bubble_id"]
            isOneToOne: false
            referencedRelation: "content_bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_bubbles: {
        Row: {
          content: string | null
          created_at: string
          id: string
          milestone_id: string
          next_topic: string | null
          order_index: number
          suggested_topic: string | null
          title: string
          updated_at: string
          user_topic_input: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          milestone_id: string
          next_topic?: string | null
          order_index?: number
          suggested_topic?: string | null
          title: string
          updated_at?: string
          user_topic_input?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          milestone_id?: string
          next_topic?: string | null
          order_index?: number
          suggested_topic?: string | null
          title?: string
          updated_at?: string
          user_topic_input?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_bubbles_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      content_chat_messages: {
        Row: {
          content_bubble_id: string
          created_at: string
          id: string
          message: string
          role: string
          user_id: string
        }
        Insert: {
          content_bubble_id: string
          created_at?: string
          id?: string
          message: string
          role: string
          user_id: string
        }
        Update: {
          content_bubble_id?: string
          created_at?: string
          id?: string
          message?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_chat_messages_content_bubble_id_fkey"
            columns: ["content_bubble_id"]
            isOneToOne: false
            referencedRelation: "content_bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          description: string | null
          id: string
          screen_size: string | null
          title: string
          type: string
          url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          screen_size?: string | null
          title: string
          type: string
          url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          screen_size?: string | null
          title?: string
          type?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          category: string
          created_at: string
          front: string
          id: string
          interaction_id: string
          order_index: number
        }
        Insert: {
          back: string
          category?: string
          created_at?: string
          front: string
          id?: string
          interaction_id: string
          order_index?: number
        }
        Update: {
          back?: string
          category?: string
          created_at?: string
          front?: string
          id?: string
          interaction_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_summaries: {
        Row: {
          content_bubble_id: string
          created_at: string
          id: string
          interaction_id: string
          interaction_type: string
          summary_sentence: string
          updated_at: string
        }
        Insert: {
          content_bubble_id: string
          created_at?: string
          id?: string
          interaction_id: string
          interaction_type: string
          summary_sentence: string
          updated_at?: string
        }
        Update: {
          content_bubble_id?: string
          created_at?: string
          id?: string
          interaction_id?: string
          interaction_type?: string
          summary_sentence?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_summaries_content_bubble_id_fkey"
            columns: ["content_bubble_id"]
            isOneToOne: false
            referencedRelation: "content_bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_summaries_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: true
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          content_bubble_id: string
          created_at: string
          id: string
          order_index: number
          type: string
          updated_at: string
        }
        Insert: {
          content_bubble_id: string
          created_at?: string
          id?: string
          order_index?: number
          type: string
          updated_at?: string
        }
        Update: {
          content_bubble_id?: string
          created_at?: string
          id?: string
          order_index?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_content_bubble_id_fkey"
            columns: ["content_bubble_id"]
            isOneToOne: false
            referencedRelation: "content_bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      iow_completions: {
        Row: {
          answer_quality_score: number | null
          completed_at: string
          id: string
          iow_entry_id: string
          user_id: string
        }
        Insert: {
          answer_quality_score?: number | null
          completed_at?: string
          id?: string
          iow_entry_id: string
          user_id: string
        }
        Update: {
          answer_quality_score?: number | null
          completed_at?: string
          id?: string
          iow_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iow_completions_iow_entry_id_fkey"
            columns: ["iow_entry_id"]
            isOneToOne: false
            referencedRelation: "iow_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      iow_entries: {
        Row: {
          answer: string
          created_at: string
          id: string
          interaction_id: string
          order_index: number
          question: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          interaction_id: string
          order_index?: number
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          interaction_id?: string
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "iow_entries_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          context: string | null
          created_at: string
          current_milestone_index: number
          curriculum: string | null
          goal: string
          id: string
          progression_context: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          current_milestone_index?: number
          curriculum?: string | null
          goal: string
          id?: string
          progression_context?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          current_milestone_index?: number
          curriculum?: string | null
          goal?: string
          id?: string
          progression_context?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          custom_topic_request: string | null
          description: string | null
          first_topic: string | null
          id: string
          is_completed: boolean
          is_custom_request: boolean
          learning_path_id: string
          milestone_status: string
          order_index: number
          started_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          custom_topic_request?: string | null
          description?: string | null
          first_topic?: string | null
          id?: string
          is_completed?: boolean
          is_custom_request?: boolean
          learning_path_id: string
          milestone_status?: string
          order_index?: number
          started_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          custom_topic_request?: string | null
          description?: string | null
          first_topic?: string | null
          id?: string
          is_completed?: boolean
          is_custom_request?: boolean
          learning_path_id?: string
          milestone_status?: string
          order_index?: number
          started_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          attempted_at: string
          id: string
          is_correct: boolean
          quiz_question_id: string
          selected_answer: number
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          is_correct: boolean
          quiz_question_id: string
          selected_answer: number
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          is_correct?: boolean
          quiz_question_id?: string
          selected_answer?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_question_id_fkey"
            columns: ["quiz_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          answers: Json
          correct_answer: number
          created_at: string
          id: string
          interaction_id: string
          order_index: number
          question: string
        }
        Insert: {
          answers?: Json
          correct_answer?: number
          created_at?: string
          id?: string
          interaction_id: string
          order_index?: number
          question: string
        }
        Update: {
          answers?: Json
          correct_answer?: number
          created_at?: string
          id?: string
          interaction_id?: string
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          content: string
          content_bubble_id: string | null
          created_at: string
          id: string
          interaction_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          content_bubble_id?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_bubble_id?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_content_bubble_id_fkey"
            columns: ["content_bubble_id"]
            isOneToOne: false
            referencedRelation: "content_bubbles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

