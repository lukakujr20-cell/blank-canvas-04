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
          consumed_products: Json
          created_at: string
          expired_items: Json
          id: string
          notes: string | null
          orders_summary: Json
          restaurant_id: string | null
          sales_by_waiter: Json
          total_orders: number
          total_revenue: number
        }
        Insert: {
          closed_at?: string
          closed_by: string
          consumed_products?: Json
          created_at?: string
          expired_items?: Json
          id?: string
          notes?: string | null
          orders_summary?: Json
          restaurant_id?: string | null
          sales_by_waiter?: Json
          total_orders?: number
          total_revenue?: number
        }
        Update: {
          closed_at?: string
          closed_by?: string
          consumed_products?: Json
          created_at?: string
          expired_items?: Json
          id?: string
          notes?: string | null
          orders_summary?: Json
          restaurant_id?: string | null
          sales_by_waiter?: Json
          total_orders?: number
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "bar_closings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_column_values: {
        Row: {
          column_id: string
          created_at: string | null
          id: string
          item_id: string
          restaurant_id: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          column_id: string
          created_at?: string | null
          id?: string
          item_id: string
          restaurant_id?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          column_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          restaurant_id?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_column_values_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "custom_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_column_values_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_column_values_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_columns: {
        Row: {
          category_id: string
          column_order: number | null
          created_at: string | null
          id: string
          name: string
          restaurant_id: string | null
        }
        Insert: {
          category_id: string
          column_order?: number | null
          created_at?: string | null
          id?: string
          name: string
          restaurant_id?: string | null
        }
        Update: {
          category_id?: string
          column_order?: number | null
          created_at?: string | null
          id?: string
          name?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_columns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_columns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          price: number
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          price?: number
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string
          current_stock: number | null
          direct_sale: boolean | null
          expiry_date: string | null
          id: string
          last_count_date: string | null
          last_counted_by: string | null
          min_stock: number | null
          name: string
          price: number | null
          restaurant_id: string | null
          supplier_id: string | null
          unit: string
          units_per_package: number
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by: string
          current_stock?: number | null
          direct_sale?: boolean | null
          expiry_date?: string | null
          id?: string
          last_count_date?: string | null
          last_counted_by?: string | null
          min_stock?: number | null
          name: string
          price?: number | null
          restaurant_id?: string | null
          supplier_id?: string | null
          unit?: string
          units_per_package?: number
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string
          current_stock?: number | null
          direct_sale?: boolean | null
          expiry_date?: string | null
          id?: string
          last_count_date?: string | null
          last_counted_by?: string | null
          min_stock?: number | null
          name?: string
          price?: number | null
          restaurant_id?: string | null
          supplier_id?: string | null
          unit?: string
          units_per_package?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
          created_at: string | null
          customer_name: string | null
          guest_count: number | null
          id: string
          opened_at: string | null
          restaurant_id: string | null
          status: string
          table_id: string | null
          total: number | null
          updated_at: string | null
          waiter_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          guest_count?: number | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string | null
          status?: string
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
          waiter_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          guest_count?: number | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string | null
          status?: string
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          restaurant_id: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          restaurant_id?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          restaurant_id?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string | null
          current_order_id: string | null
          id: string
          restaurant_id: string | null
          status: string
          table_number: number
          updated_at: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          current_order_id?: string | null
          id?: string
          restaurant_id?: string | null
          status?: string
          table_number: number
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          current_order_id?: string | null
          id?: string
          restaurant_id?: string | null
          status?: string
          table_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_history: {
        Row: {
          changed_by: string
          created_at: string | null
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
          restaurant_id: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string | null
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
          restaurant_id?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string | null
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
          restaurant_id?: string | null
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
          {
            foreignKeyName: "stock_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          restaurant_id: string | null
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          restaurant_id?: string | null
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          restaurant_id?: string | null
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheets: {
        Row: {
          created_at: string | null
          dish_id: string
          id: string
          item_id: string
          quantity_per_sale: number
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dish_id: string
          id?: string
          item_id: string
          quantity_per_sale?: number
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dish_id?: string
          id?: string
          item_id?: string
          quantity_per_sale?: number
          restaurant_id?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "technical_sheets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_user: {
        Args: { _manager_id: string; _target_id: string }
        Returns: boolean
      }
      get_role_level: { Args: { _user_id: string }; Returns: number }
      get_user_restaurant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_host: { Args: { _user_id: string }; Returns: boolean }
      is_kitchen: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      same_restaurant: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "host" | "super_admin" | "cozinha"
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
      app_role: ["admin", "staff", "host", "super_admin", "cozinha"],
    },
  },
} as const
