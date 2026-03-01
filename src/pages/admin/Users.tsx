
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

interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_premium: boolean;
  plan_type: string;
  is_ugc: boolean;
  banned: boolean;
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

  const handleGrantPremium = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          plan_type: 'annual',
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', userId);
      if (error) throw error;
      toast.success("Premium concedido com sucesso");
      fetchUsers();
    } catch (error) {
      console.error("Error granting premium:", error);
      toast.error("Erro ao conceder premium");
    }
  };

  const handleGrantUGC = async (userId: string, currentStatus: boolean) => {
    try {
      const updates: any = { is_ugc: !currentStatus };
      if (!currentStatus) {
        updates.is_premium = true;
        updates.plan_type = 'ugc_gift';
        updates.subscription_status = 'active';
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) throw error;
      toast.success(`Tag UGC ${!currentStatus ? 'concedida' : 'removida'}`);
      fetchUsers();
    } catch (error) {
      console.error("Error toggling UGC:", error);
      toast.error("Erro ao alterar status UGC");
    }
  };

  const handleBan = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Tem certeza que deseja ${currentStatus ? 'desbanir' : 'banir'} este usuário?`)) return;
    try {
      const { error } = await supabase.from('profiles').update({ banned: !currentStatus }).eq('id', userId);
      if (error) throw error;
      toast.success(`Usuário ${!currentStatus ? 'banido' : 'desbanido'}`);
      fetchUsers();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Erro ao banir usuário");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = filterPlan === "all" ||
      (filterPlan === "premium" && user.is_premium) ||
      (filterPlan === "free" && !user.is_premium) ||
      (filterPlan === user.plan_type);
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
                <TableRow key={user.id} className="hover:bg-gray-50/60 border-b border-gray-50">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-gray-200">
                        <AvatarImage src={user.avatar_url} />
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
                  <TableCell><PlanBadge plan={user.plan_type} /></TableCell>
                  <TableCell>
                    <StatusDot active={!user.banned && (user.is_premium || user.plan_type === 'free' || !!user.plan_type)} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(user.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {!user.is_premium && (
                        <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs h-8 px-3" onClick={() => handleGrantPremium(user.id)}>
                          Dar Premium
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={`rounded-lg text-xs h-8 px-3 ${user.is_ugc ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
                        onClick={() => handleGrantUGC(user.id, user.is_ugc)}
                      >
                        {user.is_ugc ? "Remover UGC" : "Dar UGC"}
                      </Button>
                      <Button
                        size="sm"
                        className={`rounded-lg text-xs h-8 px-3 ${user.banned ? 'bg-gray-500 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        onClick={() => handleBan(user.id, user.banned)}
                      >
                        {user.banned ? "Desbanir" : "Banir"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Mostrando {((page - 1) * USERS_PER_PAGE) + 1} a {Math.min(page * USERS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuários
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                    page === p ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
