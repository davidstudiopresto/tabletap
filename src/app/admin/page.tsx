import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuManager } from "./menu-manager";
import type { Staff } from "@/types/database";

export default async function AdminMenuPage() {
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

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("position");

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("position");

  return (
    <MenuManager
      restaurantId={restaurantId}
      initialCategories={categories || []}
      initialMenuItems={menuItems || []}
    />
  );
}
