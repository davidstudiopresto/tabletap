import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { KitchenClient } from "./kitchen-client";
import type { Staff, Restaurant, Order, OrderItem } from "@/types/database";

type StaffWithRestaurant = Staff & { restaurants: Restaurant | null };
type KitchenOrder = Order & {
  order_items: OrderItem[];
  tables: { number: number } | null;
};

export default async function KitchenPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("*, restaurants(*)")
    .eq("user_id", user.id)
    .single() as { data: StaffWithRestaurant | null };

  if (!staffRecord || !staffRecord.restaurants) redirect("/login");

  const restaurant = staffRecord.restaurants;

  // Fetch initial pending orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*), tables(number)")
    .eq("restaurant_id", restaurant.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true }) as { data: KitchenOrder[] | null };

  return (
    <KitchenClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      initialOrders={orders || []}
    />
  );
}
