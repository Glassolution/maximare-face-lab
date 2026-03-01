
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { ShoppingCart, DollarSign } from "lucide-react";
import type { DashboardData } from "@/hooks/useAdminDashboard";

interface Props {
  stats: DashboardData['stats'];
  salesByCategory: DashboardData['salesByCategory'];
  dailySales: DashboardData['dailySales'];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export const DashboardBottomCharts = ({ stats, salesByCategory, dailySales }: Props) => (
  <div className="grid grid-cols-12 gap-6">
    {/* Total Analyses */}
    <Card className="col-span-12 lg:col-span-5 border-none shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <ShoppingCart className="h-5 w-5 text-blue-500" />
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Análises Faciais</p>
          <h3 className="text-2xl font-bold text-gray-800">
            {stats.totalAnalyses.toLocaleString()}
          </h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySales.length > 0 ? dailySales : [{name: '', sales: 0}]}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>

    {/* Pie Chart */}
    <Card className="col-span-12 lg:col-span-3 border-none shadow-sm rounded-xl bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-800">Vendas por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="h-[120px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={salesByCategory} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                {salesByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-xs font-bold text-gray-800 block">Total</span>
            <span className="text-xs text-gray-500">{stats.activeSubscribers}</span>
          </div>
        </div>
        <div className="flex gap-3 text-[10px] mt-2 text-gray-500 flex-wrap justify-center">
          {salesByCategory.map((item, i) => (
            <span key={item.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {item.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Daily Sales */}
    <Card className="col-span-12 lg:col-span-4 border-none shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold text-gray-800">Vendas Diárias</CardTitle>
        <div className="p-1 bg-blue-500 rounded text-white">
          <DollarSign className="h-3 w-3" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySales}>
              <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 4, 4]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </div>
);
