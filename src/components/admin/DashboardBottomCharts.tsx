
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { ShoppingCart, DollarSign } from "lucide-react";
import type { DashboardStats } from "@/pages/admin/Dashboard";

interface Props {
  stats: DashboardStats;
}

const salesData = [
  { name: "Jan", sales: 4000 },
  { name: "Feb", sales: 3000 },
  { name: "Mar", sales: 2000 },
  { name: "Apr", sales: 2780 },
  { name: "May", sales: 1890 },
  { name: "Jun", sales: 2390 },
  { name: "Jul", sales: 3490 },
];

const pieData = [
  { name: "Weekly", value: 400 },
  { name: "Monthly", value: 300 },
  { name: "Annual", value: 300 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

export const DashboardBottomCharts = ({ stats }: Props) => (
  <div className="grid grid-cols-12 gap-6">
    {/* Total Orders / Analyses */}
    <Card className="col-span-12 lg:col-span-5 border-none shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <ShoppingCart className="h-5 w-5 text-blue-500" />
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Analyses</p>
          <h3 className="text-2xl font-bold text-gray-800">
            {(stats.analysesToday * 124).toLocaleString()}
          </h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData}>
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
        <CardTitle className="text-sm font-bold text-gray-800">Sales By Category</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="h-[120px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-xs font-bold text-gray-800 block">Total</span>
            <span className="text-xs text-gray-500">1000</span>
          </div>
        </div>
        <div className="flex gap-3 text-[10px] mt-2 text-gray-500">
          {pieData.map((item, i) => (
            <span key={item.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              {item.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Daily Sales */}
    <Card className="col-span-12 lg:col-span-4 border-none shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold text-gray-800">Daily Sales</CardTitle>
        <div className="p-1 bg-blue-500 rounded text-white">
          <DollarSign className="h-3 w-3" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData.slice(0, 5)}>
              <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 4, 4]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </div>
);
