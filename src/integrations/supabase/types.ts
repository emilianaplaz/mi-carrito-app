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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          name: string
          price: number
          quantity: number
          supermarket: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          name: string
          price: number
          quantity?: number
          supermarket: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          name?: string
          price?: number
          quantity?: number
          supermarket?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          automation_frequency: string | null
          created_at: string
          id: string
          is_automated: boolean | null
          is_favorite: boolean | null
          items: Json | null
          last_executed_date: string | null
          name: string
          next_scheduled_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_frequency?: string | null
          created_at?: string
          id?: string
          is_automated?: boolean | null
          is_favorite?: boolean | null
          items?: Json | null
          last_executed_date?: string | null
          name: string
          next_scheduled_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_frequency?: string | null
          created_at?: string
          id?: string
          is_automated?: boolean | null
          is_favorite?: boolean | null
          items?: Json | null
          last_executed_date?: string | null
          name?: string
          next_scheduled_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          id: string
          plan_data: Json
          recipe_ids: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data: Json
          recipe_ids?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json
          recipe_ids?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: Json
          created_at: string
          delivery_fee: number
          estimated_delivery: string | null
          id: string
          items: Json
          payment_method: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address: Json
          created_at?: string
          delivery_fee: number
          estimated_delivery?: string | null
          id?: string
          items?: Json
          payment_method?: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json
          created_at?: string
          delivery_fee?: number
          estimated_delivery?: string | null
          id?: string
          items?: Json
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_default: boolean
          last_four: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean
          last_four?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean
          last_four?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          marca: string
          mercado: string
          precio: number
          presentacion: string
          producto: string
          subcategoria: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          marca: string
          mercado: string
          precio: number
          presentacion: string
          producto: string
          subcategoria: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          marca?: string
          mercado?: string
          precio?: number
          presentacion?: string
          producto?: string
          subcategoria?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time: number | null
          created_at: string
          cuisine_type: string | null
          description: string | null
          dietary_tags: string[] | null
          id: string
          ingredients: Json
          instructions: Json
          meal_type: string | null
          name: string
          prep_time: number | null
          servings: number | null
        }
        Insert: {
          cook_time?: number | null
          created_at?: string
          cuisine_type?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          ingredients?: Json
          instructions?: Json
          meal_type?: string | null
          name: string
          prep_time?: number | null
          servings?: number | null
        }
        Update: {
          cook_time?: number | null
          created_at?: string
          cuisine_type?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          ingredients?: Json
          instructions?: Json
          meal_type?: string | null
          name?: string
          prep_time?: number | null
          servings?: number | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      supermarkets: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          allergies: string[] | null
          breakfast_options: number | null
          budget: number | null
          completed_at: string | null
          cooking_time: string | null
          created_at: string
          cuisine_preferences: string[] | null
          dietary_restrictions: string[] | null
          dinner_options: number | null
          health_goals: string[] | null
          id: string
          lunch_options: number | null
          plan_duration: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          breakfast_options?: number | null
          budget?: number | null
          completed_at?: string | null
          cooking_time?: string | null
          created_at?: string
          cuisine_preferences?: string[] | null
          dietary_restrictions?: string[] | null
          dinner_options?: number | null
          health_goals?: string[] | null
          id?: string
          lunch_options?: number | null
          plan_duration?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          breakfast_options?: number | null
          budget?: number | null
          completed_at?: string | null
          cooking_time?: string | null
          created_at?: string
          cuisine_preferences?: string[] | null
          dietary_restrictions?: string[] | null
          dinner_options?: number | null
          health_goals?: string[] | null
          id?: string
          lunch_options?: number | null
          plan_duration?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_recipe_preferences: {
        Row: {
          created_at: string
          id: string
          is_liked: boolean
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_liked: boolean
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_liked?: boolean
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recipe_preferences_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
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
  public: {
    Enums: {},
  },
} as const
