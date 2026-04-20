"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UtensilsCrossed, QrCode, LogOut, ClipboardList, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  restaurantName: string;
}

const navItems = [
  { href: "/admin/orders", label: "Commandes", icon: ClipboardList },
  { href: "/admin", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function AdminNav({ restaurantName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight">
            {restaurantName}
          </span>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-100 text-[#0A0A0A]"
                      : "text-neutral-500 hover:text-[#0A0A0A]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-[#0A0A0A]"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>

      {/* Mobile nav */}
      <nav className="sm:hidden flex border-t border-neutral-100">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium ${
                isActive ? "text-[#0A0A0A]" : "text-neutral-400"
              }`}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
