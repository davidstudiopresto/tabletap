"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Restaurant } from "@/types/database";

interface Props {
  restaurant: Restaurant;
  userEmail: string;
}

export function SettingsClient({ restaurant, userEmail }: Props) {
  const router = useRouter();
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
      router.refresh();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingName(false);
    }
  };

  const passwordErrors = (): string[] => {
    const errors: string[] = [];
    if (newPassword.length > 0 && newPassword.length < 8) errors.push("8 caractères minimum");
    if (newPassword.length > 0 && !/[A-Z]/.test(newPassword)) errors.push("1 majuscule");
    if (newPassword.length > 0 && !/[0-9]/.test(newPassword)) errors.push("1 chiffre");
    return errors;
  };

  const canSubmitPassword =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    newPassword === confirmPassword;

  const handleChangePassword = async () => {
    if (!canSubmitPassword) return;
    setSavingPassword(true);
    try {
      const supabase = createClient();

      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) {
        toast.error("Mot de passe actuel incorrect");
        setSavingPassword(false);
        return;
      }

      // Update password
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

  const errors = passwordErrors();

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
            placeholder="Mot de passe actuel"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
          <div>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full h-12 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                newPassword.length > 0 && errors.length > 0
                  ? "border-red-300"
                  : "border-neutral-200"
              }`}
            />
            {newPassword.length > 0 && errors.length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                Requis : {errors.join(", ")}
              </p>
            )}
            {newPassword.length >= 8 && errors.length === 0 && (
              <p className="text-xs text-green-600 mt-1">Mot de passe valide</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full h-12 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                confirmPassword.length > 0 && confirmPassword !== newPassword
                  ? "border-red-300"
                  : "border-neutral-200"
              }`}
            />
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={savingPassword || !canSubmitPassword}
          className="w-full h-10 rounded-full bg-[#0A0A0A] text-white text-sm font-medium mt-3 disabled:opacity-50"
        >
          {savingPassword ? "Mise à jour..." : "Changer le mot de passe"}
        </button>
      </section>
    </div>
  );
}
