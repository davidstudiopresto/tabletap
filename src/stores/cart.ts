"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "@/types/database";

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

interface CartState {
  items: CartItem[];
  sessionId: string | null;
  tableId: string | null;
  tableNumber: number | null;
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  globalNote: string;

  setSession: (data: {
    sessionId: string;
    tableId: string;
    tableNumber: number;
    restaurantId: string;
    restaurantSlug: string;
    restaurantName: string;
  }) => void;
  addItem: (menuItem: MenuItem, quantity?: number, note?: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNote: (menuItemId: string, note: string) => void;
  removeItem: (menuItemId: string) => void;
  setGlobalNote: (note: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      sessionId: null,
      tableId: null,
      tableNumber: null,
      restaurantId: null,
      restaurantSlug: null,
      restaurantName: null,
      globalNote: "",

      setSession: (data) =>
        set({
          sessionId: data.sessionId,
          tableId: data.tableId,
          tableNumber: data.tableNumber,
          restaurantId: data.restaurantId,
          restaurantSlug: data.restaurantSlug,
          restaurantName: data.restaurantName,
        }),

      addItem: (menuItem, quantity = 1, note = "") => {
        const items = get().items;
        const existing = items.find((i) => i.menuItem.id === menuItem.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.menuItem.id === menuItem.id
                ? {
                    ...i,
                    quantity: i.quantity + quantity,
                    note: note || i.note,
                  }
                : i
            ),
          });
        } else {
          set({ items: [...items, { menuItem, quantity, note }] });
        }
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      updateNote: (menuItemId, note) => {
        set({
          items: get().items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, note } : i
          ),
        });
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menuItem.id !== menuItemId) });
      },

      setGlobalNote: (note) => set({ globalNote: note }),

      clearCart: () => set({ items: [], globalNote: "" }),

      getTotal: () =>
        get().items.reduce(
          (sum, i) => sum + i.menuItem.price * i.quantity,
          0
        ),

      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "tabletap-cart",
    }
  )
);
