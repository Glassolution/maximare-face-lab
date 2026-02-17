import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      navigate("/onboarding", { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError(String((err as { message: string }).message));
      } else {
        setError("Erro ao autenticar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(0,0%,8%)] via-[hsl(0,0%,8%)] to-[hsl(224,76%,35%)] pointer-events-none" />
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 max-w-md mx-auto w-full">
        <div className="w-full rounded-3xl bg-black/40 border border-white/10 p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center">
              <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.18em]">Conta Maximare</p>
              <h1 className="text-lg font-heading font-bold text-foreground">
                {mode === "signup" ? "Criar conta" : "Entrar"}
              </h1>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Seu nome"
                  className="bg-black/40 border-white/10 text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">E-mail</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@exemplo.com"
                  className="bg-black/40 border-white/10 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Senha</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-black/40 border-white/10 pl-9 text-sm"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button
              type="submit"
              className="w-full rounded-2xl py-3 text-sm font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/30"
              disabled={loading}
            >
              {loading ? "Carregando..." : mode === "signup" ? "Criar conta e continuar" : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signup" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary font-semibold hover:underline"
              >
                Já tem conta? Entrar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary font-semibold hover:underline"
              >
                Ainda não tem conta? Criar agora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
