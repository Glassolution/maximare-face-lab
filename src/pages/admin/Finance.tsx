
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

interface AdminPurchase {
  id: string;
  user_id: string;
  username: string;
  email: string;
  plan: string;
  amount_cents: number;
  provider: string;
  status: string;
  created_at: string;
}

const AdminFinance = () => {
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    month: 0,
    total: 0
  });

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_purchases');
      if (error) throw error;
      
      const purchaseList = data as AdminPurchase[] || [];
      setPurchases(purchaseList);

      // Calculate stats
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const todayRevenue = purchaseList
        .filter((p: any) => p.created_at.startsWith(today))
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      const monthRevenue = purchaseList
        .filter((p: any) => p.created_at >= monthStart)
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      const totalRevenue = purchaseList
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      setStats({
        today: todayRevenue / 100,
        month: monthRevenue / 100,
        total: totalRevenue / 100
      });

    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.today.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.month.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.total.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Nenhum pagamento encontrado</TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{purchase.username || 'Usuário'}</span>
                      <span className="text-xs text-muted-foreground">{purchase.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{purchase.plan}</TableCell>
                  <TableCell>R$ {(purchase.amount_cents / 100).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{purchase.provider}</TableCell>
                  <TableCell>
                    <Badge variant={purchase.status === 'approved' || purchase.status === 'paid' ? 'default' : 'secondary'}>
                      {purchase.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {format(new Date(purchase.created_at), 'dd/MM/yyyy HH:mm')}
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

export default AdminFinance;
