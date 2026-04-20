"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/lib/format";
import type { MenuItem } from "@/types/database";

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export function ItemDetailSheet({ item, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    addItem(item, quantity, note);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-auto"
      >
        {/* Image */}
        {item.image_url && (
          <div className="relative w-full aspect-square max-h-[300px] bg-neutral-100">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="px-5 pt-5 pb-32">
          {!item.image_url && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Info */}
          <div className="flex items-baseline gap-2 mb-1">
            {item.number && (
              <span className="text-sm font-medium text-neutral-400">
                {item.number}
              </span>
            )}
            <h2 className="text-[22px] font-semibold tracking-tight">
              {item.name}
            </h2>
          </div>
          <p className="text-[15px] font-medium mb-3">
            {formatPrice(item.price)}
          </p>
          {item.description && (
            <p className="text-sm text-neutral-500 mb-5">{item.description}</p>
          )}

          {/* Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Allergies, préférences..."
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />

          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-xl font-semibold w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100">
          <button
            onClick={handleAdd}
            className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base"
          >
            Ajouter {formatPrice(item.price * quantity)}
          </button>
        </div>
      </motion.div>
    </>
  );
}
