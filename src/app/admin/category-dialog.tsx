"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Category } from "@/types/database";

interface Props {
  restaurantId: string;
  category: Category | null;
  onSave: (category: Category) => void;
  onClose: () => void;
}

export function CategoryDialog({ restaurantId, category, onSave, onClose }: Props) {
  const [name, setName] = useState(category?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      const supabase = createClient();

      if (category) {
        const { data, error } = await supabase
          .from("categories")
          .update({ name: name.trim() })
          .eq("id", category.id)
          .select()
          .single();
        if (error) throw error;
        onSave(data);
        toast.success("Catégorie mise à jour");
      } else {
        const { data, error } = await supabase
          .from("categories")
          .insert({ restaurant_id: restaurantId, name: name.trim() })
          .select()
          .single();
        if (error) throw error;
        onSave(data);
        toast.success("Catégorie créée");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="w-5 h-5 text-neutral-400" />
        </button>
        <h2 className="text-lg font-semibold mb-4">
          {category ? "Modifier la catégorie" : "Nouvelle catégorie"}
        </h2>
        <input
          type="text"
          placeholder="Nom de la catégorie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 mb-4"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white font-medium disabled:opacity-50"
        >
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
