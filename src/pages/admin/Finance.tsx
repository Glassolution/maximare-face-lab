import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowUpRight,
  TrendingDown,
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

interface AdminRefund {
  id: string;
  user_id: string;
  username: string;
  plan: string;
  amount: number;
  status: string;
  reason: string;
  created_at: string;
}

const getUserColor = (username: string) => {
  const colors = [
    { bg: "bg-blue-100", text: "text-blue-600" },
    { bg: "bg-green-100", text: "text-green-600" },
    { bg: "bg-purple-100", text: "text-purple-600" },
    { bg: "bg-yellow-100", text: "text-yellow-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-indigo-100", text: "text-indigo-600" },
    { bg: "bg-red-100", text: "text-red-600" },
    { bg: "bg-orange-100", text: "text-orange-600" },
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const AdminFinance = () => {
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue_today: 0,
    revenue_month: 0,
    total_historical: 0,
    refunds_month: 0,
    active_subscribers: 0,
    churned_month: 0,
    mrr: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showNetRevenue, setShowNetRevenue] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_financial_summary');
      if (summaryError) throw summaryError;
      setStats(summaryData as any);

      // 2. Fetch Purchases (Recent Transactions)
      const { data: purchasesData, error: purchasesError } = await supabase.rpc('get_admin_purchases');
      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData as AdminPurchase[] || []);

      // 3. Fetch Refunds
      const { data: refundsData, error: refundsError } = await supabase.rpc('get_admin_refunds');
      if (refundsError) throw refundsError;
      setRefunds(refundsData as AdminRefund[] || []);

      // 4. Fetch Chart Data
      const { data: chartStats, error: chartError } = await supabase.rpc('get_daily_financial_stats', { days_limit: 30 });
      if (chartError) throw chartError;
      
      const formattedChartData = (chartStats as any[] || []).map(item => ({
        name: format(new Date(item.date), 'dd MMM'),
        revenue: item.revenue,
        refunds: item.refunds,
        net: item.revenue - item.refunds
      }));
      setChartData(formattedChartData);

    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = (refundId: string) => {
    toast.info("Funcionalidade de processar estorno em desenvolvimento");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financeiro</h1>
        <p className="text-gray-500 mt-1">Gerencie suas receitas, estornos e métricas de assinatura.</p>
      </div>

      {/* SEÇÃO 1 – CARDS PRINCIPAIS */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Receita Mês */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Receita Mês</p>
                <h3 className="text-3xl font-bold text-gray-900">R$ {stats.revenue_month?.toFixed(2)}</h3>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none">
                <TrendingUp className="w-3 h-3 mr-1" />
                Receita
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Lucro Líquido (Mês)</p>
                <h3 className="text-3xl font-bold text-emerald-600">R$ {(stats.revenue_month - stats.refunds_month).toFixed(2)}</h3>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                <DollarSign className="w-3 h-3 mr-1" />
                Real
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">MRR (Recorrente)</p>
                <h3 className="text-3xl font-bold text-blue-600">R$ {stats.mrr?.toFixed(2)}</h3>
              </div>
              <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none">
                <RefreshCcw className="w-3 h-3 mr-1" />
                Mensal
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Churn Rate (Mês)</p>
                <h3 className="text-3xl font-bold text-red-600">
                  {stats.active_subscribers > 0 
                    ? ((stats.churned_month / (stats.active_subscribers + stats.churned_month)) * 100).toFixed(1) 
                    : 0}%
                </h3>
              </div>
              <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-none">
                <TrendingDown className="w-3 h-3 mr-1" />
                Perdas
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.churned_month} cancelamentos este mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* SEÇÃO 2 – GRÁFICO DE RECEITA */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="border-none shadow-sm h-full bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Análise Financeira</h3>
                  <p className="text-sm text-gray-500">Receita Bruta vs Líquida vs Estornos</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="net-revenue" className="text-sm text-gray-600">Receita Bruta</Label>
                  <Switch 
                    id="net-revenue" 
                    checked={showNetRevenue}
                    onCheckedChange={setShowNetRevenue}
                  />
                  <Label htmlFor="net-revenue" className="text-sm text-gray-600">Lucro Líquido</Label>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
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
                      contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      itemStyle={{color: '#111827'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={showNetRevenue ? "net" : "revenue"} 
                      stroke={showNetRevenue ? "#10B981" : "#3B82F6"} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill={`url(#${showNetRevenue ? 'colorNet' : 'colorRevenue'})`} 
                      name={showNetRevenue ? "Lucro Líquido" : "Receita Bruta"}
                    />
                    {/* Linha de estornos (sempre visível mas discreta) */}
                    <Area 
                      type="monotone" 
                      dataKey="refunds" 
                      stroke="#EF4444" 
                      strokeWidth={2} 
                      fill="transparent" 
                      name="Estornos"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 3 – ESTORNOS & MÉTRICAS SECUNDÁRIAS */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-medium text-gray-500">Estornos no Mês</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end justify-between">
                <h4 className="text-2xl font-bold text-gray-900">R$ {stats.refunds_month?.toFixed(2)}</h4>
                {stats.refunds_month > 0 && (
                  <Badge variant="destructive" className="mb-1">Alerta</Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Total devolvido aos usuários</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-medium text-gray-500">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <h4 className="text-2xl font-bold text-gray-900">
                R$ {purchases.length > 0 ? (stats.total_historical / purchases.length).toFixed(2) : '0.00'}
              </h4>
              <p className="text-xs text-gray-400 mt-2">Por transação aprovada</p>
            </CardContent>
          </Card>

          {/* Card de Risco de Churn */}
          <Card className="border-none shadow-sm bg-orange-50 border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h4 className="font-bold text-orange-800">Risco de Churn</h4>
              </div>
              <p className="text-sm text-orange-700">
                Existem <strong>{stats.churned_month}</strong> usuários que cancelaram recentemente. Verifique os motivos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 4 – TABELA DE ESTORNOS E CANCELAMENTOS */}
      {refunds.length > 0 && (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-gray-50 bg-red-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900">Estornos & Cancelamentos Recentes</h3>
              </div>
              <Badge variant="outline" className="bg-white border-red-200 text-red-600">
                {refunds.length} Pendentes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell className="font-medium">{refund.username}</TableCell>
                    <TableCell className="capitalize">{refund.plan}</TableCell>
                    <TableCell className="text-red-600 font-bold">-R$ {refund.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{refund.reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50">
                        {refund.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => handleProcessRefund(refund.id)}
                      >
                        Processar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 5 – TRANSAÇÕES RECENTES (Mantida) */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
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
                          <Avatar className={`h-8 w-8 border-none ${getUserColor(purchase.username || 'Usuário').bg}`}>
                            <AvatarFallback className={`bg-transparent text-[10px] font-bold ${getUserColor(purchase.username || 'Usuário').text}`}>
                              {(purchase.username || 'Usuário').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{purchase.username || 'Usuário'}</span>
                            <span className="text-xs text-gray-500 max-w-[200px] truncate">{purchase.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-600 capitalize">
                          {purchase.plan === 'weekly' ? 'Semanal' : 
                           purchase.plan === 'monthly' ? 'Mensal' : 
                           purchase.plan === 'annual' ? 'Anual' : purchase.plan}
                        </span>
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
                          • {purchase.status === 'approved' || purchase.status === 'paid' ? 'Aprovado' : 
                             purchase.status === 'pending' ? 'Pendente' : 
                             purchase.status === 'rejected' ? 'Rejeitado' : purchase.status}
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