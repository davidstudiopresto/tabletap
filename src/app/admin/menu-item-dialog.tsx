"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Category, MenuItem } from "@/types/database";

interface Props {
  restaurantId: string;
  categoryId: string;
  item: MenuItem | null;
  categories: Category[];
  onSave: (item: MenuItem) => void;
  onClose: () => void;
}

export function MenuItemDialog({
  restaurantId,
  categoryId,
  item,
  categories,
  onSave,
  onClose,
}: Props) {
  const [formData, setFormData] = useState({
    number: item?.number || "",
    name: item?.name || "",
    description: item?.description || "",
    price: item?.price?.toString() || "",
    category_id: item?.category_id || categoryId,
    available: item?.available ?? true,
    image_url: item?.image_url || "",
  });
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.price) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const payload = {
        restaurant_id: restaurantId,
        category_id: formData.category_id,
        number: formData.number.trim() || null,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        available: formData.available,
        image_url: formData.image_url.trim() || null,
      };

      if (item) {
        const { data, error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", item.id)
          .select()
          .single();
        if (error) throw error;
        onSave(data);
        toast.success("Plat mis à jour");
      } else {
        const { data, error } = await supabase
          .from("menu_items")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        onSave(data);
        toast.success("Plat créé");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 my-8">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="w-5 h-5 text-neutral-400" />
        </button>
        <h2 className="text-lg font-semibold mb-4">
          {item ? "Modifier le plat" : "Nouveau plat"}
        </h2>

        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="N° (ex: H1)"
              value={formData.number}
              onChange={(e) => update("number", e.target.value)}
              className="w-20 h-12 rounded-xl border border-neutral-200 px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <input
              type="text"
              placeholder="Nom du plat"
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              className="flex-1 h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          <textarea
            placeholder="Description (optionnel)"
            value={formData.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />

          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Prix (€)"
              step="0.01"
              value={formData.price}
              onChange={(e) => update("price", e.target.value)}
              className="w-28 h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <select
              value={formData.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              className="flex-1 h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="URL image (optionnel)"
            value={formData.image_url}
            onChange={(e) => update("image_url", e.target.value)}
            className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.available}
              onChange={(e) => update("available", e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300"
            />
            <span className="text-sm">Disponible</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !formData.name.trim() || !formData.price}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white font-medium mt-4 disabled:opacity-50"
        >
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
