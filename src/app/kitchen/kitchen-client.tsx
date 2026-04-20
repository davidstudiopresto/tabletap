"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/format";
import type { Order, OrderItem } from "@/types/database";

type KitchenOrder = Order & {
  order_items: OrderItem[];
  tables: { number: number } | null;
};

interface Props {
  restaurantId: string;
  restaurantName: string;
  initialOrders: KitchenOrder[];
}

export function KitchenClient({
  restaurantId,
  restaurantName,
  initialOrders,
}: Props) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (e) {
        // Wake lock may fail silently
      }
    }
    requestWakeLock();
    return () => {
      wakeLock?.release();
    };
  }, []);

  // Create audio element
  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    );
    // Use a simple beep via Web Audio API instead
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 200);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const newRecord = payload.new as Record<string, unknown>;
          // Fetch the full order with items and table
          const { data: newOrder } = await supabase
            .from("orders")
            .select("*, order_items(*), tables(number)")
            .eq("id", newRecord.id as string)
            .single() as { data: KitchenOrder | null };

          if (newOrder && newOrder.status === "pending") {
            setOrders((prev) => [...prev, newOrder]);
            playNotificationSound();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.status === "done" || updated.status === "cancelled") {
            setOrders((prev) =>
              prev.filter((o) => o.id !== updated.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playNotificationSound]);

  const markAsDone = async (orderId: string) => {
    const supabase = createClient();
    await supabase.from("orders").update({ status: "done" as const }).eq("id", orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cuisine</h1>
            <p className="text-sm text-neutral-500">{restaurantName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">
              {orders.length} commande{orders.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5 text-neutral-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Orders grid */}
      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-neutral-400 text-lg">
            Aucune commande en attente
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
            >
              {/* Ticket header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] text-white">
                <span className="text-lg font-bold">
                  Table {order.tables?.number || "?"}
                </span>
                <span className="text-sm opacity-70">
                  {formatTime(order.created_at)}
                </span>
              </div>

              {/* Items */}
              <div className="px-4 py-3 divide-y divide-neutral-100">
                {order.order_items.map((item: OrderItem) => (
                  <div key={item.id} className="py-2">
                    <div className="flex gap-2 text-base">
                      <span className="font-bold shrink-0">
                        {item.quantity}×
                      </span>
                      <div>
                        <span className="font-medium">
                          {item.number_snapshot && (
                            <span className="text-neutral-500 mr-1">
                              {item.number_snapshot}
                            </span>
                          )}
                          {item.name_snapshot}
                        </span>
                        {item.note && (
                          <p className="text-sm italic text-neutral-500 mt-0.5">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {order.note && (
                <div className="px-4 pb-3">
                  <p className="text-sm italic text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
                    {order.note}
                  </p>
                </div>
              )}

              {/* Done button */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => markAsDone(order.id)}
                  className="w-full h-12 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Marquer comme fait
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
