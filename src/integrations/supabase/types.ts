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
          biome_key: string | null
          build_end_at: string | null
          created_at: string
          id: string
          level: number
          position_x: number
          position_y: number
          slot_key: string | null
          started_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          agent: string
          biome_key?: string | null
          build_end_at?: string | null
          created_at?: string
          id?: string
          level?: number
          position_x?: number
          position_y?: number
          slot_key?: string | null
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          agent?: string
          biome_key?: string | null
          build_end_at?: string | null
          created_at?: string
          id?: string
          level?: number
          position_x?: number
          position_y?: number
          slot_key?: string | null
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
      bestiary_entries: {
        Row: {
          biome_key: string | null
          created_at: string
          creature_key: string
          danger_level: number
          data_points: number
          discovered_by: string | null
          emoji: string | null
          id: string
          name: string
          rarity: string
          rewards: Json
          scan_count: number
          study_status: string
          updated_at: string
          weakness: string | null
          weakness_unlocked: boolean
        }
        Insert: {
          biome_key?: string | null
          created_at?: string
          creature_key: string
          danger_level?: number
          data_points?: number
          discovered_by?: string | null
          emoji?: string | null
          id?: string
          name: string
          rarity?: string
          rewards?: Json
          scan_count?: number
          study_status?: string
          updated_at?: string
          weakness?: string | null
          weakness_unlocked?: boolean
        }
        Update: {
          biome_key?: string | null
          created_at?: string
          creature_key?: string
          danger_level?: number
          data_points?: number
          discovered_by?: string | null
          emoji?: string | null
          id?: string
          name?: string
          rarity?: string
          rewards?: Json
          scan_count?: number
          study_status?: string
          updated_at?: string
          weakness?: string | null
          weakness_unlocked?: boolean
        }
        Relationships: []
      }
      biome_zones: {
        Row: {
          bonus: string | null
          emoji: string
          events: Json
          frequent_monsters: Json
          frequent_pikmin: Json
          ingredients: Json
          key: string
          label: string
          malus: string | null
          rarity: string
          resources: Json
          theme: string | null
        }
        Insert: {
          bonus?: string | null
          emoji: string
          events?: Json
          frequent_monsters?: Json
          frequent_pikmin?: Json
          ingredients?: Json
          key: string
          label: string
          malus?: string | null
          rarity?: string
          resources?: Json
          theme?: string | null
        }
        Update: {
          bonus?: string | null
          emoji?: string
          events?: Json
          frequent_monsters?: Json
          frequent_pikmin?: Json
          ingredients?: Json
          key?: string
          label?: string
          malus?: string | null
          rarity?: string
          resources?: Json
          theme?: string | null
        }
        Relationships: []
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
      family_chat_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          message_type: string
          sender_agent: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          id?: string
          message_type?: string
          sender_agent: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          sender_agent?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          agent_key: string
          created_at: string
          display_name: string
          emoji: string
          id: string
          last_seen_at: string
          online: boolean
          rank: string
          role: string
        }
        Insert: {
          agent_key: string
          created_at?: string
          display_name: string
          emoji?: string
          id?: string
          last_seen_at?: string
          online?: boolean
          rank?: string
          role?: string
        }
        Update: {
          agent_key?: string
          created_at?: string
          display_name?: string
          emoji?: string
          id?: string
          last_seen_at?: string
          online?: boolean
          rank?: string
          role?: string
        }
        Relationships: []
      }
      family_trade_history: {
        Row: {
          action: string
          created_at: string
          from_agent: string
          id: string
          offer_id: string
          snapshot: Json
          to_agent: string
        }
        Insert: {
          action: string
          created_at?: string
          from_agent: string
          id?: string
          offer_id: string
          snapshot?: Json
          to_agent: string
        }
        Update: {
          action?: string
          created_at?: string
          from_agent?: string
          id?: string
          offer_id?: string
          snapshot?: Json
          to_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_trade_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "family_trade_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      family_trade_items: {
        Row: {
          agent_key: string
          category: string
          emoji: string
          id: string
          item_key: string
          item_name: string
          offer_id: string
          quantity: number
          sell_price: number
          side: string
        }
        Insert: {
          agent_key: string
          category?: string
          emoji?: string
          id?: string
          item_key: string
          item_name: string
          offer_id: string
          quantity?: number
          sell_price?: number
          side: string
        }
        Update: {
          agent_key?: string
          category?: string
          emoji?: string
          id?: string
          item_key?: string
          item_name?: string
          offer_id?: string
          quantity?: number
          sell_price?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_trade_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "family_trade_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      family_trade_offers: {
        Row: {
          created_at: string
          from_agent: string
          id: string
          message: string | null
          resolved_at: string | null
          status: string
          to_agent: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_agent: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          status?: string
          to_agent: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_agent?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          status?: string
          to_agent?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_trade_offers_from_agent_fkey"
            columns: ["from_agent"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["agent_key"]
          },
          {
            foreignKeyName: "family_trade_offers_to_agent_fkey"
            columns: ["to_agent"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["agent_key"]
          },
        ]
      }
      game_notifications: {
        Row: {
          agent_key: string
          body: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          title: string
        }
        Insert: {
          agent_key: string
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          title: string
        }
        Update: {
          agent_key?: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
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
      market_transactions: {
        Row: {
          agent_key: string
          created_at: string
          id: string
          item_key: string
          item_name: string
          price: number
          quantity: number
          transaction_type: string
        }
        Insert: {
          agent_key: string
          created_at?: string
          id?: string
          item_key: string
          item_name: string
          price?: number
          quantity?: number
          transaction_type: string
        }
        Update: {
          agent_key?: string
          created_at?: string
          id?: string
          item_key?: string
          item_name?: string
          price?: number
          quantity?: number
          transaction_type?: string
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
      pikmin_activity_log: {
        Row: {
          created_at: string
          id: string
          meta: Json
          owner_agent: string
          pikmin_id: string
          reason: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json
          owner_agent: string
          pikmin_id: string
          reason: string
          xp_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json
          owner_agent?: string
          pikmin_id?: string
          reason?: string
          xp_amount?: number
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
      pikmin_expedition_units: {
        Row: {
          created_at: string
          expedition_id: string
          id: string
          owner_agent: string
          pikmin_unit_id: string
        }
        Insert: {
          created_at?: string
          expedition_id: string
          id?: string
          owner_agent: string
          pikmin_unit_id: string
        }
        Update: {
          created_at?: string
          expedition_id?: string
          id?: string
          owner_agent?: string
          pikmin_unit_id?: string
        }
        Relationships: []
      }
      pikmin_specializations: {
        Row: {
          best_types: Json
          bonuses: Json
          duties: Json
          emoji: string
          key: string
          title: string
        }
        Insert: {
          best_types?: Json
          bonuses?: Json
          duties?: Json
          emoji?: string
          key: string
          title: string
        }
        Update: {
          best_types?: Json
          bonuses?: Json
          duties?: Json
          emoji?: string
          key?: string
          title?: string
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
      pikmin_units: {
        Row: {
          created_at: string
          experience: number
          experience_to_next: number
          id: string
          level: number
          name: string
          owner_agent: string
          preferred_biome: string
          spec_badge: string | null
          specialization_key: string | null
          stats: Json
          status: string
          story: string | null
          total_xp_earned: number
          type_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          experience?: number
          experience_to_next?: number
          id?: string
          level?: number
          name: string
          owner_agent: string
          preferred_biome?: string
          spec_badge?: string | null
          specialization_key?: string | null
          stats?: Json
          status?: string
          story?: string | null
          total_xp_earned?: number
          type_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          experience?: number
          experience_to_next?: number
          id?: string
          level?: number
          name?: string
          owner_agent?: string
          preferred_biome?: string
          spec_badge?: string | null
          specialization_key?: string | null
          stats?: Json
          status?: string
          story?: string | null
          total_xp_earned?: number
          type_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pikmin_units_owner_agent_fkey"
            columns: ["owner_agent"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["agent_key"]
          },
          {
            foreignKeyName: "pikmin_units_specialization_key_fkey"
            columns: ["specialization_key"]
            isOneToOne: false
            referencedRelation: "pikmin_specializations"
            referencedColumns: ["key"]
          },
        ]
      }
      planet_status: {
        Row: {
          bestiary_count: number
          bestiary_total: number
          debt_paid: number
          debt_total: number
          energy: number
          food: number
          id: string
          morale: number
          updated_at: string
        }
        Insert: {
          bestiary_count?: number
          bestiary_total?: number
          debt_paid?: number
          debt_total?: number
          energy?: number
          food?: number
          id?: string
          morale?: number
          updated_at?: string
        }
        Update: {
          bestiary_count?: number
          bestiary_total?: number
          debt_paid?: number
          debt_total?: number
          energy?: number
          food?: number
          id?: string
          morale?: number
          updated_at?: string
        }
        Relationships: []
      }
      player_inventory: {
        Row: {
          agent_key: string
          category: string
          emoji: string
          id: string
          item_key: string
          item_name: string
          metadata: Json
          quantity: number
          sell_price: number
          updated_at: string
        }
        Insert: {
          agent_key: string
          category?: string
          emoji?: string
          id?: string
          item_key: string
          item_name: string
          metadata?: Json
          quantity?: number
          sell_price?: number
          updated_at?: string
        }
        Update: {
          agent_key?: string
          category?: string
          emoji?: string
          id?: string
          item_key?: string
          item_name?: string
          metadata?: Json
          quantity?: number
          sell_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["agent_key"]
          },
        ]
      }
      player_profiles: {
        Row: {
          active_village_id: string | null
          agent_key: string
          coins: number
          current_biome: string
          id: string
          lat: number | null
          level: number
          lng: number | null
          updated_at: string
          user_id: string | null
          xp: number
        }
        Insert: {
          active_village_id?: string | null
          agent_key: string
          coins?: number
          current_biome?: string
          id?: string
          lat?: number | null
          level?: number
          lng?: number | null
          updated_at?: string
          user_id?: string | null
          xp?: number
        }
        Update: {
          active_village_id?: string | null
          agent_key?: string
          coins?: number
          current_biome?: string
          id?: string
          lat?: number | null
          level?: number
          lng?: number | null
          updated_at?: string
          user_id?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_profiles_active_village_id_fkey"
            columns: ["active_village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_profiles_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["agent_key"]
          },
        ]
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
      scan_results: {
        Row: {
          agent_key: string
          biome_key: string
          created_at: string
          emoji: string | null
          id: string
          label: string
          payload: Json
          processed: boolean
          target_type: string
        }
        Insert: {
          agent_key: string
          biome_key: string
          created_at?: string
          emoji?: string | null
          id?: string
          label: string
          payload?: Json
          processed?: boolean
          target_type: string
        }
        Update: {
          agent_key?: string
          biome_key?: string
          created_at?: string
          emoji?: string | null
          id?: string
          label?: string
          payload?: Json
          processed?: boolean
          target_type?: string
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
      spaceship_parts: {
        Row: {
          collected: boolean
          collected_at: string | null
          collected_by: string | null
          emoji: string
          key: string
          location_hint: string | null
          name: string
          sort_order: number
        }
        Insert: {
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          emoji: string
          key: string
          location_hint?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          emoji?: string
          key?: string
          location_hint?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
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
      village_biomes: {
        Row: {
          accent: string
          bonuses: string[]
          created_at: string
          created_by: string | null
          emoji: string
          id: string
          image_url: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent?: string
          bonuses?: string[]
          created_at?: string
          created_by?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string
          bonuses?: string[]
          created_at?: string
          created_by?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      village_buildings: {
        Row: {
          building_key: string
          emoji: string
          id: string
          level: number
          max_level: number
          name: string
          status: string
          village_id: string
        }
        Insert: {
          building_key: string
          emoji?: string
          id?: string
          level?: number
          max_level?: number
          name: string
          status?: string
          village_id: string
        }
        Update: {
          building_key?: string
          emoji?: string
          id?: string
          level?: number
          max_level?: number
          name?: string
          status?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_buildings_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      village_diorama_events: {
        Row: {
          biome_key: string | null
          bonuses: Json
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          effects: Json
          ends_at: string | null
          event_type: string
          icon: string
          id: string
          is_active: boolean
          key: string
          maluses: Json
          name: string
          overlay_image_url: string | null
          priority: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          biome_key?: string | null
          bonuses?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          effects?: Json
          ends_at?: string | null
          event_type?: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          maluses?: Json
          name: string
          overlay_image_url?: string | null
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          biome_key?: string | null
          bonuses?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          effects?: Json
          ends_at?: string | null
          event_type?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          maluses?: Json
          name?: string
          overlay_image_url?: string | null
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      village_diorama_slots: {
        Row: {
          allowed_categories: string[]
          created_at: string
          diorama_id: string
          height: number
          id: string
          rotation: number
          size: string
          slot_key: string
          width: number
          x: number
          y: number
        }
        Insert: {
          allowed_categories?: string[]
          created_at?: string
          diorama_id: string
          height?: number
          id?: string
          rotation?: number
          size?: string
          slot_key: string
          width?: number
          x: number
          y: number
        }
        Update: {
          allowed_categories?: string[]
          created_at?: string
          diorama_id?: string
          height?: number
          id?: string
          rotation?: number
          size?: string
          slot_key?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "village_diorama_slots_diorama_id_fkey"
            columns: ["diorama_id"]
            isOneToOne: false
            referencedRelation: "village_dioramas"
            referencedColumns: ["id"]
          },
        ]
      }
      village_dioramas: {
        Row: {
          biome: string
          created_at: string
          height: number
          id: string
          image_url: string
          is_active: boolean
          is_system: boolean
          name: string
          owner_id: string | null
          updated_at: string
          width: number
        }
        Insert: {
          biome?: string
          created_at?: string
          height?: number
          id?: string
          image_url: string
          is_active?: boolean
          is_system?: boolean
          name: string
          owner_id?: string | null
          updated_at?: string
          width?: number
        }
        Update: {
          biome?: string
          created_at?: string
          height?: number
          id?: string
          image_url?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          owner_id?: string | null
          updated_at?: string
          width?: number
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
      village_structure_assets: {
        Row: {
          anchor_x: number
          anchor_y: number
          asset_url: string
          biome_key: string
          building_type: string
          created_at: string
          created_by: string | null
          glow_url: string | null
          id: string
          idle_anim: string
          level: number
          offset_x: number
          offset_y: number
          shadow_url: string | null
          slot_fit_scale: number
          updated_at: string
          variant: string
        }
        Insert: {
          anchor_x?: number
          anchor_y?: number
          asset_url: string
          biome_key: string
          building_type: string
          created_at?: string
          created_by?: string | null
          glow_url?: string | null
          id?: string
          idle_anim?: string
          level?: number
          offset_x?: number
          offset_y?: number
          shadow_url?: string | null
          slot_fit_scale?: number
          updated_at?: string
          variant?: string
        }
        Update: {
          anchor_x?: number
          anchor_y?: number
          asset_url?: string
          biome_key?: string
          building_type?: string
          created_at?: string
          created_by?: string | null
          glow_url?: string | null
          id?: string
          idle_anim?: string
          level?: number
          offset_x?: number
          offset_y?: number
          shadow_url?: string | null
          slot_fit_scale?: number
          updated_at?: string
          variant?: string
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
      villages: {
        Row: {
          action_radius_m: number
          biome_key: string
          created_at: string
          id: string
          is_primary: boolean
          lat: number | null
          level: number
          lng: number | null
          name: string
          owner_agent: string
          updated_at: string
        }
        Insert: {
          action_radius_m?: number
          biome_key?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lat?: number | null
          level?: number
          lng?: number | null
          name: string
          owner_agent: string
          updated_at?: string
        }
        Update: {
          action_radius_m?: number
          biome_key?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lat?: number | null
          level?: number
          lng?: number | null
          name?: string
          owner_agent?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "villages_owner_agent_fkey"
            columns: ["owner_agent"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["agent_key"]
          },
        ]
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
