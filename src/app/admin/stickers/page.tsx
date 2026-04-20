import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StickersManager } from "./stickers-manager";
import type { Staff, QrSticker, Table } from "@/types/database";

type StickerWithTable = QrSticker & {
  tables: Pick<Table, "id" | "number"> | null;
};

export default async function AdminStickersPage() {
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

  const { data: stickers } = await supabase
    .from("qr_stickers")
    .select("*, tables(id, number)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false }) as { data: StickerWithTable[] | null };

  const { data: tables } = await supabase
    .from("tables")
    .select("id, number")
    .eq("restaurant_id", restaurantId)
    .order("number");

  return (
    <StickersManager
      restaurantId={restaurantId}
      initialStickers={stickers || []}
      tables={tables || []}
    />
  );
}
