import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderConfirmClient } from "./order-confirm-client";
import type { Order, Restaurant } from "@/types/database";

export default async function OrderConfirmPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: order } = await supabase
    .from("orders")
    .select("restaurant_id")
    .eq("id", orderId)
    .single() as { data: Pick<Order, "restaurant_id"> | null };

  if (!order) notFound();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", order.restaurant_id)
    .single() as { data: Pick<Restaurant, "slug"> | null };

  return (
    <OrderConfirmClient
      restaurantSlug={restaurant?.slug || ""}
    />
  );
}
