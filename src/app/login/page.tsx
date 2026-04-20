"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Staff } from "@/types/database";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Erreur d'authentification");
        return;
      }

      const { data: staff } = await supabase
        .from("staff")
        .select("role")
        .eq("user_id", user.id)
        .single() as { data: Pick<Staff, "role"> | null };

      if (!staff) {
        toast.error("Aucun restaurant associé à ce compte");
        return;
      }

      if (staff.role === "kitchen") {
        router.push("/kitchen");
      } else {
        router.push("/admin");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <h1 className="text-2xl font-bold tracking-tight mb-1">TableTap</h1>
      <p className="text-neutral-500 mb-8">Connexion espace restaurant</p>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
