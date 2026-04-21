"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Staff } from "@/types/database";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const switchMode = (newMode: "login" | "signup") => {
    if (newMode === mode) return;
    setTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      setTransitioning(false);
    }, 150);
  };

  const passwordErrors = (): string[] => {
    if (mode === "login" || password.length === 0) return [];
    const errors: string[] = [];
    if (password.length < 8) errors.push("8 caractères minimum");
    if (!/[A-Z]/.test(password)) errors.push("1 majuscule");
    if (!/[0-9]/.test(password)) errors.push("1 chiffre");
    return errors;
  };

  const canSubmitSignup =
    email.length > 0 &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    password === confirmPassword &&
    restaurantName.trim().length > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("Email ou mot de passe incorrect"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Erreur d'authentification"); return; }

      const { data: staff } = await supabase
        .from("staff")
        .select("role")
        .eq("user_id", user.id)
        .single() as { data: Pick<Staff, "role"> | null };

      if (!staff) { toast.error("Aucun restaurant associé à ce compte"); return; }
      router.push("/admin");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitSignup) return;
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, restaurantName: restaurantName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur lors de l'inscription"); return; }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("Compte créé, veuillez vous connecter"); switchMode("login"); return; }

      toast.success("Bienvenue !");
      router.push("/admin");
    } catch {
      toast.error("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const errors = passwordErrors();
  const inputClass = "w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative">
      <h1 className="text-2xl font-bold tracking-tight mb-1">PrestoQR</h1>
      <p className="text-neutral-500 mb-6">
        {mode === "login" ? "Connexion espace restaurant" : "Créer votre espace restaurant"}
      </p>

      {/* Toggle */}
      <div className="flex w-full max-w-sm mb-6 bg-neutral-100 rounded-full p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            mode === "login" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-neutral-500"
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            mode === "signup" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-neutral-500"
          }`}
        >
          Créer un compte
        </button>
      </div>

      {/* Forms with fade transition */}
      <div className={`w-full max-w-sm transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
            <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
            <button type="submit" disabled={loading} className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base disabled:opacity-50">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <input type="text" placeholder="Nom du restaurant" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required className={inputClass} />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
            <div>
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} ${password.length > 0 && errors.length > 0 ? "!border-red-300" : ""}`}
              />
              {password.length > 0 && errors.length > 0 && (
                <p className="text-xs text-red-500 mt-1">Requis : {errors.join(", ")}</p>
              )}
            </div>
            <div>
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`${inputClass} ${confirmPassword.length > 0 && confirmPassword !== password ? "!border-red-300" : ""}`}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            <button type="submit" disabled={loading || !canSubmitSignup} className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base disabled:opacity-50">
              {loading ? "Création..." : "Créer mon restaurant"}
            </button>
          </form>
        )}
      </div>

      {/* Powered by Presto */}
      <div className="absolute bottom-6 flex items-baseline gap-1">
        <span className="text-sm text-neutral-400">Propulsé par</span>
        <img src="/presto-logo.png" alt="Presto" className="h-4 relative top-[1px]" />
      </div>
    </div>
  );
}
