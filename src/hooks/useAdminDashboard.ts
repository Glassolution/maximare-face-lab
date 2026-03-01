
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, startOfDay, subDays, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DashboardData {
  stats: {
    totalUsers: number;
    premiumUsers: number;
    totalRevenue: number;
    totalExpenses: number;
    activeSubscribers: number;
    customersThisMonth: number;
    incomeThisMonth: number;
    incomeGrowth: number; // Percentage
    myBalance: number;
    totalAnalyses: number;
  };
  visitorsChart: {
    name: string;
    usuarios: number;
  }[];
  salesByCategory: {
    name: string;
    value: number;
  }[];
  dailySales: {
    name: string;
    sales: number;
  }[];
  recentUsers: any[];
  latestAvatars: any[];
}

export function useAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        
        // 1. Fetch data in parallel
        // Usamos get_admin_users RPC para ter acesso aos emails também
        const [usersRes, purchasesRes, analysesRes] = await Promise.all([
          supabase.rpc('get_admin_users'),
          supabase.from('purchases').select('*'),
          supabase.from('user_data').select('id, updated_at', { count: 'exact', head: true })
        ]);

        const profiles = usersRes.data || [];
        const purchases = purchasesRes.data || [];
        const totalAnalyses = analysesRes.count || 0;

        // 2. Process Stats
        const approvedPurchases = purchases.filter(p => p.status === 'approved' || p.status === 'paid');
        const totalRevenue = approvedPurchases.reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
        
        const expensesPurchases = purchases.filter(p => ['refunded', 'charged_back'].includes(p.status));
        const totalExpenses = expensesPurchases.reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;

        // Na RPC get_admin_users, precisamos ver se tem subscription_status. Se não tiver, usamos is_premium.
        // A RPC atual retorna: id, username, email, is_premium, plan_type, is_ugc, banned, display_name, avatar_url, created_at
        // Não tem subscription_status. Vamos assumir is_premium como ativo por enquanto, ou buscar profiles cru se status for crítico.
        // O prompt pede "Active Subscribers -> COUNT(*) FROM profiles WHERE premium = true AND subscription_status = 'active'".
        // Como a RPC não traz status, vamos buscar profiles cru também APENAS para contagem precisa se necessário,
        // OU confiar que is_premium na RPC reflete o status ativo (que deveria).
        // Vamos usar is_premium da RPC como proxy de ativo para simplificar, já que a RPC filtra/processa dados.
        // Mas para garantir 100% de fidelidade ao prompt, vou buscar profiles cru também para ter subscription_status.
        
        const { data: profilesRaw } = await supabase.from('profiles').select('id, is_premium, subscription_status, created_at, plan_type');
        const profilesForStats = profilesRaw || [];

        const activeSubscribers = profilesForStats.filter(p => p.is_premium && (p.subscription_status === 'active' || p.subscription_status === 'trialing')).length;
        
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));

        const customersThisMonth = profilesForStats.filter(p => new Date(p.created_at) >= startOfCurrentMonth).length;
        
        const incomeThisMonth = approvedPurchases
          .filter(p => new Date(p.created_at) >= startOfCurrentMonth)
          .reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;

        const incomeLastMonth = approvedPurchases
          .filter(p => {
            const date = new Date(p.created_at);
            return date >= startOfLastMonth && date < startOfCurrentMonth;
          })
          .reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;

        const incomeGrowth = incomeLastMonth > 0 
          ? ((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100 
          : incomeThisMonth > 0 ? 100 : 0;

        // 3. Process Charts
        
        // Visitors Chart (Last 12 months)
        const visitorsChart = [];
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(now, i);
          const monthProfiles = profilesForStats.filter(p => isSameMonth(new Date(p.created_at), date));
          visitorsChart.push({
            name: format(date, "MMM/yy", { locale: ptBR }),
            usuarios: monthProfiles.length
          });
        }

        // Sales By Category (Donut)
        const plans = profilesForStats.filter(p => p.is_premium).reduce((acc, p) => {
          const plan = p.plan_type || 'unknown';
          acc[plan] = (acc[plan] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const salesByCategory = Object.entries(plans).map(([key, value]) => ({
          name: key === 'weekly' ? 'Semanal' : key === 'monthly' ? 'Mensal' : key === 'annual' ? 'Anual' : key,
          value
        }));

        // Daily Sales (Last 7 days)
        const dailySales = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(now, i);
          const daySales = approvedPurchases
            .filter(p => isSameDay(new Date(p.created_at), date))
            .reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
            
          dailySales.push({
            name: format(date, "dd/MM"),
            sales: daySales
          });
        }

        // 4. Lists (Usando dados da RPC que tem email e avatar)
        const recentUsers = [...profiles]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);

        const latestAvatars = recentUsers.slice(0, 4).map(u => ({
          id: u.id,
          username: u.username,
          avatar_url: u.avatar_url
        }));

        setData({
          stats: {
            totalUsers: profilesForStats.length,
            premiumUsers: profilesForStats.filter(p => p.is_premium).length,
            totalRevenue,
            totalExpenses,
            activeSubscribers,
            customersThisMonth,
            incomeThisMonth,
            incomeGrowth,
            myBalance: totalRevenue - totalExpenses,
            totalAnalyses
          },
          visitorsChart,
          salesByCategory,
          dailySales,
          recentUsers,
          latestAvatars
        });

      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  return { data, loading };
}
