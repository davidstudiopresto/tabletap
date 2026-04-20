import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SessionInitClient } from "@/components/session-init";
import type { Table, Restaurant, QrSticker } from "@/types/database";

type TableWithRestaurant = Table & { restaurants: Restaurant | null };

export default async function QREntryPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: table } = await supabase
    .from("tables")
    .select("*, restaurants(*)")
    .eq("qr_token", qrToken)
    .single() as { data: TableWithRestaurant | null };

  if (!table || !table.restaurants) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">QR code invalide</h1>
        <p className="text-neutral-500">
          Ce QR code ne correspond à aucune table.
        </p>
      </div>
    );
  }

  // Try to find the new sticker assigned to this table and redirect
  const { data: sticker } = await supabase
    .from("qr_stickers")
    .select("public_id")
    .eq("assigned_table_id", table.id)
    .single() as { data: Pick<QrSticker, "public_id"> | null };

  if (sticker) {
    redirect(`/q/${sticker.public_id}`);
  }

  // Fallback: no sticker yet, use legacy flow
  const restaurant = table.restaurants;

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
