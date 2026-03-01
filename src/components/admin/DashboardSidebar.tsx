
import { TrendingUp, Users, Activity, CreditCard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/hooks/useAdminDashboard";

interface Props {
  stats: DashboardData['stats'];
}

const StatItem = ({
  label,
  value,
  change,
  changeColor,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  change?: string;
  changeColor?: string;
  icon: any;
  iconBg: string;
  iconColor: string;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <p className="text-sm text-gray-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-gray-800">{value}</h3>
        {change && (
          <span className={`text-xs font-medium ${changeColor || "text-green-500"}`}>{change}</span>
        )}
      </div>
      <button className="text-xs text-blue-500 hover:underline mt-0.5">View more</button>
    </div>
    <div className={`h-10 w-10 ${iconBg} rounded-lg flex items-center justify-center ${iconColor}`}>
      <Icon className="h-5 w-5" />
    </div>
  </div>
);

export const DashboardSidebar = ({ stats }: Props) => (
  <div className="space-y-6">
    {/* Stats list */}
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-0.5">Receita Total</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3>
          </div>
          <button className="text-xs text-blue-500 hover:underline mt-0.5">Ver mais</button>
        </div>
        <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-500">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-0.5">Usuários Totais</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">{stats.totalUsers.toLocaleString()}</h3>
          </div>
          <button className="text-xs text-blue-500 hover:underline mt-0.5">Ver mais</button>
        </div>
        <div className="h-10 w-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-500">
          <Users className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-0.5">Assinantes Ativos</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">{stats.activeSubscribers.toLocaleString()}</h3>
          </div>
          <button className="text-xs text-blue-500 hover:underline mt-0.5">Ver mais</button>
        </div>
        <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500">
          <Activity className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-0.5">Despesas Totais</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">R$ {stats.totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3>
          </div>
          <button className="text-xs text-blue-500 hover:underline mt-0.5">Ver mais</button>
        </div>
        <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-500">
          <CreditCard className="h-5 w-5" />
        </div>
      </div>
    </div>

    {/* My Balance Card */}
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full" />
      <div className="flex items-center justify-between mb-1">
        <p className="text-blue-100 text-sm">Meu Saldo</p>
        <span className={`text-xs bg-white/20 px-1.5 py-0.5 rounded ${stats.incomeGrowth >= 0 ? 'text-green-300' : 'text-red-300'}`}>
           {stats.incomeGrowth > 0 ? '+' : ''}{stats.incomeGrowth.toFixed(1)}% (Mês)
        </span>
      </div>
      <h3 className="text-3xl font-bold mb-6">
        R$ {stats.myBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </h3>
      <div className="flex items-center justify-between mt-4">
        <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
          <div className="w-6 h-4 border border-white/50 rounded-sm flex gap-0.5 px-0.5 items-center">
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-2 h-2 rounded-full bg-white/50 relative -ml-1" />
          </div>
        </div>
      </div>
    </div>

    {/* Promo Card */}
    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 text-center">
      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
        <ShoppingCart className="h-6 w-6" />
      </div>
      <h4 className="font-bold text-gray-800 mb-2">Novos Produtos</h4>
      <p className="text-sm text-gray-500 mb-4">Confira os novos modelos de análise adicionados esta semana.</p>
      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Ver Modelos</Button>
    </div>
  </div>
);
