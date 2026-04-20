import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderConfirmClient } from "./order-confirm-client";
import type { Order, OrderItem, Restaurant } from "@/types/database";

type OrderWithItems = Order & { order_items: OrderItem[] };

export default async function OrderConfirmPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single() as { data: OrderWithItems | null };

  if (!order) notFound();

  // Get restaurant slug for "add more" link
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", order.restaurant_id)
    .single() as { data: Pick<Restaurant, "slug"> | null };

  // Get previous orders in the same session
  const { data: sessionOrders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("session_id", order.session_id)
    .order("created_at", { ascending: false }) as {
    data: OrderWithItems[] | null;
  };

  return (
    <OrderConfirmClient
      order={order}
      sessionOrders={sessionOrders || [order]}
      restaurantSlug={restaurant?.slug || ""}
    />
  );
}
