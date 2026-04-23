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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      login_attempts: {
        Row: {
          attempted_at: string | null
          id: number
          ip: string | null
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string | null
          id?: number
          ip?: string | null
          succeeded: boolean
        }
        Update: {
          attempted_at?: string | null
          id?: number
          ip?: string | null
          succeeded?: boolean
        }
        Relationships: []
      }
      login_images: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          storage_path?: string
        }
        Relationships: []
      }
      multiplayer_rooms: {
        Row: {
          created_at: string | null
          ended_at: string | null
          host_id: string
          id: string
          quest_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          quest_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          quest_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_rooms_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_sessions: {
        Row: {
          completed_at: string | null
          expires_at: string
          id: string
          player_id: string
          quest_id: string
          started_at: string
          status: string
          task_order: Json | null
        }
        Insert: {
          completed_at?: string | null
          expires_at?: string
          id?: string
          player_id: string
          quest_id: string
          started_at?: string
          status?: string
          task_order?: Json | null
        }
        Update: {
          completed_at?: string | null
          expires_at?: string
          id?: string
          player_id?: string
          quest_id?: string
          started_at?: string
          status?: string
          task_order?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_sessions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_source_images: {
        Row: {
          id: string
          order_idx: number
          quest_id: string
          storage_path: string
        }
        Insert: {
          id?: string
          order_idx: number
          quest_id: string
          storage_path: string
        }
        Update: {
          id?: string
          order_idx?: number
          quest_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_source_images_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_tasks: {
        Row: {
          creator_context: string | null
          description: string
          hidden_criteria: string | null
          id: string
          max_points: number
          order_idx: number
          quest_id: string
          reference_image_path: string | null
          regenerations_used: number
          title: string
        }
        Insert: {
          creator_context?: string | null
          description: string
          hidden_criteria?: string | null
          id?: string
          max_points?: number
          order_idx: number
          quest_id: string
          reference_image_path?: string | null
          regenerations_used?: number
          title: string
        }
        Update: {
          creator_context?: string | null
          description?: string
          hidden_criteria?: string | null
          id?: string
          max_points?: number
          order_idx?: number
          quest_id?: string
          reference_image_path?: string | null
          regenerations_used?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_tasks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          max_players: number | null
          mode: string
          share_token: string
          status: string
          time_limit_sec: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          max_players?: number | null
          mode: string
          share_token: string
          status?: string
          time_limit_sec?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          max_players?: number | null
          mode?: string
          share_token?: string
          status?: string
          time_limit_sec?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          joined_at: string | null
          player_id: string
          room_id: string
          session_id: string
        }
        Insert: {
          joined_at?: string | null
          player_id: string
          room_id: string
          session_id: string
        }
        Update: {
          joined_at?: string | null
          player_id?: string
          room_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quest_leaderboard"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "room_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_session_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          ai_reasoning: string | null
          attempt_no: number
          fraud_reason: string | null
          fraud_suspected: boolean | null
          id: string
          is_match: boolean | null
          match_confidence: number | null
          score: number | null
          session_id: string
          storage_path: string
          submitted_at: string | null
          task_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          attempt_no: number
          fraud_reason?: string | null
          fraud_suspected?: boolean | null
          id?: string
          is_match?: boolean | null
          match_confidence?: number | null
          score?: number | null
          session_id: string
          storage_path: string
          submitted_at?: string | null
          task_id: string
        }
        Update: {
          ai_reasoning?: string | null
          attempt_no?: number
          fraud_reason?: string | null
          fraud_suspected?: boolean | null
          id?: string
          is_match?: boolean | null
          match_confidence?: number | null
          score?: number | null
          session_id?: string
          storage_path?: string
          submitted_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quest_leaderboard"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "task_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "quest_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "quest_tasks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          img_a_id: string
          img_b_id: string
          last_login_at: string | null
          nickname: string | null
          pin_hash: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          img_a_id: string
          img_b_id: string
          last_login_at?: string | null
          nickname?: string | null
          pin_hash: string
        }
        Update: {
          created_at?: string | null
          id?: string
          img_a_id?: string
          img_b_id?: string
          last_login_at?: string | null
          nickname?: string | null
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_img_a_id_fkey"
            columns: ["img_a_id"]
            isOneToOne: false
            referencedRelation: "login_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_img_b_id_fkey"
            columns: ["img_b_id"]
            isOneToOne: false
            referencedRelation: "login_images"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      quest_leaderboard: {
        Row: {
          completed_at: string | null
          duration_sec: number | null
          nickname: string | null
          player_id: string | null
          quest_id: string | null
          rank: number | null
          session_id: string | null
          status: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_sessions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_tasks_public: {
        Row: {
          description: string | null
          id: string | null
          max_points: number | null
          order_idx: number | null
          quest_id: string | null
          reference_image_path: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          max_points?: number | null
          order_idx?: number | null
          quest_id?: string | null
          reference_image_path?: string | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          max_points?: number | null
          order_idx?: number | null
          quest_id?: string | null
          reference_image_path?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_tasks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session_summary: {
        Row: {
          completed_at: string | null
          creator_id: string | null
          duration_sec: number | null
          mode: string | null
          player_id: string | null
          quest_id: string | null
          quest_title: string | null
          session_id: string | null
          started_at: string | null
          status: string | null
          submitted_tasks: number | null
          total_score: number | null
          total_tasks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_sessions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
  public: {
    Enums: {},
  },
} as const
