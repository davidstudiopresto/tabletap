"use client";

interface Props {
  type: "not-found" | "disabled" | "unassigned";
  restaurantName?: string;
}

const messages = {
  "not-found": {
    title: "QR code invalide",
    description: "Ce QR code ne correspond à aucun sticker enregistré.",
  },
  disabled: {
    title: "QR code désactivé",
    description: "Ce QR code a été désactivé par le restaurant.",
  },
  unassigned: {
    title: "QR code non configuré",
    description: "Ce QR code n'est pas encore associé à une table. Veuillez demander au personnel.",
  },
};

export function StickerError({ type, restaurantName }: Props) {
  const { title, description } = messages[type];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠</span>
      </div>
      {restaurantName && (
        <p className="text-sm text-neutral-400 mb-2">{restaurantName}</p>
      )}
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-neutral-500 max-w-sm">{description}</p>
    </div>
  );
}
