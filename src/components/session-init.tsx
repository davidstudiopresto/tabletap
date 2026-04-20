"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart";
import { createClient } from "@/lib/supabase/client";

interface Props {
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
}

export function SessionInitClient({
  tableId,
  tableNumber,
  restaurantId,
  restaurantSlug,
  restaurantName,
}: Props) {
  const router = useRouter();
  const setSession = useCartStore((s) => s.setSession);

  useEffect(() => {
    async function init() {
      const supabase = createClient();

      // Check if there's an existing open session in localStorage
      const storedSessionId = localStorage.getItem(
        `tabletap-session-${tableId}`
      );

      let sessionId = storedSessionId;

      if (storedSessionId) {
        // Verify session is still open
        const { data: existing } = await supabase
          .from("table_sessions")
          .select("id")
          .eq("id", storedSessionId)
          .is("closed_at", null)
          .single();

        if (!existing) {
          sessionId = null;
        }
      }

      if (!sessionId) {
        // Create new session
        const { data: newSession } = await (supabase
          .from("table_sessions") as any)
          .insert({
            table_id: tableId,
            restaurant_id: restaurantId,
          })
          .select("id")
          .single() as { data: { id: string } | null };

        if (newSession) {
          sessionId = newSession.id;
          localStorage.setItem(`tabletap-session-${tableId}`, sessionId!);
        }
      }

      if (sessionId) {
        setSession({
          sessionId,
          tableId,
          tableNumber,
          restaurantId,
          restaurantSlug,
          restaurantName,
        });
      }

      router.replace(`/r/${restaurantSlug}/menu`);
    }

    init();
  }, [tableId, tableNumber, restaurantId, restaurantSlug, restaurantName, setSession, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-neutral-400">Chargement...</div>
    </div>
  );
}
