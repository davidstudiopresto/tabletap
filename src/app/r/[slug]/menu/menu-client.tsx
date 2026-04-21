"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/lib/format";
import { ItemDetailSheet } from "./item-detail-sheet";
import { CartBar } from "./cart-bar";
import type { Restaurant, Category, MenuItem } from "@/types/database";

interface Props {
  restaurant: Restaurant;
  categories: Category[];
  menuItems: MenuItem[];
}

export function MenuClient({ restaurant, categories, menuItems }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.id || ""
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const tableNumber = useCartStore((s) => s.tableNumber);

  const getItemQty = (itemId: string) => {
    const found = cartItems.find((c) => c.menuItem.id === itemId);
    return found?.quantity || 0;
  };

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: menuItems.filter((item) => item.category_id === cat.id),
  }));

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace("cat-", ""));
          }
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [categories]);

  // Scroll active pill into view
  useEffect(() => {
    const pill = pillRefs.current[activeCategory];
    if (pill && navRef.current) {
      pill.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeCategory]);

  const scrollToCategory = useCallback((catId: string) => {
    setActiveCategory(catId);
    const section = sectionRefs.current[catId];
    if (section) {
      const y = section.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    addItem(item);
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight">
              {restaurant.name}
            </h1>
            {tableNumber && (
              <p className="text-xs text-neutral-400">Table {tableNumber}</p>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div
          ref={navRef}
          className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              ref={(el) => { pillRefs.current[cat.id] = el; }}
              onClick={() => scrollToCategory(cat.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-[#0A0A0A] text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu sections */}
      <div className="px-4">
        {itemsByCategory.map(({ category, items }) => (
          <div
            key={category.id}
            id={`cat-${category.id}`}
            ref={(el) => { sectionRefs.current[category.id] = el; }}
          >
            <h2 className="text-xl font-semibold py-4 tracking-tight">
              {category.name}
            </h2>
            <div className="divide-y divide-neutral-100">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex gap-3 py-4 w-full text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      {item.number && (
                        <span className="text-xs font-medium text-neutral-400 shrink-0">
                          {item.number}
                        </span>
                      )}
                      <h3 className="text-base font-medium truncate">
                        {item.name}
                      </h3>
                    </div>
                    {item.description && (
                      <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-[15px] font-medium mt-1.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {item.image_url && (
                      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-neutral-100 mr-1">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {getItemQty(item.id) > 0 ? (
                      <div className="flex items-center gap-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const qty = getItemQty(item.id);
                            updateQuantity(item.id, qty - 1);
                          }}
                          className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {getItemQty(item.id)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addItem(item);
                          }}
                          className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleQuickAdd(e, item)}
                        className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Item detail sheet */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailSheet
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Cart bar */}
      <CartBar restaurantSlug={restaurant.slug} />
    </div>
  );
}
