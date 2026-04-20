import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import type { Staff, Restaurant } from "@/types/database";

type StaffWithRestaurant = Staff & { restaurants: Restaurant | null };

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("*, restaurants(*)")
    .eq("user_id", user!.id)
    .single() as { data: StaffWithRestaurant | null };

  const restaurant = staffRecord!.restaurants!;

  return (
    <SettingsClient
      restaurant={restaurant}
      userEmail={user!.email || ""}
    />
  );
}
