
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (password === "maximare2026") {
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta");
    }
  };

  const handleGrantPremium = async () => {
    if (!email) return alert("Digite um email");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-grant-premium", {
        body: { email, secret: "maximare-admin-2026" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      alert(`Sucesso! O usuário ${email} agora é Premium.`);
      setEmail("");
    } catch (err: any) {
      alert("Erro ao conceder premium: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <Card className="w-[350px] bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Senha de Admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <Button onClick={handleLogin} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Gerenciar Assinaturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Email do Usuário</label>
            <Input
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <Button 
            onClick={handleGrantPremium} 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? "Processando..." : "Conceder Premium (1 Ano)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
