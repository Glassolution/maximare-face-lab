
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { DashboardStatsCards } from "@/components/admin/DashboardStatsCards";
import { DashboardOverviewCard } from "@/components/admin/DashboardOverviewCard";
import { DashboardVisitorsChart } from "@/components/admin/DashboardVisitorsChart";
import { DashboardBottomCharts } from "@/components/admin/DashboardBottomCharts";
import { DashboardRecentUsers } from "@/components/admin/DashboardRecentUsers";
import { DashboardSidebar } from "@/components/admin/DashboardSidebar";

export interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  totalRevenue: number;
  analysesToday: number;
}

export interface ChartDataPoint {
  name: string;
  users: number;
  organic: number;
  direct: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalRevenue: 0,
    analysesToday: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { count: premiumUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_premium", true);

      const { data: purchases } = await supabase
        .from("purchases")
        .select("amount_cents");
      const totalRevenue =
        purchases?.reduce((acc, curr) => acc + (curr.amount_cents || 0), 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: analysesToday } = await supabase
        .from("user_data")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", today.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalRevenue: totalRevenue / 100,
        analysesToday: analysesToday || 0,
      });

      const { data: recent } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUsers(recent || []);

      const months: ChartDataPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", start)
          .lte("created_at", end);

        months.push({
          name: format(date, "MMM", { locale: ptBR }),
          users: count || 0,
          organic: Math.floor((count || 0) * 0.7),
          direct: Math.floor((count || 0) * 0.3),
        });
      }
      setChartData(months);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-gray-500">Carregando dashboard...</div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Main content area */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Row 1: Overview + Visitors Chart */}
          <div className="grid grid-cols-12 gap-6">
            <DashboardOverviewCard stats={stats} />
            <DashboardVisitorsChart chartData={chartData} />
          </div>

          {/* Row 2: Bottom charts */}
          <DashboardBottomCharts stats={stats} />

          {/* Row 3: Recent Users table */}
          <DashboardRecentUsers recentUsers={recentUsers} />
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <DashboardSidebar stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
