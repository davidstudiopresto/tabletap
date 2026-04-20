"use client";

import { useState } from "react";
import { Plus, Trash2, Download, QrCode, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { generatePublicId } from "@/lib/sticker-id";
import type { Table, QrSticker } from "@/types/database";
import JSZip from "jszip";

type TableWithSticker = Table & {
  sticker: QrSticker | null;
};

interface Props {
  restaurantId: string;
  initialTables: TableWithSticker[];
}

export function TablesManager({ restaurantId, initialTables }: Props) {
  const [tables, setTables] = useState<TableWithSticker[]>(initialTables);
  const [adding, setAdding] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const handleAddTable = async () => {
    setAdding(true);
    try {
      const supabase = createClient();
      const nextNumber =
        tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;

      // 1. Create table
      const { data: table, error: tableError } = await (supabase
        .from("tables") as any)
        .insert({ restaurant_id: restaurantId, number: nextNumber })
        .select()
        .single() as { data: Table | null; error: any };

      if (tableError || !table) throw tableError;

      // 2. Create and assign QR code
      const publicId = generatePublicId();
      const { data: sticker, error: stickerError } = await (supabase
        .from("qr_stickers") as any)
        .insert({
          public_id: publicId,
          restaurant_id: restaurantId,
          status: "assigned",
          assigned_table_id: table.id,
          label: `Table ${nextNumber}`,
        })
        .select()
        .single() as { data: QrSticker | null; error: any };

      if (stickerError) throw stickerError;

      setTables((prev) => [...prev, { ...table, sticker }]);
      toast.success(`Table ${nextNumber} créée avec son QR code`);
    } catch (err: any) {
      console.error("Table creation error:", err);
      toast.error(err?.message || "Erreur lors de la création");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteTable = async (tableWithSticker: TableWithSticker) => {
    const supabase = createClient();

    // Delete sticker first if exists
    if (tableWithSticker.sticker) {
      await (supabase.from("qr_stickers") as any)
        .delete()
        .eq("id", tableWithSticker.sticker.id);
    }

    // Delete table
    await (supabase.from("tables") as any)
      .delete()
      .eq("id", tableWithSticker.id);

    setTables((prev) => prev.filter((t) => t.id !== tableWithSticker.id));
    toast.success(`Table ${tableWithSticker.number} supprimée`);
  };

  const downloadQR = async (sticker: QrSticker) => {
    const res = await fetch(`/api/qr?publicId=${sticker.public_id}&label=${sticker.label || sticker.public_id}`);
    if (!res.ok) { toast.error("Erreur"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-table-${sticker.label || sticker.public_id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      for (const t of tables) {
        if (!t.sticker) continue;
        const res = await fetch(`/api/qr?publicId=${t.sticker.public_id}&label=Table-${t.number}`);
        if (res.ok) zip.file(`qr-table-${t.number}.png`, await res.blob());
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-codes-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${tables.length} QR codes téléchargés`);
    } catch {
      toast.error("Erreur");
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tables & QR codes</h1>
        <div className="flex gap-2">
          {tables.length > 1 && (
            <button
              onClick={downloadAllAsZip}
              disabled={downloadingAll}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingAll ? "..." : "Tout télécharger"}
            </button>
          )}
          <button
            onClick={handleAddTable}
            disabled={adding}
            className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#0A0A0A] text-white text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Ajouter une table
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg mb-1">Aucune table</p>
          <p className="text-sm">Ajoutez une table pour générer son QR code automatiquement</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold">Table {table.number}</h3>
                <button
                  onClick={() => handleDeleteTable(table)}
                  className="p-1.5 text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {table.sticker ? (
                <>
                  <p className="text-xs text-neutral-400 font-mono mb-3 truncate">
                    {appUrl}/q/{table.sticker.public_id}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {table.sticker.scan_count} scans
                    </span>
                    <button
                      onClick={() => downloadQR(table.sticker!)}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
                    >
                      <Download className="w-4 h-4" />
                      QR code
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-400">Pas de QR code</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
