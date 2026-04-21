"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, formatPrice } from "@/lib/format";
import type { Order, OrderItem } from "@/types/database";

type AdminOrder = Order & {
  order_items: OrderItem[];
  tables: { number: number } | null;
};

interface Props {
  restaurantId: string;
  initialOrders: AdminOrder[];
}

export function OrdersClient({ restaurantId, initialOrders }: Props) {
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [spinning, setSpinning] = useState(false);

  const playSound = useCallback(() => {
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
  }, []);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), tables(number)")
      .eq("restaurant_id", restaurantId)
      .in("status", ["pending", "done"])
      .order("created_at", { ascending: false }) as { data: AdminOrder[] | null };
    if (data) {
      setOrders((prev) => {
        const prevIds = prev.map((o) => o.id);
        const hasNew = data.some((o) => !prevIds.includes(o.id));
        if (hasNew && prev.length > 0) playSound();
        return data;
      });
    }
  }, [restaurantId, playSound]);

  const handleRefresh = async () => {
    setSpinning(true);
    await fetchOrders();
    setTimeout(() => setSpinning(false), 600);
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Also try realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          const record = payload.new as Record<string, unknown>;
          if (record.restaurant_id !== restaurantId) return;

          if (payload.eventType === "INSERT") {
            const { data: newOrder } = await supabase
              .from("orders")
              .select("*, order_items(*), tables(number)")
              .eq("id", record.id as string)
              .single() as { data: AdminOrder | null };
            if (newOrder) {
              setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
              playSound();
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as AdminOrder;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playSound]);

  const updateStatus = async (orderId: string, status: "done" | "cancelled") => {
    const supabase = createClient();
    await (supabase.from("orders") as any).update({ status }).eq("id", orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
          <button
            onClick={handleRefresh}
            className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            <Clock className="w-3.5 h-3.5" />
            {pendingCount} en attente
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["pending", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-[#0A0A0A] text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {f === "pending" ? "En attente" : f === "done" ? "Terminées" : "Toutes"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-lg">Aucune commande</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-2xl border overflow-hidden ${
                order.status === "pending"
                  ? "border-orange-200"
                  : order.status === "done"
                  ? "border-green-200"
                  : "border-neutral-200 opacity-60"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 ${
                  order.status === "pending"
                    ? "bg-orange-50"
                    : order.status === "done"
                    ? "bg-green-50"
                    : "bg-neutral-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    Table {order.tables?.number || "?"}
                  </span>
                  {order.status === "pending" && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  )}
                  {order.status === "done" && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <span className="text-sm text-neutral-500">
                  {formatTime(order.created_at)}
                </span>
              </div>

              <div className="px-4 py-3 divide-y divide-neutral-100">
                {order.order_items.map((item: OrderItem) => (
                  <div key={item.id} className="py-2 flex justify-between">
                    <div className="flex gap-2">
                      <span className="font-bold shrink-0">{item.quantity}×</span>
                      <div>
                        <span className="font-medium">
                          {item.number_snapshot && (
                            <span className="text-neutral-400 mr-1">{item.number_snapshot}</span>
                          )}
                          {item.name_snapshot}
                        </span>
                        {item.note && (
                          <p className="text-sm italic text-neutral-500 mt-0.5">{item.note}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-neutral-500 shrink-0">
                      {formatPrice(item.price_at_order * item.quantity)}
                    </span>
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

              <div className="px-4 pb-4 flex items-center justify-between">
                <span className="font-bold">{formatPrice(order.total)}</span>
                {order.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(order.id, "cancelled")}
                      className="h-10 px-3 rounded-xl border border-neutral-200 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center gap-1.5 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, "done")}
                      className="h-10 px-4 rounded-xl bg-green-600 text-white font-medium flex items-center gap-1.5 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Fait
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
