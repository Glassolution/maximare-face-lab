
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
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

const getLast12Months = () => {
  const months: { key: string; label: string }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    });
  }

  return months;
};

const PaymentBehaviorTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const receita = payload.find((p: any) => p.dataKey === "receita")?.value ?? 0;
  const novosAssinantes = payload.find((p: any) => p.dataKey === "novosAssinantes")?.value ?? 0;
  const cancelamentos = payload.find((p: any) => p.dataKey === "cancelamentos")?.value ?? 0;
  const taxaConversao = payload[0]?.payload?.taxaConversao ?? 0;

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[200px]">
      <p className="text-sm font-bold text-gray-900 mb-3">{label}</p>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E91E63]" />
            <span className="text-gray-500">Receita</span>
          </div>
          <span className="font-semibold text-gray-900">
            R$ {Number(receita).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="text-gray-500">Novos Assin.</span>
          </div>
          <span className="font-semibold text-gray-900">{novosAssinantes}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2196F3]" />
            <span className="text-gray-500">Cancelamentos</span>
          </div>
          <span className="font-semibold text-gray-900">{cancelamentos}</span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
          <span className="text-gray-500">Conv. Rate</span>
          <span className="font-semibold text-gray-900">
            {Number(taxaConversao).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
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
    mrr: 0,
    mrrReal: 0,
    arrReal: 0,
    totalSubscribers: 0
  });
  const [showNetRevenue, setShowNetRevenue] = useState(false);
  const [viewMode, setViewMode] = useState<'real' | 'projection'>('projection');
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [revenueDays, setRevenueDays] = useState(30);
  const [paymentBehaviorData, setPaymentBehaviorData] = useState<any[]>([]);
  const [paymentBehaviorLoading, setPaymentBehaviorLoading] = useState(true);
  const [paymentBehaviorError, setPaymentBehaviorError] = useState<string | null>(null);

  // Hook para buscar receita diária real (tabela payments)
  const fetchRevenueChartData = async (days: number) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .eq('status', 'approved')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching revenue chart data:", error);
        return;
    }

    // Agrupa por dia
    const grouped: Record<string, number> = {};
    
    (data || []).forEach((payment: any) => {
      const day = new Date(payment.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short'
      });
      grouped[day] = (grouped[day] || 0) + Number(payment.amount || 0);
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

  const fetchPaymentBehavior = async () => {
    try {
      setPaymentBehaviorLoading(true);
      setPaymentBehaviorError(null);

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: payments, error } = await supabase
        .from("payments")
        .select("amount, status, plan_id, created_at, metadata")
        .gte("created_at", oneYearAgo.toISOString());

      console.log("payments error (growth chart):", error);
      console.log("payments count (growth chart):", payments?.length);

      if (error) {
        throw new Error(`Erro payments: ${error.message}`);
      }

      const months: any[] = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

        const mp =
          (payments ?? []).filter(
            (p: any) => p.created_at && String(p.created_at).startsWith(key)
          ) ?? [];

        const receita = mp
          .filter((p: any) => p.status === "approved")
          .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

        const novosAssinantes = mp.filter((p: any) => p.status === "approved").length;

        const cancelamentos = 0; // ainda sem source confiável por mês

        months.push({
          month: label.toUpperCase(),
          receita,
          novosAssinantes,
          cancelamentos,
          taxaConversao: 0,
        });
      }

      console.log("Final growth chart months:", months);
      setPaymentBehaviorData(months);
    } catch (error: any) {
      console.error("Chart fetch error (payment behavior):", error);
      setPaymentBehaviorError(
        error?.message || "Erro ao carregar dados de crescimento e receita"
      );
      setPaymentBehaviorData([]);
    } finally {
      setPaymentBehaviorLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueChartData(revenueDays);
  }, [revenueDays]);

  // Mock data for the basic chart (fallback)
  const basicChartData = [
    { name: '1 Fev', value: 0 },
    { name: '28 Fev', value: 0 },
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
    fetchPaymentBehavior();
  }, []);

  const toggleAdvancedMode = (checked: boolean) => {
    setIsAdvancedMode(checked);
    localStorage.setItem('finance_advanced_mode', String(checked));
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      // 1. Fetch Purchases
      const { data: purchaseData, error: purchaseError } = await supabase.rpc('get_admin_purchases');
      if (purchaseError) throw purchaseError;
      
      const purchaseList = purchaseData as AdminPurchase[] || [];
      setPurchases(purchaseList);

      // 2. Fetch Active Subscribers for MRR
      const { data: subscribersData, error: subError } = await supabase
        .from('profiles')
        .select('plan_type, premium_status')
        .eq('premium_status', true);
      
      if (subError) throw subError;

      // 3. Fetch Churn Data (aproximado, usando updated_at e base atual de assinantes)
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Cancelados no mês
      const { count: canceledCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('subscription_status', ['canceled', 'expired'])
        .gte('updated_at', startOfCurrentMonth);

      // --- Calculations ---

      const today = now.toISOString().split('T')[0];
      
      // Receita Hoje (Approved only)
      const todayRevenue = purchaseList
        .filter((p: any) => p.created_at.startsWith(today) && (p.status === 'approved' || p.status === 'paid'))
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      // Receita Mês (Approved only)
      const monthRevenue = purchaseList
        .filter((p: any) => p.created_at >= startOfCurrentMonth && (p.status === 'approved' || p.status === 'paid'))
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      // Receita Total (Approved only)
      const totalRevenue = purchaseList
        .filter((p: any) => p.status === 'approved' || p.status === 'paid')
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      // Estornos Mês
      const refundsMonth = purchaseList
        .filter((p: any) => (p.status === 'refunded' || p.status === 'charged_back') && p.created_at >= startOfCurrentMonth)
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      // MRR Calculation based on active plans
      // Weekly: 24.90 * 4.33 approx
      // Monthly: 49.90
      // Annual: 499.90 / 12
      const priceMap: Record<string, number> = { 
        weekly: 24.90 * 4.33, 
        monthly: 49.90, 
        annual: 499.90 / 12 
      };
      
      const mrr = (subscribersData || []).reduce((sum, p) => sum + (priceMap[p.plan_type || ''] || 0), 0);

      // Churn Rate
      const totalStart = (subscribersData?.length || 0) || 1; // base aproximada: assinantes premium atuais
      const churnRate = ((canceledCount || 0) / totalStart) * 100;

      // MRR Real (Last 30 days approved revenue)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const mrrReal = purchaseList
        .filter((p: any) => new Date(p.created_at) >= thirtyDaysAgo && (p.status === 'approved' || p.status === 'paid'))
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      // ARR Real (Last 365 days approved revenue)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const arrReal = purchaseList
        .filter((p: any) => new Date(p.created_at) >= oneYearAgo && (p.status === 'approved' || p.status === 'paid'))
        .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

      setStats({
        today: todayRevenue / 100,
        month: monthRevenue / 100,
        total: totalRevenue / 100,
        refunds: refundsMonth / 100,
        churnRate: churnRate,
        netRevenue: (monthRevenue - refundsMonth) / 100,
        mrr: mrr,
        mrrReal: mrrReal / 100,
        arrReal: arrReal / 100,
        totalSubscribers: subscribersData?.length || 0
      });

    } catch (error) {
      console.error("Error fetching finance data:", error);
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
                <h2 className="text-2xl font-bold tracking-tight">R$ {stats.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">+0%</span>
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
              <h2 className="text-2xl font-bold tracking-tight">R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              <p className="text-xs text-slate-400 mt-2 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                Projeção planos ativos
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 text-sm font-medium">ARR (Anual)</span>
                <div className="p-1.5 bg-gray-50 rounded-full text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">R$ {(stats.mrr * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              <p className="text-xs text-slate-400 mt-2">Projeção anual (MRR x 12)</p>
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
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Cancelamentos</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Dentro da meta de 3%</p>
            </div>
          </div>

          {/* Gráfico Avançado - Crescimento & Receita */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm mb-10">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Crescimento & Receita</h3>
                <span className="text-xs text-gray-400 font-medium">
                  Últimos 12 meses · Receita, novos assinantes e cancelamentos
                </span>
              </div>
            </div>

            <div className="relative h-[400px] w-full">
              {paymentBehaviorLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Carregando dados de crescimento e receita...
                </div>
              ) : paymentBehaviorError ? (
                <div className="h-full flex items-center justify-center text-xs text-red-500 text-center px-4">
                  Erro ao carregar dados de crescimento e receita: {paymentBehaviorError}
                </div>
              ) : !paymentBehaviorData || paymentBehaviorData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Sem dados para os últimos 12 meses.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={paymentBehaviorData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} 
                      dy={20}
                    />
                    <YAxis 
                      yAxisId="revenue"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} 
                      tickFormatter={(val) => `R$${Number(val).toFixed(0)}`} 
                      domain={[0, 'auto']}
                    />
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
                      allowDecimals={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<PaymentBehaviorTooltip />} />
                    <Legend />
                    <Line 
                      yAxisId="revenue"
                      type="monotone" 
                      dataKey="receita" 
                      stroke="#E91E63" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#E91E63' }} 
                    />
                    <Line 
                      yAxisId="count"
                      type="monotone" 
                      dataKey="novosAssinantes" 
                      stroke="#4CAF50" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#4CAF50' }} 
                    />
                    <Line 
                      yAxisId="count"
                      type="monotone" 
                      dataKey="cancelamentos" 
                      stroke="#2196F3" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#2196F3' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Receita Hoje */}
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Receita Hoje</p>
                <h3 className="text-xl font-bold text-gray-900">R$ {stats.today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                <h3 className="text-xl font-bold text-gray-900">R$ {stats.month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.1%
              </Badge>
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
                <h4 className="text-xl font-bold text-gray-900">R$ {purchases.length > 0 ? (stats.total / purchases.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0.00'}</h4>
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
                <h4 className="text-xl font-bold text-gray-900">{stats.totalSubscribers}</h4>
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
                          R$ {(purchase.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-gray-500 border-gray-200 bg-white">
                          {purchase.provider === 'stripe' ? 'Mercado Pago' : purchase.provider === 'mercadopago' ? 'Mercado Pago' : purchase.provider}
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
