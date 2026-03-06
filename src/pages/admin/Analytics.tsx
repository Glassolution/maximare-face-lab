import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Eye, 
  Users, 
  UserX, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  LogOut as LogOutIcon
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface PageData {
  page_path: string;
  views: number;
  unique_visitors: number;
  avg_duration_seconds: number | null;
  exit_count: number;
  exit_rate: number;
}

interface DailyData {
  day: string;
  visitors: number;
  pageviews: number;
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Landing Page",
  "/onboarding": "Onboarding",
  "/login": "Login",
  "/auth/login": "Login",
  "/auth/signup": "Cadastro",
  "/analysis": "Análise Facial",
  "/results": "Resultados",
  "/ger-results": "Resultados GER",
  "/profile": "Perfil",
  "/friends": "Social",
  "/premium": "Premium",
  "/checkout": "Checkout",
  "/progress": "Progresso",
  "/trends": "Tendências",
  "/recommendations": "Recomendações",
  "/look-alike": "Look Alike",
  "/battles": "Batalhas",
  "/subscription": "Assinatura",
  "/cancel-subscription": "Cancelamento",
};

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    totalPageviews: 0,
    registeredVisitors: 0,
    anonymousVisitors: 0,
  });
  const [pages, setPages] = useState<PageData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_page_analytics", {
        days_back: period,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;

      setStats({
        totalVisitors: Number(row.total_visitors) || 0,
        totalPageviews: Number(row.total_pageviews) || 0,
        registeredVisitors: Number(row.registered_visitors) || 0,
        anonymousVisitors: Number(row.anonymous_visitors) || 0,
      });

      setPages((row.pages as PageData[]) || []);
      setDailyData((row.daily_visitors as DailyData[]) || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const topExitPages = [...pages]
    .filter((p) => p.exit_count > 0)
    .sort((a, b) => b.exit_rate - a.exit_rate)
    .slice(0, 5);

  const topPages = [...pages].sort((a, b) => b.views - a.views).slice(0, 10);

  if (loading) {
    return <div className="p-8 text-gray-500">Carregando analytics...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Visitantes & Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Acompanhe todos os acessos ao site, incluindo visitantes sem conta.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          {[7, 14, 30, 90].map((d) => (
            <Button
              key={d}
              variant="ghost"
              size="sm"
              className={`h-8 text-xs ${
                period === d
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setPeriod(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Visitantes
              </span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.totalVisitors.toLocaleString("pt-BR")}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              últimos {period} dias
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Visualizações
              </span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.totalPageviews.toLocaleString("pt-BR")}
            </h3>
            <p className="text-xs text-gray-400 mt-1">page views totais</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Com Conta
              </span>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.registeredVisitors.toLocaleString("pt-BR")}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              visitantes logados
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sem Conta
              </span>
              <div className="p-2 bg-amber-50 rounded-lg">
                <UserX className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.anonymousVisitors.toLocaleString("pt-BR")}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              visitantes anônimos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Visitors Chart */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Visitantes Diários
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Sessões únicas por dia
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: any, name: string) => [
                    value,
                    name === "visitors" ? "Visitantes" : "Page Views",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorVisitors)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Visited Pages */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Páginas Mais Acessadas
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Página</TableHead>
                  <TableHead className="text-xs text-right">Views</TableHead>
                  <TableHead className="text-xs text-right">Únicos</TableHead>
                  <TableHead className="text-xs text-right">Tempo Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      Nenhum dado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  topPages.map((p, i) => (
                    <TableRow key={p.page_path}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {PAGE_LABELS[p.page_path] || p.page_path}
                            </span>
                            <span className="block text-xs text-gray-400">
                              {p.page_path}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-gray-900">
                        {p.views}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {p.unique_visitors}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {formatDuration(p.avg_duration_seconds)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Exit Pages */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <LogOutIcon className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900">
                Páginas de Saída
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Onde os visitantes abandonam o app
            </p>

            {topExitPages.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Nenhum dado ainda
              </p>
            ) : (
              <div className="space-y-4">
                {topExitPages.map((p) => (
                  <div key={p.page_path}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {PAGE_LABELS[p.page_path] || p.page_path}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${
                            p.exit_rate >= 60
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : p.exit_rate >= 30
                                ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          } border-none`}
                        >
                          {p.exit_rate}% saída
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {p.exit_count} saídas
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          p.exit_rate >= 60
                            ? "bg-red-500"
                            : p.exit_rate >= 30
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(p.exit_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Page Views Bar Chart */}
      {topPages.length > 0 && (
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Comparativo de Páginas
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPages.map((p) => ({
                    name: PAGE_LABELS[p.page_path] || p.page_path,
                    views: p.views,
                    exits: p.exit_count,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="views" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Views" />
                  <Bar dataKey="exits" fill="#EF4444" radius={[0, 4, 4, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalytics;
