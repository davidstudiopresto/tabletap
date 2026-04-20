"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function CartPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const globalNote = useCartStore((s) => s.globalNote);
  const setGlobalNote = useCartStore((s) => s.setGlobalNote);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const sessionId = useCartStore((s) => s.sessionId);
  const tableId = useCartStore((s) => s.tableId);
  const restaurantId = useCartStore((s) => s.restaurantId);

  const [sending, setSending] = useState(false);

  const total = getTotal();

  const handleSend = async () => {
    if (!sessionId || !tableId || !restaurantId || items.length === 0) return;
    setSending(true);

    try {
      const supabase = createClient();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          session_id: sessionId,
          table_id: tableId,
          restaurant_id: restaurantId,
          total,
          note: globalNote || null,
        })
        .select("id")
        .single();

      if (orderError || !order) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        number_snapshot: item.menuItem.number || null,
        name_snapshot: item.menuItem.name,
        price_at_order: item.menuItem.price,
        quantity: item.quantity,
        note: item.note || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      router.replace(`/order/${order.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de la commande");
    } finally {
      setSending(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="flex items-center h-14 px-4 border-b border-neutral-100">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold pr-8">
            Votre commande
          </h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <p className="text-neutral-400 text-lg mb-4">Votre panier est vide</p>
            <button
              onClick={() => router.push(`/r/${slug}/menu`)}
              className="h-12 px-8 rounded-full bg-[#0A0A0A] text-white font-medium"
            >
              Voir la carte
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-white border-b border-neutral-100">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold pr-8">
          Votre commande
        </h1>
      </header>

      {/* Items */}
      <div className="px-4 divide-y divide-neutral-100">
        {items.map((item) => (
          <div key={item.menuItem.id} className="flex items-center gap-3 py-4">
            {item.menuItem.image_url && (
              <img
                src={item.menuItem.image_url}
                alt={item.menuItem.name}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                {item.menuItem.number && (
                  <span className="text-xs text-neutral-400">
                    {item.menuItem.number}
                  </span>
                )}
                <h3 className="text-sm font-medium truncate">
                  {item.menuItem.name}
                </h3>
              </div>
              <p className="text-sm font-medium mt-0.5">
                {formatPrice(item.menuItem.price * item.quantity)}
              </p>
              {item.note && (
                <p className="text-xs text-neutral-400 mt-0.5 truncate">
                  {item.note}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() =>
                  item.quantity === 1
                    ? removeItem(item.menuItem.id)
                    : updateQuantity(item.menuItem.id, item.quantity - 1)
                }
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="text-sm font-medium w-5 text-center">
                {item.quantity}
              </span>
              <button
                onClick={() =>
                  updateQuantity(item.menuItem.id, item.quantity + 1)
                }
                className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Global note */}
      <div className="px-4 mt-4">
        <textarea
          value={globalNote}
          onChange={(e) => setGlobalNote(e.target.value)}
          placeholder="Note pour la cuisine..."
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />
      </div>

      {/* Total + CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold">Total</span>
          <span className="text-xl font-bold">{formatPrice(total)}</span>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base disabled:opacity-50"
        >
          {sending ? "Envoi en cours..." : "Envoyer la commande"}
        </button>
      </div>
    </div>
  );
}
