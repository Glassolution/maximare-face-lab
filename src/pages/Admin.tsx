
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  BarChart3, 
  Palette, 
  Settings, 
  LogOut,
  Search,
  Bell,
  Moon,
  Mail,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import AdminDashboard from "./admin/Dashboard";
import AdminUsers from "./admin/Users";
import AdminFinance from "./admin/Finance";
import AdminUGC from "./admin/UGC";
import AdminAnalytics from "./admin/Analytics";

const AdminSettings = () => <div className="p-8 text-2xl font-bold">Configurações (Em desenvolvimento)</div>;

const Admin = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = profile?.is_admin || user?.email === 'xavierluisfelipe12@gmail.com';

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!user || !isAdmin) return null;

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Usuários", path: "/admin/users" },
    { icon: CreditCard, label: "Financeiro", path: "/admin/finance" },
    { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    { icon: Palette, label: "Criadores UGC", path: "/admin/ugc" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/admin" && location.pathname === "/admin") return true;
    if (path !== "/admin" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-[80px] bg-[#3B82F6] flex flex-col items-center py-6 shadow-xl transition-all duration-300">
        <div className="mb-8 h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-md">
          <span className="text-xl font-bold text-[#3B82F6]">M</span>
        </div>

        <nav className="flex-1 flex flex-col gap-4 w-full px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 mx-auto",
                isActive(item.path) 
                  ? "bg-white text-[#3B82F6] shadow-md" 
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              title={item.label}
            >
              <item.icon className="h-6 w-6" />
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 pb-4">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => signOut()}
            className="text-white/80 hover:bg-white/10 hover:text-white rounded-xl w-12 h-12 mx-auto"
            title="Sair"
          >
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[80px] min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white h-20 px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search or type a command" 
              className="pl-10 bg-gray-50 border-none rounded-lg h-10 w-full focus-visible:ring-1 focus-visible:ring-gray-200"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-lg">
              <Edit className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-lg">
              <Mail className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-lg">
              <Moon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-lg relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            
            <div className="flex items-center gap-3">
               <Avatar className="h-10 w-10 border-2 border-white shadow-sm cursor-pointer">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                    {profile?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="ugc" element={<AdminUGC />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default Admin;
