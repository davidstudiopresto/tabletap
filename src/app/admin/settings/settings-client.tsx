"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Restaurant } from "@/types/database";

interface Props {
  restaurant: Restaurant;
  userEmail: string;
}

export function SettingsClient({ restaurant, userEmail }: Props) {
  const [name, setName] = useState(restaurant.name);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from("restaurants") as any)
        .update({ name: name.trim() })
        .eq("id", restaurant.id);
      if (error) throw error;
      toast.success("Nom mis à jour");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Mot de passe mis à jour");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erreur lors du changement de mot de passe");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Paramètres</h1>

      {/* Restaurant name */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
        <h2 className="font-semibold mb-3">Restaurant</h2>
        <label className="block text-sm text-neutral-500 mb-1">Nom du restaurant</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 mb-3"
        />
        <button
          onClick={handleSaveName}
          disabled={savingName || !name.trim() || name.trim() === restaurant.name}
          className="w-full h-10 rounded-full bg-[#0A0A0A] text-white text-sm font-medium disabled:opacity-50"
        >
          {savingName ? "Sauvegarde..." : "Enregistrer"}
        </button>
      </section>

      {/* Password */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
        <h2 className="font-semibold mb-3">Mot de passe</h2>
        <p className="text-sm text-neutral-500 mb-3">{userEmail}</p>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={savingPassword || !newPassword}
          className="w-full h-10 rounded-full bg-[#0A0A0A] text-white text-sm font-medium mt-3 disabled:opacity-50"
        >
          {savingPassword ? "Mise à jour..." : "Changer le mot de passe"}
        </button>
      </section>
    </div>
  );
}
