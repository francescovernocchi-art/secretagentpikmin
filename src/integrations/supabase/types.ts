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
      agent_coins: {
        Row: {
          agent: string
          coins: number
          updated_at: string
        }
        Insert: {
          agent: string
          coins?: number
          updated_at?: string
        }
        Update: {
          agent?: string
          coins?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_positions: {
        Row: {
          accuracy: number | null
          agent_id: string
          agent_name: string
          emoji: string
          lat: number
          lng: number
          role: string
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          agent_id: string
          agent_name: string
          emoji?: string
          lat: number
          lng: number
          role?: string
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          agent_id?: string
          agent_name?: string
          emoji?: string
          lat?: number
          lng?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          pin: string
          role: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          pin: string
          role?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          pin?: string
          role?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          agent: string
          amount: number
          created_at: string
          id: string
          meta: Json | null
          reason: string
        }
        Insert: {
          agent: string
          amount: number
          created_at?: string
          id?: string
          meta?: Json | null
          reason: string
        }
        Update: {
          agent?: string
          amount?: number
          created_at?: string
          id?: string
          meta?: Json | null
          reason?: string
        }
        Relationships: []
      }
      discoveries: {
        Row: {
          agent: string
          created_at: string
          description: string | null
          id: string
          input_a: string | null
          input_b: string | null
          inputs: string[] | null
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
          input_a?: string | null
          input_b?: string | null
          inputs?: string[] | null
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
          input_a?: string | null
          input_b?: string | null
          inputs?: string[] | null
          is_ai?: boolean
          result_emoji?: string
          result_name?: string
          xp?: number
        }
        Relationships: []
      }
      drops: {
        Row: {
          collected_at: string | null
          collected_by: string | null
          created_at: string
          created_by: string
          emoji: string
          id: string
          kind: string
          lat: number
          lng: number
          name: string
          note: string | null
          payload_key: string | null
          radius_m: number
          status: string
          xp: number
        }
        Insert: {
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          created_by?: string
          emoji?: string
          id?: string
          kind?: string
          lat: number
          lng: number
          name: string
          note?: string | null
          payload_key?: string | null
          radius_m?: number
          status?: string
          xp?: number
        }
        Update: {
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          created_by?: string
          emoji?: string
          id?: string
          kind?: string
          lat?: number
          lng?: number
          name?: string
          note?: string | null
          payload_key?: string | null
          radius_m?: number
          status?: string
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
          price_coins: number | null
          rarity: string
          source: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji: string
          key: string
          name: string
          price_coins?: number | null
          rarity?: string
          source?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string
          key?: string
          name?: string
          price_coins?: number | null
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
          coin_reward: number
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          id: string
          proof: string | null
          reward_part_key: string | null
          status: string
          title: string
          xp: number
        }
        Insert: {
          coin_reward?: number
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          id?: string
          proof?: string | null
          reward_part_key?: string | null
          status?: string
          title: string
          xp?: number
        }
        Update: {
          coin_reward?: number
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          id?: string
          proof?: string | null
          reward_part_key?: string | null
          status?: string
          title?: string
          xp?: number
        }
        Relationships: []
      }
      recipe_unlocks: {
        Row: {
          agent: string
          id: string
          recipe_id: string
          unlocked_at: string
        }
        Insert: {
          agent: string
          id?: string
          recipe_id: string
          unlocked_at?: string
        }
        Update: {
          agent?: string
          id?: string
          recipe_id?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          input_a: string | null
          input_b: string | null
          inputs: string[] | null
          locked: boolean
          price_coins: number | null
          result_emoji: string
          result_name: string
          xp: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          input_a?: string | null
          input_b?: string | null
          inputs?: string[] | null
          locked?: boolean
          price_coins?: number | null
          result_emoji: string
          result_name: string
          xp?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          input_a?: string | null
          input_b?: string | null
          inputs?: string[] | null
          locked?: boolean
          price_coins?: number | null
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
      ship_parts: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      ship_parts_collected: {
        Row: {
          collected_at: string
          collected_by: string
          drop_id: string | null
          id: string
          mission_id: string | null
          part_key: string
          source: string
        }
        Insert: {
          collected_at?: string
          collected_by?: string
          drop_id?: string | null
          id?: string
          mission_id?: string | null
          part_key: string
          source?: string
        }
        Update: {
          collected_at?: string
          collected_by?: string
          drop_id?: string | null
          id?: string
          mission_id?: string | null
          part_key?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ship_parts_collected_part_key_fkey"
            columns: ["part_key"]
            isOneToOne: true
            referencedRelation: "ship_parts"
            referencedColumns: ["key"]
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
  public: {
    Enums: {},
  },
} as const
