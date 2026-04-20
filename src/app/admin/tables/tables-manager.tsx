"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Download, QrCode, BarChart3, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { generatePublicId } from "@/lib/sticker-id";
import type { Table, QrSticker } from "@/types/database";

type TableWithSticker = Table & {
  sticker: QrSticker | null;
};

interface Props {
  restaurantId: string;
  restaurantName: string;
  initialTables: TableWithSticker[];
}

export function TablesManager({ restaurantId, restaurantName, initialTables }: Props) {
  const router = useRouter();
  const [tables, setTables] = useState<TableWithSticker[]>(initialTables);
  const [adding, setAdding] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const handleAddTable = async () => {
    setAdding(true);
    try {
      const supabase = createClient();
      const { data: allTables } = await supabase
        .from("tables")
        .select("number")
        .eq("restaurant_id", restaurantId)
        .order("number", { ascending: false })
        .limit(1) as { data: { number: number }[] | null };

      const nextNumber = allTables && allTables.length > 0 ? allTables[0].number + 1 : 1;

      const { data: table, error: tableError } = await (supabase
        .from("tables") as any)
        .insert({ restaurant_id: restaurantId, number: nextNumber })
        .select()
        .single() as { data: Table | null; error: any };

      if (tableError || !table) throw tableError;

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
      toast.success(`Table ${nextNumber} créée`);
    } catch (err: any) {
      console.error("Table creation error:", err);
      toast.error(err?.message || "Erreur lors de la création");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteTable = async (tableWithSticker: TableWithSticker) => {
    const supabase = createClient();
    if (tableWithSticker.sticker) {
      await (supabase.from("qr_stickers") as any).delete().eq("id", tableWithSticker.sticker.id);
    }
    await (supabase.from("tables") as any).delete().eq("id", tableWithSticker.id);
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

  // Print a single sticker
  const printSingle = (table: TableWithSticker) => {
    if (!table.sticker) return;
    const url = `${appUrl}/q/${table.sticker.public_id}`;
    const qrImgUrl = `/api/qr?publicId=${table.sticker.public_id}&label=Table-${table.number}`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(printHTML(restaurantName, [{ number: table.number, qrImgUrl, url }]));
    w.document.close();
  };

  // Print all stickers on A4 sheet
  const printAll = () => {
    const items = tables
      .filter((t) => t.sticker)
      .map((t) => ({
        number: t.number,
        qrImgUrl: `/api/qr?publicId=${t.sticker!.public_id}&label=Table-${t.number}`,
        url: `${appUrl}/q/${t.sticker!.public_id}`,
      }));
    if (items.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(printHTML(restaurantName, items));
    w.document.close();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Tables & QR codes</h1>
          <button
            onClick={() => router.refresh()}
            className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          {tables.length > 0 && (
            <button
              onClick={printAll}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-full border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
            >
              <Printer className="w-4 h-4" />
              Tout imprimer
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

      <p className="text-sm text-neutral-500 mb-6">
        Imprimez les QR codes sur du papier autocollant et collez-les sur vos tables.
      </p>

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
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => printSingle(table)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
                        title="Imprimer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadQR(table.sticker!)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
                        title="Télécharger PNG"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-400">Pas de QR code</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div ref={printRef} />
    </div>
  );
}

// Generate print-ready HTML
function printHTML(
  restaurantName: string,
  items: { number: number; qrImgUrl: string; url: string }[]
): string {
  const stickers = items
    .map(
      (item) => `
    <div class="sticker">
      <div class="restaurant">${restaurantName}</div>
      <img src="${item.qrImgUrl}" alt="QR Table ${item.number}" />
      <div class="table-num">Table ${item.number}</div>
      <div class="cta">Scannez pour commander</div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>QR Codes - ${restaurantName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 10mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-wrap: wrap;
    gap: 8mm;
    justify-content: center;
    padding: 10mm;
  }
  .sticker {
    width: 60mm;
    height: 75mm;
    border: 1px solid #e5e5e5;
    border-radius: 4mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4mm;
    page-break-inside: avoid;
  }
  .restaurant {
    font-size: 10pt;
    font-weight: 700;
    margin-bottom: 3mm;
    text-align: center;
  }
  img {
    width: 38mm;
    height: 38mm;
  }
  .table-num {
    font-size: 14pt;
    font-weight: 800;
    margin-top: 3mm;
  }
  .cta {
    font-size: 7pt;
    color: #888;
    margin-top: 2mm;
    text-align: center;
  }
  @media print {
    body { padding: 0; }
    .sticker { border-color: #ccc; }
  }
</style>
</head>
<body>
${stickers}
<script>
  // Wait for QR images to load, then print
  const imgs = document.querySelectorAll('img');
  let loaded = 0;
  imgs.forEach(img => {
    img.onload = () => { loaded++; if (loaded === imgs.length) window.print(); };
    img.onerror = () => { loaded++; if (loaded === imgs.length) window.print(); };
  });
  if (imgs.length === 0) window.print();
</script>
</body>
</html>`;
}
