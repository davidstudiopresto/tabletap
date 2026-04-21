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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Email ou mot de passe incorrect");
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

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'inscription");
        return;
      }

      // Sign in with the new account
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Compte créé, veuillez vous connecter");
        setMode("login");
        return;
      }

      toast.success("Bienvenue !");
      router.push("/admin");
    } catch {
      toast.error("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const errors = passwordErrors();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <h1 className="text-2xl font-bold tracking-tight mb-1">TableTap</h1>
      <p className="text-neutral-500 mb-6">
        {mode === "login" ? "Connexion espace restaurant" : "Créer votre espace restaurant"}
      </p>

      {/* Toggle */}
      <div className="flex w-full max-w-sm mb-6 bg-neutral-100 rounded-full p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
            mode === "login" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-neutral-500"
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
            mode === "signup" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-neutral-500"
          }`}
        >
          Créer un compte
        </button>
      </div>

      <div className="w-full max-w-sm overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: mode === "login" ? "translateX(0)" : "translateX(-50%)" }}
        >
          {/* Login form */}
          <form onSubmit={handleLogin} className="w-full shrink-0 space-y-4 px-1">
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

          {/* Signup form */}
          <form onSubmit={handleSignup} className="w-full shrink-0 space-y-4 px-1">
            <input
              type="text"
              placeholder="Nom du restaurant"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-neutral-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <div>
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full h-12 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                  password.length > 0 && errors.length > 0 ? "border-red-300" : "border-neutral-200"
                }`}
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
                className={`w-full h-12 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                  confirmPassword.length > 0 && confirmPassword !== password ? "border-red-300" : "border-neutral-200"
                }`}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !canSubmitSignup}
              className="w-full h-14 rounded-full bg-[#0A0A0A] text-white font-medium text-base disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer mon restaurant"}
            </button>
          </form>
        </div>
      </div>

      {/* Powered by Presto */}
      <div className="absolute bottom-6 flex items-center gap-2">
        <span className="text-xs text-neutral-400">Propulsé par</span>
        <img src="/presto-logo.png" alt="Presto" className="h-5" />
      </div>
    </div>
  );
}
