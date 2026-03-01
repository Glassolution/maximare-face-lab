
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "@/hooks/useAdminDashboard";

interface Props {
  chartData: DashboardData['visitorsChart'];
}

export const DashboardVisitorsChart = ({ chartData }: Props) => (
  <Card className="col-span-12 lg:col-span-7 border-none shadow-sm rounded-xl bg-white">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-lg font-bold text-gray-800">Novos Usuários por Mês</CardTitle>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Direto
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" /> Orgânico
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="direct" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={8} />
            <Bar dataKey="organic" fill="#FACC15" radius={[4, 4, 0, 0]} barSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);
