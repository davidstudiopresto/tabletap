"use client";

import { useState } from "react";
import { Plus, Trash2, Download, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Table } from "@/types/database";

interface Props {
  restaurantId: string;
  restaurantSlug: string;
  initialTables: Table[];
}

export function TablesManager({ restaurantId, restaurantSlug, initialTables }: Props) {
  const [tables, setTables] = useState(initialTables);
  const [adding, setAdding] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleAddTable = async () => {
    setAdding(true);
    try {
      const supabase = createClient();
      const nextNumber =
        tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;

      const { data, error } = await supabase
        .from("tables")
        .insert({ restaurant_id: restaurantId, number: nextNumber })
        .select()
        .single();

      if (error) throw error;
      setTables((prev) => [...prev, data]);
      toast.success(`Table ${nextNumber} créée`);
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteTable = async (id: string, number: number) => {
    const supabase = createClient();
    await supabase.from("tables").delete().eq("id", id);
    setTables((prev) => prev.filter((t) => t.id !== id));
    toast.success(`Table ${number} supprimée`);
  };

  const handleDownloadQR = async (table: Table) => {
    try {
      const res = await fetch(`/api/qr?token=${table.qr_token}&table=${table.number}&slug=${restaurantSlug}`);
      if (!res.ok) throw new Error("QR generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `table-${table.number}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors de la génération du QR");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
        <button
          onClick={handleAddTable}
          disabled={adding}
          className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#0A0A0A] text-white text-sm font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Ajouter une table
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg mb-1">Aucune table</p>
          <p className="text-sm">Ajoutez des tables pour générer les QR codes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-2xl border border-neutral-200 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Table {table.number}</h3>
                <button
                  onClick={() => handleDeleteTable(table.id, table.number)}
                  className="p-1.5 text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-neutral-400 mb-4 font-mono break-all">
                {appUrl}/t/{table.qr_token}
              </div>

              <button
                onClick={() => handleDownloadQR(table)}
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
              >
                <Download className="w-4 h-4" />
                Télécharger QR code
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
