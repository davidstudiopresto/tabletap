"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/lib/format";

interface Props {
  restaurantSlug: string;
}

export function CartBar({ restaurantSlug }: Props) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);

  const count = getItemCount();
  const total = getTotal();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30"
        >
          <button
            onClick={() => router.push(`/r/${restaurantSlug}/cart`)}
            className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base flex items-center justify-between px-6 shadow-lg shadow-black/20"
          >
            <span>Voir la commande</span>
            <span>
              {count} article{count > 1 ? "s" : ""} · {formatPrice(total)}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
