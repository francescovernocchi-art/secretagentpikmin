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
      discoveries: {
        Row: {
          agent: string
          created_at: string
          description: string | null
          id: string
          input_a: string
          input_b: string
          is_ai: boolean
          result_emoji: string
          result_name: string
          xp: number
        }
        Insert: {
          agent?: string
          created_at?: string
          description?: string | null
          id?: string
          input_a: string
          input_b: string
          is_ai?: boolean
          result_emoji: string
          result_name: string
          xp?: number
        }
        Update: {
          agent?: string
          created_at?: string
          description?: string | null
          id?: string
          input_a?: string
          input_b?: string
          is_ai?: boolean
          result_emoji?: string
          result_name?: string
          xp?: number
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          color: string | null
          created_at: string
          emoji: string
          key: string
          name: string
          rarity: string
          source: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji: string
          key: string
          name: string
          rarity?: string
          source?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string
          key?: string
          name?: string
          rarity?: string
          source?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          agent: string
          id: string
          ingredient_key: string
          qty: number
          updated_at: string
        }
        Insert: {
          agent?: string
          id?: string
          ingredient_key: string
          qty?: number
          updated_at?: string
        }
        Update: {
          agent?: string
          id?: string
          ingredient_key?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ingredient_key_fkey"
            columns: ["ingredient_key"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["key"]
          },
        ]
      }
      memories: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender?: string
          type?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          id: string
          proof: string | null
          status: string
          title: string
          xp: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          id?: string
          proof?: string | null
          status?: string
          title: string
          xp?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          id?: string
          proof?: string | null
          status?: string
          title?: string
          xp?: number
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          input_a: string
          input_b: string
          result_emoji: string
          result_name: string
          xp: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          input_a: string
          input_b: string
          result_emoji: string
          result_name: string
          xp?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          input_a?: string
          input_b?: string
          result_emoji?: string
          result_name?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_input_a_fkey"
            columns: ["input_a"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "recipes_input_b_fkey"
            columns: ["input_b"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["key"]
          },
        ]
      }
      rewards: {
        Row: {
          agent: string
          badge: string
          created_at: string
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          agent?: string
          badge: string
          created_at?: string
          icon?: string | null
          id?: string
          title: string
        }
        Update: {
          agent?: string
          badge?: string
          created_at?: string
          icon?: string | null
          id?: string
          title?: string
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
