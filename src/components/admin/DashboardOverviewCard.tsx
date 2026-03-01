
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DashboardStats } from "@/pages/admin/Dashboard";

interface Props {
  stats: DashboardStats;
}

export const DashboardOverviewCard = ({ stats }: Props) => (
  <Card className="col-span-12 lg:col-span-5 border-none shadow-sm rounded-xl overflow-hidden bg-white">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-lg font-bold text-gray-800">Overview</CardTitle>
      <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer text-xs">
        All time ▼
      </Badge>
    </CardHeader>
    <CardContent className="pt-4">
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-blue-500 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-blue-100 text-sm font-medium">Customers</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">8%</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
        </div>
        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 text-sm font-medium">Income</span>
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">15%</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">Welcome to our new <b>online experience</b></p>
      <div className="flex -space-x-3">
        {[1, 2, 3, 4].map((i) => (
          <Avatar key={i} className="border-2 border-white w-10 h-10">
            <AvatarImage src={`https://i.pravatar.cc/150?img=${i + 10}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        ))}
        <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold">
          +99
        </div>
      </div>
      <div className="flex justify-between mt-2 px-2 text-xs font-medium text-gray-800">
        <span>John</span>
        <span>Andrew</span>
        <span>Darwin</span>
        <span>Cristian</span>
        <span></span>
      </div>
    </CardContent>
  </Card>
);
