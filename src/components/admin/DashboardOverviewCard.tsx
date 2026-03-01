
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DashboardData } from "@/hooks/useAdminDashboard";

interface Props {
  stats: DashboardData['stats'];
  latestAvatars: DashboardData['latestAvatars'];
}

export const DashboardOverviewCard = ({ stats, latestAvatars }: Props) => (
  <Card className="col-span-12 lg:col-span-5 border-none shadow-sm rounded-xl overflow-hidden bg-white">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-lg font-bold text-gray-800">Visão Geral</CardTitle>
      <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer text-xs">
        Este Mês ▼
      </Badge>
    </CardHeader>
    <CardContent className="pt-4">
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-blue-500 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-blue-100 text-sm font-medium">Novos Clientes</span>
          </div>
          <div className="text-2xl font-bold">{stats.customersThisMonth.toLocaleString()}</div>
        </div>
        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 text-sm font-medium">Receita (Mês)</span>
            <span className={`bg-gray-100 px-1.5 py-0.5 rounded text-xs ${stats.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.incomeGrowth > 0 ? '+' : ''}{stats.incomeGrowth.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            R$ {stats.incomeThisMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">Últimos usuários cadastrados</p>
      <div className="flex items-center gap-4">
        {latestAvatars.map((user) => (
          <div key={user.id} className="flex flex-col items-center">
            <Avatar className="border-2 border-white w-10 h-10 shadow-sm mb-1">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-slate-900 text-white text-xs font-bold">
                {user.username?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-gray-600 font-medium truncate max-w-[60px] text-center">
              {user.username || 'User'}
            </span>
          </div>
        ))}
        {stats.totalUsers > 4 && (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold shadow-sm mb-1">
              +{stats.totalUsers - 4}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">mais</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);
