export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          number: number;
          qr_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          number: number;
          qr_token?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          number?: number;
          qr_token?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      table_sessions: {
        Row: {
          id: string;
          table_id: string;
          restaurant_id: string;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          table_id: string;
          restaurant_id: string;
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          table_id?: string;
          restaurant_id?: string;
          opened_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          number: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          available: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          number?: string | null;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          available?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string | null;
          number?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          available?: boolean;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          session_id: string;
          table_id: string;
          restaurant_id: string;
          status: "pending" | "done" | "cancelled";
          total: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          table_id: string;
          restaurant_id: string;
          status?: "pending" | "done" | "cancelled";
          total?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          table_id?: string;
          restaurant_id?: string;
          status?: "pending" | "done" | "cancelled";
          total?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          number_snapshot: string | null;
          name_snapshot: string;
          price_at_order: number;
          quantity: number;
          note: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          number_snapshot?: string | null;
          name_snapshot: string;
          price_at_order: number;
          quantity?: number;
          note?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          number_snapshot?: string | null;
          name_snapshot?: string;
          price_at_order?: number;
          quantity?: number;
          note?: string | null;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
          role: "admin" | "kitchen";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          restaurant_id: string;
          role: "admin" | "kitchen";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          restaurant_id?: string;
          role?: "admin" | "kitchen";
          created_at?: string;
        };
        Relationships: [];
      };
      qr_stickers: {
        Row: {
          id: string;
          public_id: string;
          restaurant_id: string;
          status: "unassigned" | "assigned" | "disabled";
          assigned_table_id: string | null;
          label: string | null;
          scan_count: number;
          last_scanned_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          public_id: string;
          restaurant_id: string;
          status?: "unassigned" | "assigned" | "disabled";
          assigned_table_id?: string | null;
          label?: string | null;
          scan_count?: number;
          last_scanned_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          public_id?: string;
          restaurant_id?: string;
          status?: "unassigned" | "assigned" | "disabled";
          assigned_table_id?: string | null;
          label?: string | null;
          scan_count?: number;
          last_scanned_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Helper types
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type Table = Database["public"]["Tables"]["tables"]["Row"];
export type TableSession = Database["public"]["Tables"]["table_sessions"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Staff = Database["public"]["Tables"]["staff"]["Row"];
export type QrSticker = Database["public"]["Tables"]["qr_stickers"]["Row"];
