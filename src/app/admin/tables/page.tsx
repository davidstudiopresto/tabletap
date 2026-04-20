import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TablesManager } from "./tables-manager";
import type { Staff } from "@/types/database";

type StaffWithSlug = Pick<Staff, "restaurant_id"> & {
  restaurants: { slug: string } | null;
};

export default async function AdminTablesPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("restaurant_id, restaurants(slug)")
    .eq("user_id", user!.id)
    .single() as { data: StaffWithSlug | null };

  const restaurantId = staff!.restaurant_id;
  const restaurantSlug = staff!.restaurants!.slug;

  const { data: tables } = await supabase
    .from("tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("number");

  return (
    <TablesManager
      restaurantId={restaurantId}
      restaurantSlug={restaurantSlug}
      initialTables={tables || []}
    />
  );
}
