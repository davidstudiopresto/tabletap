import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MenuClient } from "./menu-client";
import type { Restaurant, Category, MenuItem } from "@/types/database";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single() as { data: Restaurant | null };

  if (!restaurant) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("position") as { data: Category[] | null };

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("available", true)
    .order("position") as { data: MenuItem[] | null };

  return (
    <MenuClient
      restaurant={restaurant}
      categories={categories || []}
      menuItems={menuItems || []}
    />
  );
}
