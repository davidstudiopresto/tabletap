"use client";

import { useState } from "react";
import { Plus, Trash2, Download, QrCode, Package, Ban, CheckCircle2, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatTime } from "@/lib/format";
import { BatchGenerateDialog } from "../stickers/batch-generate-dialog";
import type { Table, QrSticker } from "@/types/database";
import JSZip from "jszip";

type StickerWithTable = QrSticker & {
  tables: Pick<Table, "id" | "number"> | null;
};

interface Props {
  restaurantId: string;
  initialTables: Table[];
  initialStickers: StickerWithTable[];
}

export function TablesManager({ restaurantId, initialTables, initialStickers }: Props) {
  const [tables, setTables] = useState(initialTables);
  const [stickers, setStickers] = useState<StickerWithTable[]>(initialStickers);
  const [adding, setAdding] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  // Sticker assigned to each table
  const stickerForTable = (tableId: string) =>
    stickers.find((s) => s.assigned_table_id === tableId && s.status === "assigned");

  // Unassigned stickers
  const unassignedStickers = stickers.filter((s) => s.status === "unassigned");
  const disabledStickers = stickers.filter((s) => s.status === "disabled");

  const handleAddTable = async () => {
    setAdding(true);
    try {
      const supabase = createClient();
      const nextNumber =
        tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
      const { data, error } = await (supabase
        .from("tables") as any)
        .insert({ restaurant_id: restaurantId, number: nextNumber })
        .select()
        .single() as { data: Table | null; error: any };
      if (error || !data) throw error;
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
    await (supabase.from("tables") as any).delete().eq("id", id);
    setTables((prev) => prev.filter((t) => t.id !== id));
    // Unassign any sticker linked to this table
    setStickers((prev) =>
      prev.map((s) =>
        s.assigned_table_id === id
          ? { ...s, assigned_table_id: null, status: "unassigned" as const, tables: null }
          : s
      )
    );
    toast.success(`Table ${number} supprimée`);
  };

  const assignSticker = async (stickerId: string, tableId: string) => {
    const supabase = createClient();
    const table = tables.find((t) => t.id === tableId);
    const { error } = await (supabase.from("qr_stickers") as any)
      .update({ assigned_table_id: tableId, status: "assigned" })
      .eq("id", stickerId);
    if (error) { toast.error("Erreur"); return; }
    setStickers((prev) =>
      prev.map((s) =>
        s.id === stickerId
          ? { ...s, assigned_table_id: tableId, status: "assigned" as const, tables: table ? { id: table.id, number: table.number } : null }
          : s
      )
    );
    toast.success(`QR assigné à la table ${table?.number}`);
  };

  const unassignSticker = async (stickerId: string) => {
    const supabase = createClient();
    const { error } = await (supabase.from("qr_stickers") as any)
      .update({ assigned_table_id: null, status: "unassigned" })
      .eq("id", stickerId);
    if (error) { toast.error("Erreur"); return; }
    setStickers((prev) =>
      prev.map((s) =>
        s.id === stickerId
          ? { ...s, assigned_table_id: null, status: "unassigned" as const, tables: null }
          : s
      )
    );
    toast.success("QR désassigné");
  };

  const toggleDisable = async (sticker: StickerWithTable) => {
    const supabase = createClient();
    const newStatus = sticker.status === "disabled"
      ? (sticker.assigned_table_id ? "assigned" : "unassigned")
      : "disabled";
    const { error } = await (supabase.from("qr_stickers") as any)
      .update({ status: newStatus })
      .eq("id", sticker.id);
    if (error) { toast.error("Erreur"); return; }
    setStickers((prev) =>
      prev.map((s) =>
        s.id === sticker.id ? { ...s, status: newStatus as "unassigned" | "assigned" | "disabled" } : s
      )
    );
    toast.success(newStatus === "disabled" ? "QR désactivé" : "QR réactivé");
  };

  const downloadQR = async (sticker: QrSticker) => {
    const res = await fetch(`/api/qr?publicId=${sticker.public_id}&label=${sticker.label || sticker.public_id}`);
    if (!res.ok) { toast.error("Erreur"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${sticker.label || sticker.public_id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      const active = stickers.filter((s) => s.status !== "disabled");
      for (const s of active) {
        const res = await fetch(`/api/qr?publicId=${s.public_id}&label=${s.label || s.public_id}`);
        if (res.ok) zip.file(`qr-${s.label || s.public_id}.png`, await res.blob());
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-codes-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${active.length} QR codes téléchargés`);
    } catch {
      toast.error("Erreur");
    } finally {
      setDownloadingAll(false);
    }
  };

  const onBatchGenerated = (newStickers: StickerWithTable[]) => {
    setStickers((prev) => [...newStickers, ...prev]);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tables & QR codes</h1>
        <div className="flex gap-2">
          {stickers.length > 0 && (
            <button
              onClick={downloadAllAsZip}
              disabled={downloadingAll}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingAll ? "..." : "ZIP"}
            </button>
          )}
          <button
            onClick={() => setShowBatchDialog(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
          >
            <Package className="w-4 h-4" />
            Générer QR
          </button>
          <button
            onClick={handleAddTable}
            disabled={adding}
            className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#0A0A0A] text-white text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Table
          </button>
        </div>
      </div>

      {/* Tables with their stickers */}
      {tables.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg mb-1">Aucune table</p>
          <p className="text-sm">Ajoutez des tables puis assignez-leur des QR codes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {tables.map((table) => {
            const sticker = stickerForTable(table.id);
            return (
              <div key={table.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                {/* Table header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold">Table {table.number}</h3>
                  <button
                    onClick={() => handleDeleteTable(table.id, table.number)}
                    className="p-1.5 text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {sticker ? (
                  <>
                    {/* Sticker assigned */}
                    <div className="bg-green-50 rounded-lg px-3 py-2 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-green-700">{sticker.public_id}</span>
                        <button
                          onClick={() => unassignSticker(sticker.id)}
                          className="text-xs text-green-600 hover:text-red-600"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 font-mono mb-2 truncate">
                      {appUrl}/q/{sticker.public_id}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {sticker.scan_count} scans
                      </span>
                      <button
                        onClick={() => downloadQR(sticker)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-200 text-xs font-medium hover:bg-neutral-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        QR code
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* No sticker — assign one */}
                    {unassignedStickers.length > 0 ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) assignSticker(e.target.value, table.id);
                        }}
                        className="w-full h-10 rounded-xl border border-dashed border-neutral-300 px-3 text-sm text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                      >
                        <option value="" disabled>
                          Assigner un QR code...
                        </option>
                        {unassignedStickers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label || s.public_id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-center py-3 text-neutral-400 text-sm border border-dashed border-neutral-200 rounded-xl">
                        <p>Aucun QR disponible</p>
                        <button
                          onClick={() => setShowBatchDialog(true)}
                          className="text-neutral-600 underline text-xs mt-1"
                        >
                          Générer des QR codes
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned stickers stock */}
      {unassignedStickers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            QR codes disponibles
            <span className="text-sm font-normal text-neutral-400 ml-2">
              {unassignedStickers.length} en stock
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unassignedStickers.map((sticker) => (
              <div key={sticker.id} className="bg-white rounded-xl border border-dashed border-neutral-300 p-3">
                <code className="text-sm font-mono font-medium">{sticker.public_id}</code>
                {sticker.label && (
                  <p className="text-xs text-neutral-400 mt-0.5">{sticker.label}</p>
                )}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => downloadQR(sticker)}
                    className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg border border-neutral-200 text-xs hover:bg-neutral-50"
                  >
                    <Download className="w-3 h-3" />
                    PNG
                  </button>
                  <button
                    onClick={() => toggleDisable(sticker)}
                    className="h-7 px-2 rounded-lg border border-neutral-200 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Ban className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disabled stickers */}
      {disabledStickers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-neutral-400">
            Désactivés
            <span className="text-sm font-normal ml-2">{disabledStickers.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {disabledStickers.map((sticker) => (
              <div key={sticker.id} className="bg-neutral-50 rounded-xl border border-neutral-200 p-3 opacity-60">
                <code className="text-sm font-mono">{sticker.public_id}</code>
                <button
                  onClick={() => toggleDisable(sticker)}
                  className="flex items-center gap-1 mt-2 text-xs text-green-600"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Réactiver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBatchDialog && (
        <BatchGenerateDialog
          restaurantId={restaurantId}
          onGenerated={onBatchGenerated}
          onClose={() => setShowBatchDialog(false)}
        />
      )}
    </div>
  );
}
