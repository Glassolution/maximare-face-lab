
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

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

const AdminUGC = () => {
  const [creators, setCreators] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      setCreators((data || []).filter((u: AdminUser) => u.is_ugc));
    } catch (error) {
      console.error("Error fetching creators:", error);
      toast.error("Erro ao carregar criadores");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    setSearching(true);
    try {
      // In a real scenario, we might want a specific search RPC to avoid loading all users
      // But reusing get_admin_users for now as it's already secured
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      
      const results = (data || []).filter((u: AdminUser) => 
        (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         u.username?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !u.is_ugc
      );
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Erro ao buscar usuários");
    } finally {
      setSearching(false);
    }
  };

  const handleAddCreator = async (userId: string) => {
    try {
      // Grant UGC and Premium
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_ugc: true,
          is_premium: true,
          plan_type: 'ugc_gift',
          subscription_status: 'active'
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Criador adicionado com sucesso");
      setIsDialogOpen(false);
      fetchCreators();
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error("Error adding creator:", error);
      toast.error("Erro ao adicionar criador");
    }
  };

  const handleRemoveCreator = async (userId: string) => {
    if (!confirm("Remover status de criador?")) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_ugc: false })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Status de criador removido");
      fetchCreators();
    } catch (error) {
      console.error("Error removing creator:", error);
      toast.error("Erro ao remover criador");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Criadores UGC</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Criador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Criador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por email ou username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Search className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddCreator(user.id)}>
                      Adicionar
                    </Button>
                  </div>
                ))}
                {searchResults.length === 0 && searchTerm && !searching && (
                  <p className="text-center text-muted-foreground text-sm">Nenhum usuário encontrado</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status Premium</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando criadores...</TableCell>
              </TableRow>
            ) : creators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Nenhum criador UGC encontrado</TableCell>
              </TableRow>
            ) : (
              creators.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.display_name || user.username}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-600">
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleRemoveCreator(user.id)}
                    >
                      Remover
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

export default AdminUGC;
