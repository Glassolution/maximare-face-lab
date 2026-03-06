import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AtSign, Check, X, Loader2 } from "lucide-react";

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsernameSet: (username: string) => void;
}

export function UsernameSetupModal({ isOpen, onClose, onUsernameSet }: UsernameSetupModalProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate username format
  const isValidFormat = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  useEffect(() => {
    if (!username || !isValidFormat) {
      setAvailable(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username.toLowerCase())
          .maybeSingle();

        if (queryError) throw queryError;

        if (data && data.user_id !== user?.id) {
          setAvailable(false);
        } else {
          setAvailable(true);
        }
      } catch {
        setError("Erro ao verificar disponibilidade");
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user?.id]);

  const handleSave = async () => {
    if (!user || !available || !isValidFormat) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.toLowerCase(), display_name: username })
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "23505") {
          setAvailable(false);
          toast.error("Este nome de usuário já está em uso.");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Nome de usuário definido!");
      onUsernameSet(username.toLowerCase());
      onClose();
    } catch {
      toast.error("Erro ao salvar nome de usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Escolha seu @username</DialogTitle>
          <DialogDescription>
            Este será seu identificador único. Seus amigos poderão te encontrar por ele.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="relative">
            <AtSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="seu_username"
              className="pl-9 pr-10"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              maxLength={20}
              autoFocus
            />
            <div className="absolute right-3 top-3">
              {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!checking && available === true && <Check className="h-4 w-4 text-green-500" />}
              {!checking && available === false && <X className="h-4 w-4 text-destructive" />}
            </div>
          </div>

          {username && !isValidFormat && (
            <p className="text-xs text-destructive">3-20 caracteres. Apenas letras, números e _</p>
          )}
          {available === false && (
            <p className="text-xs text-destructive">Este nome de usuário já está em uso.</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={handleSave}
            disabled={!available || !isValidFormat || saving}
            className="w-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
