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
          role: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      audio_assets: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          kind: string
          loop: boolean
          name: string
          page: string | null
          updated_at: string
          url: string
          volume: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          kind?: string
          loop?: boolean
          name: string
          page?: string | null
          updated_at?: string
          url: string
          volume?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          kind?: string
          loop?: boolean
          name?: string
          page?: string | null
          updated_at?: string
          url?: string
          volume?: number
        }
        Relationships: []
      }
      base_buildings: {
        Row: {
          agent: string
          build_end_at: string | null
          created_at: string
          id: string
          level: number
          position_x: number
          position_y: number
          started_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          agent: string
          build_end_at?: string | null
          created_at?: string
          id?: string
          level?: number
          position_x?: number
          position_y?: number
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          agent?: string
          build_end_at?: string | null
          created_at?: string
          id?: string
          level?: number
          position_x?: number
          position_y?: number
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      base_events: {
        Row: {
          agent: string
          created_at: string
          id: string
          payload: Json
          type: string
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          payload?: Json
          type: string
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          payload?: Json
          type?: string
        }
        Relationships: []
      }
      base_gifts: {
        Row: {
          claimed_at: string | null
          created_at: string
          from_agent: string
          id: string
          message: string | null
          payload: Json
          to_agent: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          from_agent: string
          id?: string
          message?: string | null
          payload?: Json
          to_agent: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          from_agent?: string
          id?: string
          message?: string | null
          payload?: Json
          to_agent?: string
        }
        Relationships: []
      }
      bases: {
        Row: {
          action_radius: number
          agent: string
          base_name: string
          created_at: string
          defense_rating: number
          energy_current: number
          energy_max: number
          faction: string | null
          lat: number | null
          layout: Json
          level: number
          lng: number | null
          name: string
          theme: string
          threat_radius: number
          updated_at: string
          xp: number
        }
        Insert: {
          action_radius?: number
          agent: string
          base_name?: string
          created_at?: string
          defense_rating?: number
          energy_current?: number
          energy_max?: number
          faction?: string | null
          lat?: number | null
          layout?: Json
          level?: number
          lng?: number | null
          name?: string
          theme?: string
          threat_radius?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          action_radius?: number
          agent?: string
          base_name?: string
          created_at?: string
          defense_rating?: number
          energy_current?: number
          energy_max?: number
          faction?: string | null
          lat?: number | null
          layout?: Json
          level?: number
          lng?: number | null
          name?: string
          theme?: string
          threat_radius?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      battle_logs: {
        Row: {
          agent: string
          created_at: string
          enemy_id: string | null
          enemy_name: string
          id: string
          pikmin_lost: Json
          pikmin_sent: Json
          result: string
          rewards: Json
          summary: string | null
        }
        Insert: {
          agent?: string
          created_at?: string
          enemy_id?: string | null
          enemy_name: string
          id?: string
          pikmin_lost?: Json
          pikmin_sent?: Json
          result: string
          rewards?: Json
          summary?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          enemy_id?: string | null
          enemy_name?: string
          id?: string
          pikmin_lost?: Json
          pikmin_sent?: Json
          result?: string
          rewards?: Json
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_logs_enemy_id_fkey"
            columns: ["enemy_id"]
            isOneToOne: false
            referencedRelation: "enemies"
            referencedColumns: ["id"]
          },
        ]
      }
      building_catalog: {
        Row: {
          base_cost_coins: number
          base_cost_ingredients: Json
          base_duration_minutes: number
          bonus_per_level: Json
          category: string
          description: string | null
          emoji: string
          faction_required: string | null
          image_url: string | null
          key: string
          max_level: number
          name: string
          sort_order: number
          visual_stages: Json
        }
        Insert: {
          base_cost_coins?: number
          base_cost_ingredients?: Json
          base_duration_minutes?: number
          bonus_per_level?: Json
          category?: string
          description?: string | null
          emoji?: string
          faction_required?: string | null
          image_url?: string | null
          key: string
          max_level?: number
          name: string
          sort_order?: number
          visual_stages?: Json
        }
        Update: {
          base_cost_coins?: number
          base_cost_ingredients?: Json
          base_duration_minutes?: number
          bonus_per_level?: Json
          category?: string
          description?: string | null
          emoji?: string
          faction_required?: string | null
          image_url?: string | null
          key?: string
          max_level?: number
          name?: string
          sort_order?: number
          visual_stages?: Json
        }
        Relationships: []
      }
      card_unlocks: {
        Row: {
          agent: string
          card_id: string
          id: string
          source: string
          unlocked_at: string
        }
        Insert: {
          agent: string
          card_id: string
          id?: string
          source?: string
          unlocked_at?: string
        }
        Update: {
          agent?: string
          card_id?: string
          id?: string
          source?: string
          unlocked_at?: string
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
      collectible_cards: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          key: string
          metadata: Json
          name: string
          rarity: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          key: string
          metadata?: Json
          name: string
          rarity?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          key?: string
          metadata?: Json
          name?: string
          rarity?: string
          sort_order?: number
          updated_at?: string
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
      enemies: {
        Row: {
          activity_period: string
          behavior: string | null
          created_at: string
          damage: number
          danger_level: number
          description: string | null
          emoji: string
          habitat: string | null
          hp: number
          id: string
          image_url: string | null
          key: string
          name: string
          pikmin_eat_max: number
          pikmin_eat_min: number
          recommended_pikmin: string[]
          source_url: string | null
          spawn_probability: number
          speed: string | null
          updated_at: string
        }
        Insert: {
          activity_period?: string
          behavior?: string | null
          created_at?: string
          damage?: number
          danger_level?: number
          description?: string | null
          emoji?: string
          habitat?: string | null
          hp?: number
          id?: string
          image_url?: string | null
          key: string
          name: string
          pikmin_eat_max?: number
          pikmin_eat_min?: number
          recommended_pikmin?: string[]
          source_url?: string | null
          spawn_probability?: number
          speed?: string | null
          updated_at?: string
        }
        Update: {
          activity_period?: string
          behavior?: string | null
          created_at?: string
          damage?: number
          danger_level?: number
          description?: string | null
          emoji?: string
          habitat?: string | null
          hp?: number
          id?: string
          image_url?: string | null
          key?: string
          name?: string
          pikmin_eat_max?: number
          pikmin_eat_min?: number
          recommended_pikmin?: string[]
          source_url?: string | null
          spawn_probability?: number
          speed?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expedition_squads: {
        Row: {
          agent: string
          breakdown: Json
          confirmed: boolean
          expedition_id: string
          id: string
          joined_at: string
          pikmin_total: number
        }
        Insert: {
          agent: string
          breakdown?: Json
          confirmed?: boolean
          expedition_id: string
          id?: string
          joined_at?: string
          pikmin_total?: number
        }
        Update: {
          agent?: string
          breakdown?: Json
          confirmed?: boolean
          expedition_id?: string
          id?: string
          joined_at?: string
          pikmin_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "expedition_squads_expedition_id_fkey"
            columns: ["expedition_id"]
            isOneToOne: false
            referencedRelation: "expeditions"
            referencedColumns: ["id"]
          },
        ]
      }
      expeditions: {
        Row: {
          biome: string
          created_at: string
          created_by: string
          difficulty: string
          duration_minutes: number
          end_at: string | null
          events: Json
          id: string
          is_coop: boolean
          partner: string | null
          power: number
          resolved_at: string | null
          result: string | null
          rewards: Json
          risk: string
          started_at: string | null
          status: string
          success_chance: number
          summary: string | null
          template_key: string
          title: string
        }
        Insert: {
          biome: string
          created_at?: string
          created_by: string
          difficulty: string
          duration_minutes: number
          end_at?: string | null
          events?: Json
          id?: string
          is_coop?: boolean
          partner?: string | null
          power?: number
          resolved_at?: string | null
          result?: string | null
          rewards?: Json
          risk?: string
          started_at?: string | null
          status?: string
          success_chance?: number
          summary?: string | null
          template_key: string
          title: string
        }
        Update: {
          biome?: string
          created_at?: string
          created_by?: string
          difficulty?: string
          duration_minutes?: number
          end_at?: string | null
          events?: Json
          id?: string
          is_coop?: boolean
          partner?: string | null
          power?: number
          resolved_at?: string | null
          result?: string | null
          rewards?: Json
          risk?: string
          started_at?: string | null
          status?: string
          success_chance?: number
          summary?: string | null
          template_key?: string
          title?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          color: string | null
          created_at: string
          emoji: string
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          note: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          note?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          note?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      map_enemy_spawns: {
        Row: {
          active: boolean
          defeated_at: string | null
          defeated_by: string | null
          enemy_id: string
          expires_at: string | null
          id: string
          lat: number
          lng: number
          radius_m: number
          spawned_at: string
        }
        Insert: {
          active?: boolean
          defeated_at?: string | null
          defeated_by?: string | null
          enemy_id: string
          expires_at?: string | null
          id?: string
          lat: number
          lng: number
          radius_m?: number
          spawned_at?: string
        }
        Update: {
          active?: boolean
          defeated_at?: string | null
          defeated_by?: string | null
          enemy_id?: string
          expires_at?: string | null
          id?: string
          lat?: number
          lng?: number
          radius_m?: number
          spawned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_enemy_spawns_enemy_id_fkey"
            columns: ["enemy_id"]
            isOneToOne: false
            referencedRelation: "enemies"
            referencedColumns: ["id"]
          },
        ]
      }
      map_objects: {
        Row: {
          agent: string
          created_at: string
          discovered: boolean
          id: string
          lat: number
          lng: number
          metadata: Json
          object_type: string
          visible: boolean
        }
        Insert: {
          agent: string
          created_at?: string
          discovered?: boolean
          id?: string
          lat: number
          lng: number
          metadata?: Json
          object_type: string
          visible?: boolean
        }
        Update: {
          agent?: string
          created_at?: string
          discovered?: boolean
          id?: string
          lat?: number
          lng?: number
          metadata?: Json
          object_type?: string
          visible?: boolean
        }
        Relationships: []
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
      mission_notifications: {
        Row: {
          agent: string
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
        }
        Relationships: []
      }
      mission_templates: {
        Row: {
          biome: string
          created_at: string
          description: string | null
          difficulty: string
          duration_minutes: number
          events_pool: Json
          key: string
          pikmin_max: number
          pikmin_min: number
          pikmin_recommended: number
          recommended_types: string[]
          rewards_pool: Json
          sort_order: number
          title: string
        }
        Insert: {
          biome: string
          created_at?: string
          description?: string | null
          difficulty: string
          duration_minutes: number
          events_pool?: Json
          key: string
          pikmin_max?: number
          pikmin_min?: number
          pikmin_recommended?: number
          recommended_types?: string[]
          rewards_pool?: Json
          sort_order?: number
          title: string
        }
        Update: {
          biome?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          events_pool?: Json
          key?: string
          pikmin_max?: number
          pikmin_min?: number
          pikmin_recommended?: number
          recommended_types?: string[]
          rewards_pool?: Json
          sort_order?: number
          title?: string
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
      pikmin_events: {
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
      pikmin_species: {
        Row: {
          abilities: string[]
          color: string | null
          combat_use: string | null
          created_at: string
          description: string | null
          exploration_use: string | null
          first_appearance: string | null
          icon_url: string | null
          id: string
          image_url: string | null
          key: string
          name: string
          resistances: string[]
          sort_order: number
          source_url: string | null
          sprite_attack_url: string | null
          sprite_idle_url: string | null
          sprite_sleep_url: string | null
          sprite_walk_url: string | null
          updated_at: string
          weaknesses: string[]
        }
        Insert: {
          abilities?: string[]
          color?: string | null
          combat_use?: string | null
          created_at?: string
          description?: string | null
          exploration_use?: string | null
          first_appearance?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          key: string
          name: string
          resistances?: string[]
          sort_order?: number
          source_url?: string | null
          sprite_attack_url?: string | null
          sprite_idle_url?: string | null
          sprite_sleep_url?: string | null
          sprite_walk_url?: string | null
          updated_at?: string
          weaknesses?: string[]
        }
        Update: {
          abilities?: string[]
          color?: string | null
          combat_use?: string | null
          created_at?: string
          description?: string | null
          exploration_use?: string | null
          first_appearance?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          key?: string
          name?: string
          resistances?: string[]
          sort_order?: number
          source_url?: string | null
          sprite_attack_url?: string | null
          sprite_idle_url?: string | null
          sprite_sleep_url?: string | null
          sprite_walk_url?: string | null
          updated_at?: string
          weaknesses?: string[]
        }
        Relationships: []
      }
      pikmin_squad: {
        Row: {
          breakdown: Json
          count: number
          id: string
          updated_at: string
        }
        Insert: {
          breakdown?: Json
          count?: number
          id: string
          updated_at?: string
        }
        Update: {
          breakdown?: Json
          count?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_key: Database["public"]["Enums"]["app_role"]
          created_at: string
          emoji: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_key: Database["public"]["Enums"]["app_role"]
          created_at?: string
          emoji?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_key?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
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
      scouting_missions: {
        Row: {
          agent: string
          created_at: string
          end_at: string
          id: string
          pikmin_count: number
          result: Json
          started_at: string
          status: string
          target_lat: number
          target_lng: number
          target_spawn_id: string | null
        }
        Insert: {
          agent: string
          created_at?: string
          end_at: string
          id?: string
          pikmin_count?: number
          result?: Json
          started_at?: string
          status?: string
          target_lat: number
          target_lng: number
          target_spawn_id?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          end_at?: string
          id?: string
          pikmin_count?: number
          result?: Json
          started_at?: string
          status?: string
          target_lat?: number
          target_lng?: number
          target_spawn_id?: string | null
        }
        Relationships: []
      }
      ship_parts: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          image_url: string | null
          key: string
          name: string
          rarity: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          key: string
          name: string
          rarity?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          key?: string
          name?: string
          rarity?: string
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
      sprite_assets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          tags: string[]
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          tags?: string[]
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          tags?: string[]
          url?: string
        }
        Relationships: []
      }
      trade_offers: {
        Row: {
          created_at: string
          expires_at: string
          from_agent: string
          id: string
          message: string | null
          offer: Json
          request: Json
          resolved_at: string | null
          status: string
          to_agent: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_agent: string
          id?: string
          message?: string | null
          offer?: Json
          request?: Json
          resolved_at?: string | null
          status?: string
          to_agent: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_agent?: string
          id?: string
          message?: string | null
          offer?: Json
          request?: Json
          resolved_at?: string | null
          status?: string
          to_agent?: string
        }
        Relationships: []
      }
      village_events: {
        Row: {
          agent: string
          created_at: string
          description: string | null
          id: string
          kind: string
          payload: Json
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          agent: string
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          payload?: Json
          resolved_at?: string | null
          severity?: string
          title: string
        }
        Update: {
          agent?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          payload?: Json
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      village_walls: {
        Row: {
          agent: string
          created_at: string
          from_x: number
          from_y: number
          id: string
          level: number
          material: string
          to_x: number
          to_y: number
          updated_at: string
        }
        Insert: {
          agent: string
          created_at?: string
          from_x: number
          from_y: number
          id?: string
          level?: number
          material?: string
          to_x: number
          to_y: number
          updated_at?: string
        }
        Update: {
          agent?: string
          created_at?: string
          from_x?: number
          from_y?: number
          id?: string
          level?: number
          material?: string
          to_x?: number
          to_y?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_pikmin: {
        Args: {
          p_agent: string
          p_delta: number
          p_meta?: Json
          p_reason: string
        }
        Returns: number
      }
      consume_invite_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      create_invite_code: {
        Args: { _expires_at?: string; _note?: string }
        Returns: string
      }
      current_agent_key: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_family_member: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "papa" | "lorenzo"
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
      app_role: ["papa", "lorenzo"],
    },
  },
} as const
