import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, restaurantName } = await request.json();

    if (!email || !password || !restaurantName?.trim()) {
      return Response.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return Response.json({ error: "Mot de passe trop faible" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Create user (auto-confirms with service role)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return Response.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
      }
      return Response.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return Response.json({ error: "Erreur lors de la création du compte" }, { status: 500 });
    }

    // 2. Create restaurant
    const slug =
      restaurantName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const { data: restaurant, error: restoError } = await supabase
      .from("restaurants")
      .insert({ name: restaurantName.trim(), slug })
      .select("id")
      .single();

    if (restoError || !restaurant) {
      // Cleanup: delete the user we just created
      await supabase.auth.admin.deleteUser(authData.user.id);
      return Response.json({ error: "Erreur lors de la création du restaurant" }, { status: 500 });
    }

    // 3. Create staff (admin)
    const { error: staffError } = await supabase
      .from("staff")
      .insert({
        user_id: authData.user.id,
        restaurant_id: restaurant.id,
        role: "admin",
      });

    if (staffError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return Response.json({ error: "Erreur lors de la configuration" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
