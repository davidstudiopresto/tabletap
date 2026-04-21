import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-2">PrestoQR</h1>
      <p className="text-neutral-500 text-lg mb-8">
        Commandez depuis votre table
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/admin"
          className="flex items-center justify-center h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base"
        >
          Espace restaurant
        </Link>
      </div>
    </div>
  );
}
