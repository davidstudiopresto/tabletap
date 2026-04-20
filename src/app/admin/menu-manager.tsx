"use client";

import { useState } from "react";
import { Plus, GripVertical, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { CategoryDialog } from "./category-dialog";
import { MenuItemDialog } from "./menu-item-dialog";
import type { Category, MenuItem } from "@/types/database";

interface Props {
  restaurantId: string;
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
}

function SortableCategoryItem({
  category,
  items,
  onEditCategory,
  onDeleteCategory,
  onEditItem,
  onDeleteItem,
  onAddItem,
}: {
  category: Category;
  items: MenuItem[];
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;
  onEditItem: (i: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (categoryId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
        <button {...attributes} {...listeners} className="cursor-grab text-neutral-300 hover:text-neutral-500">
          <GripVertical className="w-5 h-5" />
        </button>
        <h3 className="flex-1 font-semibold text-base">{category.name}</h3>
        <span className="text-xs text-neutral-400 mr-2">{items.length} plat{items.length > 1 ? "s" : ""}</span>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <button onClick={() => onEditCategory(category)} className="p-1 text-neutral-400 hover:text-[#0A0A0A]">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDeleteCategory(category.id)} className="p-1 text-neutral-400 hover:text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {!collapsed && (
        <div className="divide-y divide-neutral-50">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  {item.number && <span className="text-xs text-neutral-400">{item.number}</span>}
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
                <span className="text-sm text-neutral-500">{formatPrice(item.price)}</span>
                {!item.available && (
                  <span className="ml-2 text-xs text-red-500">Indisponible</span>
                )}
              </div>
              <button onClick={() => onEditItem(item)} className="p-1.5 text-neutral-400 hover:text-[#0A0A0A]">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDeleteItem(item.id)} className="p-1.5 text-neutral-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddItem(category.id)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500 hover:text-[#0A0A0A] w-full"
          >
            <Plus className="w-4 h-4" />
            Ajouter un plat
          </button>
        </div>
      )}
    </div>
  );
}

export function MenuManager({ restaurantId, initialCategories, initialMenuItems }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((cat, i) =>
        supabase.from("categories").update({ position: i }).eq("id", cat.id)
      )
    );
  };

  const handleDeleteCategory = async (id: string) => {
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setMenuItems((prev) => prev.filter((i) => i.category_id !== id));
    toast.success("Catégorie supprimée");
  };

  const handleDeleteItem = async (id: string) => {
    const supabase = createClient();
    await supabase.from("menu_items").delete().eq("id", id);
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Plat supprimé");
  };

  const handleCategorySave = (cat: Category) => {
    if (editingCategory) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
    } else {
      setCategories((prev) => [...prev, cat]);
    }
    setShowCategoryDialog(false);
    setEditingCategory(null);
  };

  const handleItemSave = (item: MenuItem) => {
    if (editingItem) {
      setMenuItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    } else {
      setMenuItems((prev) => [...prev, item]);
    }
    setShowItemDialog(false);
    setEditingItem(null);
    setNewItemCategoryId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowCategoryDialog(true);
          }}
          className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#0A0A0A] text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Catégorie
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {categories.map((cat) => (
              <SortableCategoryItem
                key={cat.id}
                category={cat}
                items={menuItems.filter((i) => i.category_id === cat.id)}
                onEditCategory={(c) => {
                  setEditingCategory(c);
                  setShowCategoryDialog(true);
                }}
                onDeleteCategory={handleDeleteCategory}
                onEditItem={(item) => {
                  setEditingItem(item);
                  setShowItemDialog(true);
                }}
                onDeleteItem={handleDeleteItem}
                onAddItem={(categoryId) => {
                  setEditingItem(null);
                  setNewItemCategoryId(categoryId);
                  setShowItemDialog(true);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {categories.length === 0 && (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-lg mb-2">Aucune catégorie</p>
          <p className="text-sm">Commencez par créer une catégorie ou importez votre carte</p>
        </div>
      )}

      {showCategoryDialog && (
        <CategoryDialog
          restaurantId={restaurantId}
          category={editingCategory}
          onSave={handleCategorySave}
          onClose={() => {
            setShowCategoryDialog(false);
            setEditingCategory(null);
          }}
        />
      )}

      {showItemDialog && (
        <MenuItemDialog
          restaurantId={restaurantId}
          categoryId={newItemCategoryId || editingItem?.category_id || categories[0]?.id || ""}
          item={editingItem}
          categories={categories}
          onSave={handleItemSave}
          onClose={() => {
            setShowItemDialog(false);
            setEditingItem(null);
            setNewItemCategoryId(null);
          }}
        />
      )}
    </div>
  );
}
