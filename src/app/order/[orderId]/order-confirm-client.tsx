"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { formatPrice, formatTime } from "@/lib/format";
import type { Order, OrderItem } from "@/types/database";

type OrderWithItems = Order & { order_items: OrderItem[] };

interface Props {
  order: OrderWithItems;
  sessionOrders: OrderWithItems[];
  restaurantSlug: string;
}

export function OrderConfirmClient({
  order,
  sessionOrders,
  restaurantSlug,
}: Props) {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      {/* Confirmation */}
      <div className="text-center mb-10">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Commande envoyée
        </h1>
        <p className="text-neutral-500">
          Votre commande a été transmise à la cuisine
        </p>
      </div>

      {/* Orders list */}
      {sessionOrders.map((o, index) => (
        <div key={o.id} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              {index === 0 ? "Dernière commande" : `Commande ${sessionOrders.length - index}`}
            </h2>
            <span className="text-xs text-neutral-400">
              {formatTime(o.created_at)}
            </span>
          </div>
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 overflow-hidden">
            {o.order_items.map((item: OrderItem) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-400 w-6">
                    {item.quantity}×
                  </span>
                  <div>
                    <span className="text-sm">
                      {item.number_snapshot && (
                        <span className="text-neutral-400 mr-1">
                          {item.number_snapshot}
                        </span>
                      )}
                      {item.name_snapshot}
                    </span>
                    {item.note && (
                      <p className="text-xs text-neutral-400">{item.note}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium">
                  {formatPrice(item.price_at_order * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2 px-1">
            <span className="text-sm font-semibold">
              {formatPrice(o.total)}
            </span>
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="mt-6">
        <Link
          href={`/r/${restaurantSlug}/menu`}
          className="flex items-center justify-center w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base"
        >
          Ajouter à ma commande
        </Link>
      </div>
    </div>
  );
}
