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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bar_closings: {
        Row: {
          closed_at: string
          closed_by: string
          consumed_products: Json | null
          created_at: string
          expired_items: Json | null
          id: string
          orders_summary: Json | null
          sales_by_waiter: Json | null
          total_orders: number
          total_revenue: number
        }
        Insert: {
          closed_at?: string
          closed_by: string
          consumed_products?: Json | null
          created_at?: string
          expired_items?: Json | null
          id?: string
          orders_summary?: Json | null
          sales_by_waiter?: Json | null
          total_orders?: number
          total_revenue?: number
        }
        Update: {
          closed_at?: string
          closed_by?: string
          consumed_products?: Json | null
          created_at?: string
          expired_items?: Json | null
          id?: string
          orders_summary?: Json | null
          sales_by_waiter?: Json | null
          total_orders?: number
          total_revenue?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string | null
        }
        Relationships: []
      }
      dishes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          restaurant_id?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          coach_id: string | null
          created_at: string
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string
          video_url: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          video_url?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string | null
          created_at: string
          current_stock: number | null
          direct_sale: boolean | null
          expiry_date: string | null
          id: string
          last_count_date: string | null
          last_counted_by: string | null
          min_stock: number
          name: string
          price: number | null
          restaurant_id: string | null
          unit: string
          units_per_package: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          current_stock?: number | null
          direct_sale?: boolean | null
          expiry_date?: string | null
          id?: string
          last_count_date?: string | null
          last_counted_by?: string | null
          min_stock?: number
          name: string
          price?: number | null
          restaurant_id?: string | null
          unit?: string
          units_per_package?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          current_stock?: number | null
          direct_sale?: boolean | null
          expiry_date?: string | null
          id?: string
          last_count_date?: string | null
          last_counted_by?: string | null
          min_stock?: number
          name?: string
          price?: number | null
          restaurant_id?: string | null
          unit?: string
          units_per_package?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          dish_id: string | null
          dish_name: string
          id: string
          notes: string | null
          order_id: string
          quantity: number
          sent_at: string | null
          status: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          dish_id?: string | null
          dish_name: string
          id?: string
          notes?: string | null
          order_id: string
          quantity?: number
          sent_at?: string | null
          status?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          dish_id?: string | null
          dish_name?: string
          id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          sent_at?: string | null
          status?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          closed_at: string | null
          created_at: string
          customer_name: string | null
          guest_count: number | null
          id: string
          opened_at: string | null
          restaurant_id: string | null
          status: string
          table_id: string | null
          total: number | null
          waiter_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          customer_name?: string | null
          guest_count?: number | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string | null
          status?: string
          table_id?: string | null
          total?: number | null
          waiter_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          customer_name?: string | null
          guest_count?: number | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string | null
          status?: string
          table_id?: string | null
          total?: number | null
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          instagram_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          current_order_id: string | null
          id: string
          restaurant_id: string | null
          status: string
          table_number: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          restaurant_id?: string | null
          status?: string
          table_number: number
        }
        Update: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          restaurant_id?: string | null
          status?: string
          table_number?: number
        }
        Relationships: []
      }
      stock_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          item_id: string
          movement_type: string
          new_expiry: string | null
          new_stock: number
          order_id: string | null
          order_item_id: string | null
          previous_expiry: string | null
          previous_stock: number | null
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          item_id: string
          movement_type?: string
          new_expiry?: string | null
          new_stock: number
          order_id?: string | null
          order_item_id?: string | null
          previous_expiry?: string | null
          previous_stock?: number | null
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          item_id?: string
          movement_type?: string
          new_expiry?: string | null
          new_stock?: number
          order_id?: string | null
          order_item_id?: string | null
          previous_expiry?: string | null
          previous_stock?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          access_code: string | null
          active: boolean | null
          coach_id: string
          created_at: string
          email: string | null
          goals: string | null
          id: string
          name: string
          whatsapp: string | null
        }
        Insert: {
          access_code?: string | null
          active?: boolean | null
          coach_id: string
          created_at?: string
          email?: string | null
          goals?: string | null
          id?: string
          name: string
          whatsapp?: string | null
        }
        Update: {
          access_code?: string | null
          active?: boolean | null
          coach_id?: string
          created_at?: string
          email?: string | null
          goals?: string | null
          id?: string
          name?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheets: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          item_id: string
          quantity_per_sale: number
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          item_id: string
          quantity_per_sale?: number
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          item_id?: string
          quantity_per_sale?: number
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheets_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_items: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps: string | null
          rest_time_seconds: number | null
          sets: number | null
          weight: string | null
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          rest_time_seconds?: number | null
          sets?: number | null
          weight?: string | null
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          rest_time_seconds?: number | null
          sets?: number | null
          weight?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          student_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          student_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
