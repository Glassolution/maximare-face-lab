
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Swords, 
  Palette, 
  Settings, 
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import AdminDashboard from "./admin/Dashboard";
import AdminUsers from "./admin/Users";
import AdminFinance from "./admin/Finance";
import AdminUGC from "./admin/UGC";

const AdminBattles = () => <div className="p-8 text-2xl font-bold">Batalhas (Em desenvolvimento)</div>;
const AdminSettings = () => <div className="p-8 text-2xl font-bold">Configurações (Em desenvolvimento)</div>;

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) {
      navigate("/");
    }
  }, [user, profile, loading, navigate]);

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!user || !profile?.is_admin) return null;

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Usuários", path: "/admin/users" },
    { icon: CreditCard, label: "Financeiro", path: "/admin/finance" },
    { icon: Swords, label: "Batalhas", path: "/admin/battles" },
    { icon: Palette, label: "Criadores UGC", path: "/admin/ugc" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/admin" && location.pathname === "/admin") return true;
    if (path !== "/admin" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-[#1E40AF] text-white flex flex-col shadow-xl",
          sidebarOpen ? "w-[220px]" : "w-[64px]"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-blue-800">
          {sidebarOpen && <span className="text-xl font-bold tracking-tight">Maximare</span>}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-blue-800 ml-auto"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive(item.path) 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-blue-100 hover:bg-white/5 hover:text-white",
                !sidebarOpen && "justify-center px-0"
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive(item.path) && "text-blue-200")} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold">
              {profile?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{profile?.username}</span>
                <span className="text-xs text-blue-300 truncate">Admin</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          sidebarOpen ? "ml-[220px]" : "ml-[64px]"
        )}
      >
        <div className="container py-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="battles" element={<AdminBattles />} />
            <Route path="ugc" element={<AdminUGC />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default Admin;
