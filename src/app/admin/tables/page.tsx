import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TablesManager } from "./tables-manager";
import type { QrSticker, Table } from "@/types/database";

export default async function AdminTablesPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("restaurant_id, restaurants(name)")
    .eq("user_id", user!.id)
    .single() as { data: { restaurant_id: string; restaurants: { name: string } | null } | null };

  const restaurantId = staff!.restaurant_id;
  const restaurantName = staff!.restaurants?.name || "Restaurant";

  const { data: tables } = await supabase
    .from("tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("number") as { data: Table[] | null };

  const { data: stickers } = await supabase
    .from("qr_stickers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "assigned") as { data: QrSticker[] | null };

  // Join stickers to tables
  const tablesWithStickers = (tables || []).map((table) => ({
    ...table,
    sticker: (stickers || []).find((s) => s.assigned_table_id === table.id) || null,
  }));

  return (
    <TablesManager
      restaurantId={restaurantId}
      restaurantName={restaurantName}
      initialTables={tablesWithStickers}
    />
  );
}
