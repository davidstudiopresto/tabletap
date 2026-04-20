import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminNav } from "./admin-nav";
import type { Staff, Restaurant } from "@/types/database";

type StaffWithRestaurant = Staff & { restaurants: Restaurant | null };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (!staffRecord || staffRecord.role !== "admin") redirect("/login");

  const restaurant = staffRecord.restaurants!;

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav restaurantName={restaurant.name} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
