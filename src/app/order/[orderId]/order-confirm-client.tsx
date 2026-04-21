"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface Props {
  restaurantSlug: string;
}

export function OrderConfirmClient({ restaurantSlug }: Props) {
  return (
    <div className="min-h-screen bg-white px-4 flex flex-col items-center justify-center">
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Commande envoyée
      </h1>
      <p className="text-neutral-500 mb-10">
        Votre commande a été transmise à la cuisine
      </p>

      <Link
        href={`/r/${restaurantSlug}/menu`}
        className="flex items-center justify-center w-full max-w-xs h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base"
      >
        Ajouter à ma commande
      </Link>
    </div>
  );
}
