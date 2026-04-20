import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrdersClient } from "./orders-client";
import type { Staff, Order, OrderItem } from "@/types/database";

type AdminOrder = Order & {
  order_items: OrderItem[];
  tables: { number: number } | null;
};

export default async function AdminOrdersPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("restaurant_id")
    .eq("user_id", user!.id)
    .single() as { data: Pick<Staff, "restaurant_id"> | null };

  const restaurantId = staff!.restaurant_id;

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*), tables(number)")
    .eq("restaurant_id", restaurantId)
    .in("status", ["pending", "done"])
    .order("created_at", { ascending: false }) as { data: AdminOrder[] | null };

  return (
    <OrdersClient
      restaurantId={restaurantId}
      initialOrders={orders || []}
    />
  );
}
