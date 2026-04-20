"use client";

import { useState } from "react";
import { X, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { generatePublicId } from "@/lib/sticker-id";
import type { QrSticker, Table } from "@/types/database";

type StickerWithTable = QrSticker & {
  tables: Pick<Table, "id" | "number"> | null;
};

interface Props {
  restaurantId: string;
  onGenerated: (stickers: StickerWithTable[]) => void;
  onClose: () => void;
}

export function BatchGenerateDialog({
  restaurantId,
  onGenerated,
  onClose,
}: Props) {
  const [quantity, setQuantity] = useState(10);
  const [labelPrefix, setLabelPrefix] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 100) return;
    setGenerating(true);

    try {
      const supabase = createClient();
      const stickersToInsert = Array.from({ length: quantity }, (_, i) => ({
        public_id: generatePublicId(),
        restaurant_id: restaurantId,
        label: labelPrefix ? `${labelPrefix} ${i + 1}` : null,
      }));

      const { data, error } = await (supabase
        .from("qr_stickers") as any)
        .insert(stickersToInsert)
        .select() as { data: QrSticker[] | null; error: unknown };

      if (error) throw error;

      const withTables: StickerWithTable[] = (data || []).map((s) => ({
        ...s,
        tables: null,
      }));

      onGenerated(withTables);
      toast.success(`${quantity} stickers générés`);
      onClose();
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Générer des stickers</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-500 mb-1">
              Quantité (1-100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-500 mb-1">
              Préfixe de label (optionnel)
            </label>
            <input
              type="text"
              placeholder="ex: Terrasse"
              value={labelPrefix}
              onChange={(e) => setLabelPrefix(e.target.value)}
              className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            {labelPrefix && (
              <p className="text-xs text-neutral-400 mt-1">
                Labels: {labelPrefix} 1, {labelPrefix} 2, ... {labelPrefix} {quantity}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-12 rounded-full bg-[#0A0A0A] text-white font-medium mt-4 disabled:opacity-50"
        >
          {generating ? "Génération..." : `Générer ${quantity} stickers`}
        </button>
      </div>
    </div>
  );
}
