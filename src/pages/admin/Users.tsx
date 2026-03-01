
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

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

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPremium = async (userId: string) => {
    try {
      // Assuming granting premium means setting is_premium=true and plan_type='annual' (or user choice)
      // For simplicity, granting 'annual' as default manual grant
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true, 
          plan_type: 'annual',
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
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
      // Toggle UGC status
      // If granting UGC, also grant premium as per requirements
      const updates: any = { is_ugc: !currentStatus };
      if (!currentStatus) {
        updates.is_premium = true;
        updates.plan_type = 'ugc_gift'; // or similar
        updates.subscription_status = 'active';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

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
      const { error } = await supabase
        .from('profiles')
        .update({ banned: !currentStatus })
        .eq('id', userId);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Buscar por nome ou email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
          />
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[180px]">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Carregando usuários...</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Nenhum usuário encontrado</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.display_name || user.username}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_premium ? "default" : "secondary"}>
                      {user.plan_type || 'Free'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.is_ugc && <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">UGC</Badge>}
                      {user.banned && <Badge variant="destructive">Banido</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!user.is_premium && (
                      <Button size="sm" variant="outline" onClick={() => handleGrantPremium(user.id)}>
                        Dar Premium
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant={user.is_ugc ? "destructive" : "outline"}
                      onClick={() => handleGrantUGC(user.id, user.is_ugc)}
                    >
                      {user.is_ugc ? "Remover UGC" : "Dar UGC"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant={user.banned ? "secondary" : "destructive"}
                      onClick={() => handleBan(user.id, user.banned)}
                    >
                      {user.banned ? "Desbanir" : "Banir"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
