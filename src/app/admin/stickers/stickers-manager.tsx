"use client";

import { useState } from "react";
import {
  Download,
  QrCode,
  Link2,
  Link2Off,
  Ban,
  CheckCircle2,
  Package,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatTime } from "@/lib/format";
import { BatchGenerateDialog } from "./batch-generate-dialog";
import type { QrSticker, Table } from "@/types/database";
import JSZip from "jszip";

type StickerWithTable = QrSticker & {
  tables: Pick<Table, "id" | "number"> | null;
};

interface Props {
  restaurantId: string;
  initialStickers: StickerWithTable[];
  tables: Pick<Table, "id" | "number">[];
}

type FilterStatus = "all" | "unassigned" | "assigned" | "disabled";

export function StickersManager({
  restaurantId,
  initialStickers,
  tables,
}: Props) {
  const [stickers, setStickers] = useState<StickerWithTable[]>(initialStickers);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const counts = {
    total: stickers.length,
    unassigned: stickers.filter((s) => s.status === "unassigned").length,
    assigned: stickers.filter((s) => s.status === "assigned").length,
    disabled: stickers.filter((s) => s.status === "disabled").length,
  };

  const filtered = stickers.filter((s) =>
    filter === "all" ? true : s.status === filter
  );

  const assignTable = async (stickerId: string, tableId: string) => {
    const supabase = createClient();
    const table = tables.find((t) => t.id === tableId);
    const { error } = await (supabase
      .from("qr_stickers") as any)
      .update({ assigned_table_id: tableId, status: "assigned" })
      .eq("id", stickerId);
    if (error) {
      toast.error("Erreur lors de l'assignation");
      return;
    }
    setStickers((prev) =>
      prev.map((s) =>
        s.id === stickerId
          ? { ...s, assigned_table_id: tableId, status: "assigned" as const, tables: table ? { id: table.id, number: table.number } : null }
          : s
      )
    );
    toast.success(`Sticker assigné à la table ${table?.number}`);
  };

  const unassignTable = async (stickerId: string) => {
    const supabase = createClient();
    const { error } = await (supabase
      .from("qr_stickers") as any)
      .update({ assigned_table_id: null, status: "unassigned" })
      .eq("id", stickerId);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setStickers((prev) =>
      prev.map((s) =>
        s.id === stickerId
          ? { ...s, assigned_table_id: null, status: "unassigned" as const, tables: null }
          : s
      )
    );
    toast.success("Sticker désassigné");
  };

  const toggleDisable = async (sticker: StickerWithTable) => {
    const supabase = createClient();
    const newStatus = sticker.status === "disabled"
      ? (sticker.assigned_table_id ? "assigned" : "unassigned")
      : "disabled";
    const { error } = await (supabase
      .from("qr_stickers") as any)
      .update({ status: newStatus })
      .eq("id", sticker.id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setStickers((prev) =>
      prev.map((s) =>
        s.id === sticker.id ? { ...s, status: newStatus as "unassigned" | "assigned" | "disabled" } : s
      )
    );
    toast.success(newStatus === "disabled" ? "Sticker désactivé" : "Sticker réactivé");
  };

  const downloadQR = async (sticker: StickerWithTable) => {
    const res = await fetch(`/api/qr?publicId=${sticker.public_id}&label=${sticker.label || sticker.public_id}`);
    if (!res.ok) {
      toast.error("Erreur de téléchargement");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sticker-${sticker.label || sticker.public_id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      const toDownload = filtered.filter((s) => s.status !== "disabled");
      for (const sticker of toDownload) {
        const res = await fetch(`/api/qr?publicId=${sticker.public_id}&label=${sticker.label || sticker.public_id}`);
        if (res.ok) {
          const blob = await res.blob();
          zip.file(`sticker-${sticker.label || sticker.public_id}.png`, blob);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stickers-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${toDownload.length} stickers téléchargés`);
    } catch {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloadingAll(false);
    }
  };

  const onBatchGenerated = (newStickers: StickerWithTable[]) => {
    setStickers((prev) => [...newStickers, ...prev]);
  };

  // Tables not yet assigned to any sticker
  const availableTables = tables.filter(
    (t) => !stickers.some((s) => s.assigned_table_id === t.id && s.status === "assigned")
  );

  const statusBadge = (status: string) => {
    const styles = {
      assigned: "bg-green-100 text-green-700",
      unassigned: "bg-yellow-100 text-yellow-700",
      disabled: "bg-red-100 text-red-700",
    };
    const labels = {
      assigned: "Assigné",
      unassigned: "Non assigné",
      disabled: "Désactivé",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || ""}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Stickers QR</h1>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <button
              onClick={downloadAllAsZip}
              disabled={downloadingAll}
              className="flex items-center gap-2 h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingAll ? "Téléchargement..." : "Télécharger ZIP"}
            </button>
          )}
          <button
            onClick={() => setShowBatchDialog(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#0A0A0A] text-white text-sm font-medium"
          >
            <Package className="w-4 h-4" />
            Générer des stickers
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: counts.total, icon: QrCode },
          { label: "Assignés", value: counts.assigned, icon: Link2 },
          { label: "Non assignés", value: counts.unassigned, icon: Link2Off },
          { label: "Désactivés", value: counts.disabled, icon: Ban },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <span className="text-xl font-bold">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "unassigned", "assigned", "disabled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-[#0A0A0A] text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {f === "all" ? "Tous" : f === "unassigned" ? "Non assignés" : f === "assigned" ? "Assignés" : "Désactivés"}
          </button>
        ))}
      </div>

      {/* Stickers grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg mb-1">Aucun sticker</p>
          <p className="text-sm">Générez des stickers pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sticker) => (
            <div
              key={sticker.id}
              className={`bg-white rounded-2xl border p-5 ${
                sticker.status === "disabled" ? "opacity-60 border-neutral-200" : "border-neutral-200"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <code className="text-lg font-bold font-mono">{sticker.public_id}</code>
                {statusBadge(sticker.status)}
              </div>

              {/* Label */}
              {sticker.label && (
                <p className="text-sm text-neutral-500 mb-2">{sticker.label}</p>
              )}

              {/* URL */}
              <p className="text-xs text-neutral-400 font-mono mb-3 break-all">
                {appUrl}/q/{sticker.public_id}
              </p>

              {/* Assigned table */}
              {sticker.status === "assigned" && sticker.tables && (
                <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 mb-3">
                  <span className="text-sm font-medium text-green-700">
                    Table {sticker.tables.number}
                  </span>
                  <button
                    onClick={() => unassignTable(sticker.id)}
                    className="text-xs text-green-600 hover:text-red-600"
                  >
                    Désassigner
                  </button>
                </div>
              )}

              {/* Assign dropdown */}
              {sticker.status === "unassigned" && availableTables.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) assignTable(sticker.id, e.target.value);
                  }}
                  className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  <option value="" disabled>
                    Assigner à une table...
                  </option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.number}
                    </option>
                  ))}
                </select>
              )}

              {/* Scan stats */}
              <div className="flex items-center gap-3 text-xs text-neutral-400 mb-3">
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {sticker.scan_count} scans
                </span>
                {sticker.last_scanned_at && (
                  <span>Dernier: {formatTime(sticker.last_scanned_at)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQR(sticker)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  PNG
                </button>
                <button
                  onClick={() => toggleDisable(sticker)}
                  className={`flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium ${
                    sticker.status === "disabled"
                      ? "border-green-200 text-green-600 hover:bg-green-50"
                      : "border-neutral-200 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  }`}
                >
                  {sticker.status === "disabled" ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Activer</>
                  ) : (
                    <><Ban className="w-3.5 h-3.5" /> Désactiver</>
                  )}
                </button>
              </div>
            </div>
          ))}
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
