"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Check, Pencil, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ExtractedItem {
  number: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface ExtractedCategory {
  name: string;
  items: ExtractedItem[];
}

export default function OnboardingPage() {
  const [step, setStep] = useState<"upload" | "extracting" | "review" | "saving" | "done">("upload");
  const [extractedData, setExtractedData] = useState<ExtractedCategory[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setStep("extracting");

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/menu/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      setExtractedData(data.categories);
      setStep("review");
    } catch {
      toast.error("Erreur lors de l'extraction du menu");
      setStep("upload");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const updateItem = (catIdx: number, itemIdx: number, field: string, value: string | number) => {
    setExtractedData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[catIdx].items[itemIdx][field] = value;
      return copy;
    });
  };

  const removeItem = (catIdx: number, itemIdx: number) => {
    setExtractedData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[catIdx].items.splice(itemIdx, 1);
      if (copy[catIdx].items.length === 0) copy.splice(catIdx, 1);
      return copy;
    });
  };

  const updateCategoryName = (catIdx: number, name: string) => {
    setExtractedData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[catIdx].name = name;
      return copy;
    });
  };

  const handleSave = async () => {
    setStep("saving");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: staff } = await supabase
        .from("staff")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .single() as { data: { restaurant_id: string } | null };
      if (!staff) throw new Error("No restaurant");

      const restaurantId = staff.restaurant_id;

      for (let catIdx = 0; catIdx < extractedData.length; catIdx++) {
        const cat = extractedData[catIdx];

        const { data: category } = await (supabase
          .from("categories") as any)
          .insert({
            restaurant_id: restaurantId,
            name: cat.name,
            position: catIdx,
          })
          .select("id")
          .single() as { data: { id: string } | null };

        if (!category) continue;

        const items = cat.items.map((item, itemIdx) => ({
          restaurant_id: restaurantId,
          category_id: category.id,
          number: item.number || null,
          name: item.name,
          description: item.description || null,
          price: item.price,
          position: itemIdx,
        }));

        await (supabase.from("menu_items") as any).insert(items);
      }

      setStep("done");
      toast.success("Menu importé avec succès !");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
      setStep("review");
    }
  };

  if (step === "upload") {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Importer votre carte</h1>
        <p className="text-neutral-500 mb-8">
          Glissez un PDF ou une photo de votre carte, et l&apos;IA extraira automatiquement vos plats.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            dragOver ? "border-[#0A0A0A] bg-neutral-50" : "border-neutral-200"
          }`}
        >
          <Upload className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
          <p className="text-base font-medium mb-1">Glissez vos fichiers ici</p>
          <p className="text-sm text-neutral-400 mb-4">PDF, JPG ou PNG</p>
          <label className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#0A0A0A] text-white text-sm font-medium cursor-pointer">
            <FileText className="w-4 h-4" />
            Choisir un fichier
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  }

  if (step === "extracting") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-400 mb-4" />
        <p className="text-lg font-medium">Analyse de votre carte en cours...</p>
        <p className="text-sm text-neutral-400 mt-1">
          L&apos;IA lit et structure votre menu
        </p>
      </div>
    );
  }

  if (step === "saving") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-400 mb-4" />
        <p className="text-lg font-medium">Sauvegarde du menu...</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Check className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Menu importé !</h1>
        <p className="text-neutral-500 mb-6">
          Vos catégories et plats ont été ajoutés au menu.
        </p>
        <a
          href="/admin"
          className="h-12 px-8 rounded-full bg-[#0A0A0A] text-white font-medium flex items-center justify-center"
        >
          Voir le menu
        </a>
      </div>
    );
  }

  // Review step
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vérifier le menu extrait</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Corrigez les erreurs avant de sauvegarder
          </p>
        </div>
        <button
          onClick={handleSave}
          className="h-10 px-6 rounded-full bg-[#0A0A0A] text-white text-sm font-medium"
        >
          Sauvegarder le menu
        </button>
      </div>

      <div className="space-y-6">
        {extractedData.map((cat, catIdx) => (
          <div key={catIdx} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
              <input
                type="text"
                value={cat.name}
                onChange={(e) => updateCategoryName(catIdx, e.target.value)}
                className="flex-1 text-base font-semibold bg-transparent focus:outline-none"
              />
              <span className="text-xs text-neutral-400">
                {cat.items.length} plat{cat.items.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-neutral-50">
              {cat.items.map((item, itemIdx) => (
                <div key={itemIdx} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={item.number}
                      onChange={(e) => updateItem(catIdx, itemIdx, "number", e.target.value)}
                      placeholder="N°"
                      className="w-14 text-xs text-neutral-400 bg-transparent focus:outline-none border-b border-transparent focus:border-neutral-300"
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(catIdx, itemIdx, "name", e.target.value)}
                      className="flex-1 text-sm font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-neutral-300"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(catIdx, itemIdx, "price", parseFloat(e.target.value) || 0)}
                      className="w-20 text-sm font-medium text-right bg-transparent focus:outline-none border-b border-transparent focus:border-neutral-300"
                    />
                    <button
                      onClick={() => removeItem(catIdx, itemIdx)}
                      className="p-1 text-neutral-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(catIdx, itemIdx, "description", e.target.value)}
                    placeholder="Description (optionnel)"
                    className="w-full text-xs text-neutral-400 bg-transparent focus:outline-none border-b border-transparent focus:border-neutral-300 ml-16"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
