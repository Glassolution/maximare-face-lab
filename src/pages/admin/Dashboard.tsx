
import { useEffect } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { DashboardOverviewCard } from "@/components/admin/DashboardOverviewCard";
import { DashboardVisitorsChart } from "@/components/admin/DashboardVisitorsChart";
import { DashboardBottomCharts } from "@/components/admin/DashboardBottomCharts";
import { DashboardRecentUsers } from "@/components/admin/DashboardRecentUsers";
import { DashboardSidebar } from "@/components/admin/DashboardSidebar";

const AdminDashboard = () => {
  const { data, loading } = useAdminDashboard();

  if (loading || !data)
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
            <DashboardOverviewCard 
              stats={data.stats} 
              latestAvatars={data.latestAvatars}
            />
            <DashboardVisitorsChart chartData={data.visitorsChart} />
          </div>

          {/* Row 2: Bottom charts */}
          <DashboardBottomCharts 
            stats={data.stats} 
            salesByCategory={data.salesByCategory}
            dailySales={data.dailySales}
          />

          {/* Row 3: Recent Users table */}
          <DashboardRecentUsers recentUsers={data.recentUsers} />
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <DashboardSidebar stats={data.stats} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
