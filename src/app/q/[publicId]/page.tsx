import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { SessionInitClient } from "@/components/session-init";
import { StickerError } from "./sticker-error";
import type { QrSticker, Table, Restaurant } from "@/types/database";

type StickerWithRelations = QrSticker & {
  tables: (Table & { restaurants: Restaurant | null }) | null;
};

export default async function QRStickerPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: sticker } = await supabase
    .from("qr_stickers")
    .select("*, tables(*, restaurants(*))")
    .eq("public_id", publicId)
    .single() as { data: StickerWithRelations | null };

  if (!sticker) {
    return <StickerError type="not-found" />;
  }

  // Increment scan count (fire-and-forget via service role)
  const serviceClient = createServiceRoleClient();
  (serviceClient as any).rpc("increment_scan", { sticker_public_id: publicId });

  if (sticker.status === "disabled") {
    return <StickerError type="disabled" />;
  }

  if (sticker.status === "unassigned" || !sticker.tables) {
    return <StickerError type="unassigned" restaurantName={undefined} />;
  }

  const table = sticker.tables;
  const restaurant = table.restaurants;

  if (!restaurant) {
    return <StickerError type="not-found" />;
  }

  return (
    <SessionInitClient
      tableId={table.id}
      tableNumber={table.number}
      restaurantId={restaurant.id}
      restaurantSlug={restaurant.slug}
      restaurantName={restaurant.name}
    />
  );
}
