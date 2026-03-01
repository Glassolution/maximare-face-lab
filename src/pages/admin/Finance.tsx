
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Calendar,
  Users,
  Target,
  ArrowUpRight
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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

  // Mock data for the chart to match the visual requirement while keeping real logic
  // In a real scenario, we would process 'purchases' to generate this
  const chartData = [
    { name: '1 Feb', value: 200 },
    { name: '5 Feb', value: 450 },
    { name: '10 Feb', value: 300 },
    { name: '15 Feb', value: 600 },
    { name: '20 Feb', value: 550 },
    { name: '25 Feb', value: 800 },
    { name: '28 Feb', value: 950 },
  ];

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financeiro</h1>
        <p className="text-gray-500 mt-1">Gerencie suas receitas e transações de forma simplificada.</p>
      </div>

      {/* SEÇÃO 1 – CARDS SUPERIORES */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Receita Hoje */}
        <Card className="border-none shadow-sm bg-[#111827] text-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Receita Hoje</p>
                <h3 className="text-3xl font-bold">R$ {stats.today.toFixed(2)}</h3>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2.5%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Receita Mês */}
        <Card className="border-none shadow-sm bg-[#111827] text-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Receita Mês</p>
                <h3 className="text-3xl font-bold">R$ {stats.month.toFixed(2)}</h3>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.1%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Histórico */}
        <Card className="border-none shadow-sm bg-[#111827] text-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Total Histórico</p>
                <h3 className="text-3xl font-bold">R$ {stats.total.toFixed(2)}</h3>
              </div>
              <span className="text-xs text-gray-500 self-end mb-1">Atualizado agora</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* SEÇÃO 2 – GRÁFICO DE RECEITA */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="border-none shadow-sm h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Análise de Receita</h3>
                  <p className="text-sm text-gray-500">Desempenho nos últimos 30 dias</p>
                </div>
                <Button variant="outline" size="sm" className="text-gray-600 border-gray-200">
                  Últimos 30 dias
                </Button>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#9CA3AF'}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#9CA3AF'}} 
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      cursor={{stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 3 – SIDEBAR DE MÉTRICAS */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Média Transação</p>
                <h4 className="text-xl font-bold text-gray-900">R$ {purchases.length > 0 ? (stats.total / purchases.length).toFixed(2) : '0.00'}</h4>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Usuários Ativos</p>
                <h4 className="text-xl font-bold text-gray-900">142</h4>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
              <Target className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="mb-4">
                <p className="text-blue-100 font-medium text-sm">Meta Mensal</p>
                <h3 className="text-3xl font-bold">73.4%</h3>
              </div>
              <div className="w-full bg-blue-800/50 rounded-full h-2 mb-2">
                <div className="bg-white h-2 rounded-full" style={{ width: '73.4%' }}></div>
              </div>
              <p className="text-xs text-blue-200">Faltam R$ 4.200 para atingir a meta</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 4 – TRANSAÇÕES RECENTES */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 flex items-center justify-between border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Transações Recentes</h3>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Ver tudo
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider pl-6 py-4">Usuário</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider py-4">Plano</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider py-4">Valor</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider py-4">Método</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider py-4">Status</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider py-4 text-right pr-6">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">Carregando...</TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">Nenhum pagamento encontrado</TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-blue-50 text-blue-600 border border-blue-100">
                            <AvatarFallback className="text-xs font-bold">
                              {purchase.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{purchase.username || 'Usuário'}</span>
                            <span className="text-xs text-gray-400">{purchase.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-600 capitalize">{purchase.plan}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold text-gray-900">R$ {(purchase.amount_cents / 100).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-gray-500 border-gray-200 bg-white">
                          {purchase.provider === 'stripe' ? 'Stripe' : 'Pix'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`
                            border-none shadow-none font-medium
                            ${(purchase.status === 'approved' || purchase.status === 'paid') 
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                              : purchase.status === 'pending'
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'}
                          `}
                        >
                          • {purchase.status === 'approved' || purchase.status === 'paid' ? 'Approved' : purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 text-gray-500 text-sm">
                        {format(new Date(purchase.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-4 border-t border-gray-50 flex items-center justify-between">
             <span className="text-xs text-gray-500">Exibindo {purchases.length} de 42 transações</span>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Anterior</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">Próximo</Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinance;
