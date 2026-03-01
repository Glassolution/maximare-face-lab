
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    month: 0,
    total: 0,
    refunds: 0,
    churnRate: 0,
    netRevenue: 0,
    mrr: 0
  });
  const [showNetRevenue, setShowNetRevenue] = useState(false);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [revenueDays, setRevenueDays] = useState(30);

  // Hook para buscar receita diária real
  const fetchRevenueChartData = async (days: number) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('purchases')
      .select('amount_cents, created_at')
      .eq('status', 'approved')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching revenue chart data:", error);
        return;
    }

    // Agrupa por dia
    const grouped: Record<string, number> = {};
    
    (data || []).forEach((purchase: any) => {
      const day = new Date(purchase.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short'
      });
      grouped[day] = (grouped[day] || 0) + (purchase.amount_cents / 100);
    });

    // Preenche dias sem vendas com 0
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      result.push({
        name: label, 
        value: grouped[label] || 0
      });
    }
    
    setRevenueChartData(result);
  };

  useEffect(() => {
    fetchRevenueChartData(revenueDays);
  }, [revenueDays]);

  // Mock data for the basic chart (fallback)
  const basicChartData = [
    { name: '1 Fev', value: 200 },
    { name: '5 Fev', value: 450 },
    { name: '10 Fev', value: 300 },
    { name: '15 Fev', value: 600 },
    { name: '20 Fev', value: 550 },
    { name: '25 Fev', value: 800 },
    { name: '28 Fev', value: 950 },
  ];

  // Advanced chart data matching the reference image
  const advancedChartData = [
    { name: 'JAN 2024', receita: 1.38, ocupacao: 1.50, vacancia: 1.46, aluguel: 1.45 },
    { name: 'ABR', receita: 1.41, ocupacao: 1.52, vacancia: 1.48, aluguel: 1.46 },
    { name: 'JUL', receita: 1.49, ocupacao: 1.65, vacancia: 1.41, aluguel: 1.48 },
    { name: 'OUT', receita: 1.53, ocupacao: 1.67, vacancia: 1.40, aluguel: 1.51 },
    { name: 'JAN 2025', receita: 1.58, ocupacao: 1.70, vacancia: 1.39, aluguel: 1.54 },
    { name: 'ABR', receita: 1.63, ocupacao: 1.72, vacancia: 1.38, aluguel: 1.56 },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  useEffect(() => {
    // Load advanced mode preference from localStorage
    const savedMode = localStorage.getItem('finance_advanced_mode');
    if (savedMode) {
      setIsAdvancedMode(savedMode === 'true');
    }
    fetchPurchases();
  }, []);

  const toggleAdvancedMode = (checked: boolean) => {
    setIsAdvancedMode(checked);
    localStorage.setItem('finance_advanced_mode', String(checked));
  };

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

      // Calculate advanced metrics
      const refundsMonth = purchaseList
        .filter((p: any) => (p.status === 'refunded' || p.status === 'charged_back') && p.created_at >= monthStart)
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      // Mock churn data (in real scenario, fetch from profiles)
      const churnedUsers = 5; // Example
      const totalSubscribers = 142; // Example
      const churnRate = (churnedUsers / totalSubscribers) * 100;

      const mrr = 14500; // Example MRR

      setStats({
        today: todayRevenue / 100,
        month: monthRevenue / 100,
        total: totalRevenue / 100,
        refunds: refundsMonth / 100,
        churnRate: churnRate,
        netRevenue: (monthRevenue - refundsMonth) / 100,
        mrr: mrr
      });

    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(purchases.length / itemsPerPage);
  const currentPurchases = purchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financeiro</h1>
          <p className="text-gray-500 mt-1">Gerencie suas receitas e transações de forma simplificada.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm">
          <Switch 
            id="advanced-mode" 
            checked={isAdvancedMode}
            onCheckedChange={toggleAdvancedMode}
          />
          <Label htmlFor="advanced-mode" className="text-sm font-medium cursor-pointer">
            Modo avançado
          </Label>
        </div>
      </div>

      {isAdvancedMode ? (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 text-sm font-medium">Lucro Líquido</span>
                <div className="p-1.5 bg-gray-50 rounded-full text-gray-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <h2 className="text-2xl font-bold tracking-tight">R$ {stats.netRevenue.toFixed(2)}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">+12%</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">vs. mês anterior</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 text-sm font-medium">MRR (Mensal)</span>
                <div className="p-1.5 bg-gray-50 rounded-full text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">R$ {stats.mrr.toFixed(2)}</h2>
              <p className="text-xs text-slate-400 mt-2 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                Atualizado agora
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 text-sm font-medium">ARR (Anual)</span>
                <div className="p-1.5 bg-gray-50 rounded-full text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">R$ {(stats.mrr * 12).toFixed(2)}</h2>
              <p className="text-xs text-slate-400 mt-2">Projeção anual baseada no MRR</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 text-sm font-medium">Taxa de Churn</span>
                <div className="p-1.5 bg-gray-50 rounded-full text-gray-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <h2 className="text-2xl font-bold tracking-tight">{stats.churnRate.toFixed(1)}%</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Reembolso</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Dentro da meta de 3%</p>
            </div>
          </div>

          {/* Gráfico Avançado - Comportamento de Pagamento */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm mb-10">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Comportamento de Pagamento</h3>
                <div className="text-gray-400 cursor-pointer">ⓘ</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EC4899]"></div>
                  <span className="text-xs text-gray-500 font-medium">Receita</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
                  <span className="text-xs text-gray-500 font-medium">Ocupação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></div>
                  <span className="text-xs text-gray-500 font-medium">Vacância</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                  <span className="text-xs text-gray-500 font-medium">Aluguel Efetivo</span>
                </div>
              </div>
            </div>

            <div className="relative h-[400px] w-full">
              <div className="absolute top-0 left-0 z-10">
                <Badge className="bg-[#EC4899] hover:bg-[#db2777] text-white border-none text-xs font-bold px-2 py-0.5 rounded-sm">
                  1.76M
                </Badge>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={advancedChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} 
                    dy={20}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} 
                    tickFormatter={(val) => `${val}M`} 
                    domain={[1.3, 1.8]}
                    ticks={[1.3, 1.4, 1.5, 1.6, 1.7, 1.8]}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[180px]">
                            <p className="text-sm font-bold text-gray-900 mb-3">{label === 'OUT' ? 'Abril 2025' : label}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full border-2 border-[#EC4899]"></div>
                                  <span className="text-xs text-gray-500">Receita</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">$1.63M</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full border-2 border-[#10B981]"></div>
                                  <span className="text-xs text-gray-500">Ocupação</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">85%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full border-2 border-[#3B82F6]"></div>
                                  <span className="text-xs text-gray-500">Vacância</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">15%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full border-2 border-gray-300"></div>
                                  <span className="text-xs text-gray-500">Aluguel Efet.</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">1.425 $/ft²</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#EC4899" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#EC4899' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ocupacao" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#10B981' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="vacancia" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#3B82F6' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aluguel" 
                    stroke="#CBD5E1" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#CBD5E1' }} 
                  />
                  {/* Linha vertical pontilhada em OUT */}
                  <line x1="58%" y1="20" x2="58%" y2="380" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" />
                  {/* Bolinhas brancas na interseção da linha vertical */}
                  <circle cx="58%" cy="135" r="3" fill="white" stroke="#10B981" strokeWidth={2} />
                  <circle cx="58%" cy="225" r="3" fill="white" stroke="#EC4899" strokeWidth={2} />
                  <circle cx="58%" cy="315" r="3" fill="white" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Receita por Categoria</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Assinaturas SaaS</span>
                      <span className="text-gray-900 font-bold">72%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Serviços de Consultoria</span>
                      <span className="text-gray-900 font-bold">18%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '18%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Taxas de Instalação</span>
                      <span className="text-gray-900 font-bold">10%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-slate-400 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
             </div>
             
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Atividade Recente</h3>
                <div className="space-y-6">
                   <div className="flex items-start space-x-4">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-1">
                         <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                         <p className="text-sm font-bold text-gray-900">Novo Assinante</p>
                         <p className="text-xs text-gray-400">Há 5 minutos</p>
                      </div>
                      <span className="text-sm font-bold text-gray-900">+ R$ 450,00</span>
                   </div>
                   <div className="flex items-start space-x-4">
                      <div className="p-2 rounded-lg bg-red-50 text-red-600 mt-1">
                         <ArrowUpRight className="w-4 h-4 rotate-180" />
                      </div>
                      <div className="flex-1">
                         <p className="text-sm font-bold text-gray-900">Reembolso Processado</p>
                         <p className="text-xs text-gray-400">Há 2 horas</p>
                      </div>
                      <span className="text-sm font-bold text-red-500">- R$ 1.200,00</span>
                   </div>
                   <div className="flex items-start space-x-4">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-1">
                         <Target className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                         <p className="text-sm font-bold text-gray-900">Upgrade de Plano</p>
                         <p className="text-xs text-gray-400">Há 4 horas</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-500">+ R$ 890,00</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <>
      {/* SEÇÃO 1 – CARDS SUPERIORES */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: Receita Hoje */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Receita Hoje</p>
                <h3 className="text-xl font-bold text-gray-900">R$ {stats.today.toFixed(2)}</h3>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2.5%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Receita Mês */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Receita Mês</p>
                <h3 className="text-xl font-bold text-gray-900">R$ {stats.month.toFixed(2)}</h3>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.1%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Lucro Líquido */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Lucro Líquido</p>
                <h3 className="text-xl font-bold text-emerald-600">R$ {stats.netRevenue.toFixed(2)}</h3>
              </div>
              <div className="p-1.5 bg-emerald-50 rounded-full text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Estornos */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Estornos (Mês)</p>
                <h3 className="text-xl font-bold text-red-600">R$ {stats.refunds.toFixed(2)}</h3>
              </div>
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                Churn
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Churn Rate */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Taxa de Churn</p>
                <h3 className="text-xl font-bold text-gray-900">{stats.churnRate.toFixed(1)}%</h3>
              </div>
              <div className="p-1.5 bg-gray-50 rounded-full text-gray-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: MRR */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">MRR (Mensal)</p>
                <h3 className="text-xl font-bold text-gray-900">R$ {stats.mrr.toFixed(0)}</h3>
              </div>
              <span className="text-[10px] text-gray-400 self-end mb-1">Est.</span>
            </div>
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
                  <h3 className="text-lg font-bold text-gray-900">
                    {showNetRevenue ? "Lucro Líquido (Receita - Estornos)" : "Receita Bruta"}
                  </h3>
                  <p className="text-sm text-gray-500">Desempenho nos últimos 30 dias</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`h-8 text-xs ${!showNetRevenue ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                      onClick={() => setShowNetRevenue(false)}
                    >
                      Bruta
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`h-8 text-xs ${showNetRevenue ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
                      onClick={() => setShowNetRevenue(true)}
                    >
                      Líquida
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 text-xs px-2 ${revenueDays === 7 ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setRevenueDays(7)}
                    >
                        7 dias
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 text-xs px-2 ${revenueDays === 30 ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setRevenueDays(30)}
                    >
                        30 dias
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData.length > 0 ? revenueChartData : basicChartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={showNetRevenue ? "#10B981" : "#3B82F6"} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={showNetRevenue ? "#10B981" : "#3B82F6"} stopOpacity={0}/>
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
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      itemStyle={{color: '#111827'}}
                      cursor={{stroke: showNetRevenue ? "#10B981" : "#3B82F6", strokeWidth: 1, strokeDasharray: '4 4'}}
                      formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, showNetRevenue ? "Receita Líquida" : "Receita Bruta"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={showNetRevenue ? "#10B981" : "#3B82F6"} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                    {/* Linha de estornos (simulada por enquanto) */}
                    {showNetRevenue && (
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        fillOpacity={0} 
                        strokeDasharray="5 5"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO 3 – SIDEBAR DE MÉTRICAS */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Média Transação</p>
                <h4 className="text-xl font-bold text-gray-900">R$ {purchases.length > 0 ? (stats.total / purchases.length).toFixed(2) : '0.00'}</h4>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
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
                  currentPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-8 w-8 border-none ${getUserColor(purchase.username || purchase.email || 'Usuário').bg}`}>
                            <AvatarFallback className={`bg-transparent text-[10px] font-bold ${getUserColor(purchase.username || purchase.email || 'Usuário').text}`}>
                              {(purchase.username || purchase.email || 'U').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{purchase.username || purchase.email || 'Usuário'}</span>
                            {purchase.username && <span className="text-xs text-gray-500 max-w-[200px] truncate" title={purchase.email}>{purchase.email}</span>}
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
                        <span className={`text-sm font-bold ${purchase.status === 'refunded' || purchase.status === 'charged_back' ? 'text-red-600' : 'text-gray-900'}`}>
                          {purchase.status === 'refunded' || purchase.status === 'charged_back' ? '-' : ''} 
                          R$ {(purchase.amount_cents / 100).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-gray-500 border-gray-200 bg-white">
                          {purchase.provider === 'stripe' ? 'Stripe' : purchase.provider === 'mercadopago' ? 'Mercado Pago' : purchase.provider}
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
                                : (purchase.status === 'refunded' || purchase.status === 'charged_back')
                                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'}
                          `}
                        >
                          • {purchase.status === 'approved' || purchase.status === 'paid' ? 'Aprovado' : 
                             purchase.status === 'pending' ? 'Pendente' : 
                             purchase.status === 'rejected' ? 'Rejeitado' : 
                             purchase.status === 'refunded' ? 'Reembolsado' : 
                             purchase.status === 'charged_back' ? 'Estorno' : purchase.status}
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
             <span className="text-xs text-gray-500">
               Exibindo {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, purchases.length)} de {purchases.length} transações
             </span>
             <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 text-xs bg-gray-500 hover:bg-gray-600 text-white" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Próximo
                </Button>
             </div>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
};

export default AdminFinance;
