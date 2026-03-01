
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { avatarService } from "@/services/avatarService";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_premium: boolean;
  plan_type: string;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  premium_plan?: string | null;
  premium_until?: string | null;
  ugc_enabled: boolean;
  is_ugc: boolean;
  is_banned: boolean;
  banned: boolean;
  banned_reason?: string | null;
  banned_at?: string | null;
  created_at: string;
}

const USERS_PER_PAGE = 10;

const PlanBadge = ({ plan }: { plan: string }) => {
  const colors: Record<string, string> = {
    weekly: "bg-blue-600 text-white",
    monthly: "bg-indigo-600 text-white",
    annual: "bg-emerald-600 text-white",
    ugc_gift: "bg-purple-600 text-white",
  };
  const cls = colors[plan] || "bg-gray-800 text-white";
  return (
    <span className={`inline-block rounded px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cls}`}>
      {plan || "FREE"}
    </span>
  );
};

const StatusDot = ({ active }: { active: boolean }) => (
  <span className="flex items-center gap-1.5 text-sm">
    <span className={`h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-gray-400"}`} />
    {active ? "Ativo" : "Inativo"}
  </span>
);

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [page, setPage] = useState(1);
  const [busyByUserId, setBusyByUserId] = useState<Record<string, boolean>>({});
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [premiumTargetUser, setPremiumTargetUser] = useState<AdminUser | null>(null);
  const [premiumPlan, setPremiumPlan] = useState<string>("monthly");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      setUsers(data as AdminUser[] || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const setBusy = (userId: string, busy: boolean) => {
    setBusyByUserId((prev) => (prev[userId] === busy ? prev : { ...prev, [userId]: busy }));
  };

  const applyProfileUpdate = (userId: string, profile: any) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id !== userId
          ? u
          : {
              ...u,
              is_premium: !!profile.is_premium,
              plan_type: profile.plan_type ?? u.plan_type,
              premium_plan: profile.premium_plan ?? profile.plan_type ?? u.premium_plan,
              subscription_status: profile.subscription_status ?? u.subscription_status,
              subscription_expires_at: profile.subscription_expires_at ?? u.subscription_expires_at,
              premium_until: profile.premium_until ?? profile.subscription_expires_at ?? u.premium_until,
              ugc_enabled: profile.ugc_enabled ?? profile.is_ugc ?? u.ugc_enabled,
              is_ugc: profile.is_ugc ?? profile.ugc_enabled ?? u.is_ugc,
              is_banned: profile.is_banned ?? profile.banned ?? u.is_banned,
              banned: profile.banned ?? profile.is_banned ?? u.banned,
              banned_reason: profile.banned_reason ?? u.banned_reason,
              banned_at: profile.banned_at ?? u.banned_at,
            },
      ),
    );
  };

  const handleGrantPremium = async (userId: string, plan: string) => {
    try {
      setBusy(userId, true);
      const { data, error } = await supabase.rpc('grant_premium', {
        target_user_id: userId,
        plan,
      });
      if (error) throw error;
      if (data) applyProfileUpdate(userId, data);
      toast.success("Premium concedido com sucesso");
      fetchUsers();
    } catch (error) {
      console.error("Error granting premium:", error);
      toast.error((error as any)?.message || "Erro ao conceder premium");
    } finally {
      setBusy(userId, false);
    }
  };

  const handleGrantUGC = async (userId: string, currentStatus: boolean) => {
    try {
      setBusy(userId, true);
      const fn = currentStatus ? 'revoke_ugc' : 'grant_ugc';
      const { data, error } = await supabase.rpc(fn, { target_user_id: userId });
      if (error) throw error;
      if (data) applyProfileUpdate(userId, data);
      toast.success(`Tag UGC ${!currentStatus ? 'concedida' : 'removida'}`);
      fetchUsers();
    } catch (error) {
      console.error("Error toggling UGC:", error);
      toast.error((error as any)?.message || "Erro ao alterar status UGC");
    } finally {
      setBusy(userId, false);
    }
  };

  const handleBan = async (userId: string, currentStatus: boolean, reason?: string) => {
    try {
      setBusy(userId, true);
      const { data, error } = currentStatus
        ? await supabase.rpc('unban_user', { target_user_id: userId })
        : await supabase.rpc('ban_user', { target_user_id: userId, reason: reason || "" });
      if (error) throw error;
      if (data) applyProfileUpdate(userId, data);
      toast.success(`Usuário ${!currentStatus ? 'banido' : 'desbanido'}`);
      fetchUsers();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error((error as any)?.message || "Erro ao banir usuário");
    } finally {
      setBusy(userId, false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(search.toLowerCase());
    const plan = user.premium_plan || user.plan_type;
    const matchesPlan = filterPlan === "all" ||
      (filterPlan === "premium" && user.is_premium) ||
      (filterPlan === "free" && !user.is_premium) ||
      (filterPlan === "with_photo" && user.avatar_url) || // Filtro Com Foto
      (filterPlan === plan);
    return matchesSearch && matchesPlan;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterPlan]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Usuários</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[280px] pl-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-400 rounded-lg"
            />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[170px] bg-gray-900 border-gray-700 text-white rounded-lg">
              <SelectValue placeholder="Filtrar por plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Planos</SelectItem>
              <SelectItem value="with_photo">Com Foto</SelectItem>
              <SelectItem value="free">Gratuito</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-gray-100">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 pl-6">Usuário</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Email</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Plano</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Data Cadastro</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">Carregando usuários...</TableCell></TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400">Nenhum usuário encontrado</TableCell></TableRow>
            ) : (
              paginatedUsers.map((user) => (
                (() => {
                  const isBusy = !!busyByUserId[user.id];
                  const isBanned = user.is_banned ?? user.banned;
                  const isUgc = user.ugc_enabled ?? user.is_ugc;
                  const plan = user.premium_plan || user.plan_type;
                  const avatarPublicUrl = avatarService.getAvatarPublicUrl(user.avatar_url); // Uso do avatarService

                  return (
                <TableRow key={user.id} className="hover:bg-gray-50/60 border-b border-gray-50">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-gray-200">
                        <AvatarImage src={avatarPublicUrl || undefined} />
                        <AvatarFallback className="bg-gray-800 text-white text-xs font-bold">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{user.display_name || user.username}</span>
                        <span className="text-xs text-gray-400">@{user.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{user.email || '-'}</TableCell>
                  <TableCell><PlanBadge plan={plan} /></TableCell>
                  <TableCell>
                    <StatusDot active={!isBanned} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(user.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {!user.is_premium && (
                        <Button
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs h-8 px-3"
                          disabled={isBusy || isBanned}
                          onClick={() => {
                            setPremiumTargetUser(user);
                            setPremiumPlan(plan || "monthly");
                            setPremiumDialogOpen(true);
                          }}
                        >
                          Dar Premium
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={`rounded-lg text-xs h-8 px-3 ${isUgc ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
                        disabled={isBusy || isBanned}
                        onClick={() => handleGrantUGC(user.id, isUgc)}
                      >
                        {isUgc ? "Remover UGC" : "Dar UGC"}
                      </Button>
                      <Button
                        size="sm"
                        className={`rounded-lg text-xs h-8 px-3 ${isBanned ? 'bg-gray-500 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        disabled={isBusy}
                        onClick={() => {
                          if (isBanned) {
                            handleBan(user.id, true);
                            return;
                          }
                          setBanTargetUser(user);
                          setBanReason("");
                          setBanDialogOpen(true);
                        }}
                      >
                        {isBanned ? "Desbanir" : "Banir"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                  );
                })()
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={premiumDialogOpen}
        onOpenChange={(open) => {
          setPremiumDialogOpen(open);
          if (!open) setPremiumTargetUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {premiumTargetUser?.email || premiumTargetUser?.username || premiumTargetUser?.display_name}
            </div>
            <Select value={premiumPlan} onValueChange={setPremiumPlan}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">weekly</SelectItem>
                <SelectItem value="monthly">monthly</SelectItem>
                <SelectItem value="annual">annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPremiumDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!premiumTargetUser) return;
                setPremiumDialogOpen(false);
                await handleGrantPremium(premiumTargetUser.id, premiumPlan);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={banDialogOpen}
        onOpenChange={(open) => {
          setBanDialogOpen(open);
          if (!open) setBanTargetUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {banTargetUser?.email || banTargetUser?.username || banTargetUser?.display_name}
            </div>
            <Textarea
              placeholder="Motivo do banimento..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!banTargetUser) return;
                const reason = banReason.trim();
                if (!reason) {
                  toast.error("Informe um motivo");
                  return;
                }
                setBanDialogOpen(false);
                await handleBan(banTargetUser.id, false, reason);
              }}
            >
              Banir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
