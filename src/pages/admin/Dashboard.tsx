
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Activity, 
  DollarSign, 
  ShoppingCart,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalRevenue: 0,
    analysesToday: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Stats
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: premiumUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
      
      const { data: purchases } = await supabase.from('purchases').select('amount_cents');
      const totalRevenue = purchases?.reduce((acc, curr) => acc + (curr.amount_cents || 0), 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: analysesToday } = await supabase
        .from('user_data')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalRevenue: totalRevenue / 100,
        analysesToday: analysesToday || 0
      });

      // 2. Recent Users
      const { data: recent } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentUsers(recent || []);

      // 3. Chart Data
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();
        
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
          
        months.push({
          name: format(date, 'MMM', { locale: ptBR }),
          users: count || 0,
          organic: Math.floor((count || 0) * 0.7),
          direct: Math.floor((count || 0) * 0.3)
        });
      }
      setChartData(months);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const salesData = [
    { name: 'Jan', sales: 4000 },
    { name: 'Feb', sales: 3000 },
    { name: 'Mar', sales: 2000 },
    { name: 'Apr', sales: 2780 },
    { name: 'May', sales: 1890 },
    { name: 'Jun', sales: 2390 },
    { name: 'Jul', sales: 3490 },
  ];

  const pieData = [
    { name: 'Weekly', value: 400 },
    { name: 'Monthly', value: 300 },
    { name: 'Annual', value: 300 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  if (loading) return <div className="p-8">Carregando dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column: Overview & Unique Visitors */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Row 1: Overview Cards & Visitors Chart */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* Overview Card */}
            <Card className="col-span-12 lg:col-span-5 border-none shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white">
                <CardTitle className="text-lg font-bold text-gray-800">Overview</CardTitle>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer">All time ▼</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex gap-4 mb-6">
                   <div className="flex-1 bg-blue-500 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-100 text-sm font-medium">Customers</span>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">+8%</span>
                      </div>
                      <div className="text-2xl font-bold">{stats.totalUsers}</div>
                   </div>
                   <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-sm font-medium">Income</span>
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">+15%</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">R$ {stats.totalRevenue.toFixed(0)}</div>
                   </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-3">Welcome to our new online experience</p>
                  <div className="flex -space-x-3">
                     {[1,2,3,4].map((i) => (
                       <Avatar key={i} className="border-2 border-white w-10 h-10">
                         <AvatarImage src={`https://i.pravatar.cc/150?img=${i+10}`} />
                         <AvatarFallback>U</AvatarFallback>
                       </Avatar>
                     ))}
                     <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold">+99</div>
                  </div>
                  <div className="flex justify-between mt-2 px-2 text-xs font-medium text-gray-800">
                    <span>John</span>
                    <span>Andrew</span>
                    <span>Darwin</span>
                    <span>Cristian</span>
                    <span></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unique Visitors Chart */}
            <Card className="col-span-12 lg:col-span-7 border-none shadow-sm rounded-xl">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">Unique Visitors</CardTitle>
                <div className="flex gap-4 text-xs">
                   <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Direct</div>
                   <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Organic</div>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barGap={4}>
                        <CartesianGrid vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        />
                        <Bar dataKey="direct" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={8} />
                        <Bar dataKey="organic" fill="#FACC15" radius={[4, 4, 0, 0]} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
            </Card>

          </div>

          {/* Row 2: Charts Area */}
          <div className="grid grid-cols-12 gap-6">
             {/* Total Orders Area Chart */}
             <Card className="col-span-12 lg:col-span-5 border-none shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div className="p-2 bg-blue-50 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-blue-500" />
                   </div>
                   <div className="text-right">
                      <p className="text-sm text-gray-500">Total Analyses</p>
                      <h3 className="text-2xl font-bold text-gray-800">{stats.analysesToday * 124}</h3>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={salesData}>
                            <defs>
                               <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </CardContent>
             </Card>

             {/* Sales By Category Pie Chart */}
             <Card className="col-span-12 lg:col-span-3 border-none shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-bold text-gray-800">Plans Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                   <div className="h-[120px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={pieData}
                               innerRadius={35}
                               outerRadius={50}
                               paddingAngle={5}
                               dataKey="value"
                            >
                               {pieData.map((entry, index) => (
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
                   <div className="flex gap-2 text-[10px] mt-2 text-gray-500">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#0088FE]"></div> Weekly</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00C49F]"></div> Monthly</span>
                   </div>
                </CardContent>
             </Card>
             
             {/* Daily Sales Bar Chart */}
             <Card className="col-span-12 lg:col-span-4 border-none shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <CardTitle className="text-sm font-bold text-gray-800">Daily Activity</CardTitle>
                   <div className="p-1 bg-blue-500 rounded text-white"><DollarSign className="h-3 w-3" /></div>
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
          
          {/* Row 3: Tables */}
          <div className="grid grid-cols-12 gap-6">
             <Card className="col-span-12 border-none shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-gray-50 py-4">
                   <CardTitle className="text-lg font-bold text-gray-800">Recent Users</CardTitle>
                   <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-8">Filter</Button>
                      <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-8">Export</Button>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                   <Table>
                      <TableHeader className="bg-gray-50/50">
                         <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider pl-6">Customer</TableHead>
                            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Plan</TableHead>
                            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</TableHead>
                            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-right pr-6">Status</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {recentUsers.map((user) => (
                            <TableRow key={user.id} className="hover:bg-gray-50/50 border-gray-50">
                               <TableCell className="pl-6 py-4">
                                  <div className="flex items-center gap-3">
                                     <Avatar className="h-9 w-9 border border-gray-100">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback className="bg-blue-50 text-blue-500 text-xs">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                     </Avatar>
                                     <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-800">{user.display_name || user.username}</span>
                                        <span className="text-xs text-gray-400">@{user.username}</span>
                                     </div>
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <span className="text-sm font-medium text-gray-600">{user.plan_type || 'Free'}</span>
                               </TableCell>
                               <TableCell>
                                  <span className="text-sm text-gray-500">{format(new Date(user.created_at), 'MMM dd, yyyy')}</span>
                               </TableCell>
                               <TableCell className="text-right pr-6">
                                  <Badge className={user.is_premium ? "bg-green-100 text-green-600 hover:bg-green-200 border-none shadow-none" : "bg-yellow-100 text-yellow-600 hover:bg-yellow-200 border-none shadow-none"}>
                                     {user.is_premium ? 'Premium' : 'Free'}
                                  </Badge>
                               </TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </CardContent>
             </Card>
          </div>

        </div>

        {/* Right Column: Side Stats */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
           {/* Stats List */}
           <div className="bg-white rounded-xl shadow-sm p-6 space-y-8">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
                    <h3 className="text-2xl font-bold text-gray-800">R$ {stats.totalRevenue.toFixed(0)}</h3>
                 </div>
                 <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-500">
                    <TrendingUp className="h-5 w-5" />
                 </div>
              </div>
              
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm text-gray-500 mb-1">Total Users</p>
                    <h3 className="text-2xl font-bold text-gray-800">{stats.totalUsers}</h3>
                 </div>
                 <div className="h-10 w-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-500">
                    <Users className="h-5 w-5" />
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm text-gray-500 mb-1">Active Subscribers</p>
                    <h3 className="text-2xl font-bold text-gray-800">{stats.premiumUsers}</h3>
                 </div>
                 <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500">
                    <Activity className="h-5 w-5" />
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                    <h3 className="text-2xl font-bold text-gray-800">R$ 4,200</h3>
                 </div>
                 <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-500">
                    <CreditCard className="h-5 w-5" />
                 </div>
              </div>
           </div>

           {/* My Balance Card */}
           <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full"></div>
              <p className="text-blue-100 text-sm mb-2">My Balance</p>
              <h3 className="text-3xl font-bold mb-6">R$ 165,100</h3>
              
              <div className="flex items-center justify-between mt-4">
                 <div className="flex flex-col">
                    <span className="text-xs text-blue-200">Valid thru</span>
                    <span className="font-mono text-sm">12/28</span>
                 </div>
                 <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
                    <div className="w-6 h-4 border border-white/50 rounded-sm flex gap-0.5 px-0.5 items-center">
                       <div className="w-2 h-2 rounded-full bg-white/50"></div>
                       <div className="w-2 h-2 rounded-full bg-white/50 relative -ml-1"></div>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Promo / Action Card */}
           <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                 <ShoppingCart className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">New Products</h4>
              <p className="text-sm text-gray-500 mb-4">Check out the new analysis models added this week.</p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">View Models</Button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
