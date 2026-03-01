
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "@/hooks/useAdminDashboard";

interface Props {
  chartData: DashboardData['visitorsChart'];
}

export const DashboardVisitorsChart = ({ chartData }: Props) => {
  const hasData = chartData.some(d => d.usuarios > 0);

  return (
    <Card className="col-span-12 lg:col-span-7 border-none shadow-sm rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-gray-800">Novos Usuários por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(value: any) => [`${value} novos usuários`, '']}
                  labelStyle={{ color: "#111827", fontWeight: "bold" }}
                />
                <Bar dataKey="usuarios" name="Novos Usuários" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
