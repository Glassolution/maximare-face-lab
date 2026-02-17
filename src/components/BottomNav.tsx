import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Flame, Plus, User } from "lucide-react";

const leftItems = [
  { label: "Home", path: "/analysis", icon: Home },
  { label: "Progresso", path: "/progress", icon: TrendingUp },
];

const rightItems = [
  { label: "Trends", path: "/trends", icon: Flame },
  { label: "Perfil", path: "/profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-md border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {leftItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className="flex flex-col items-center gap-1 min-w-[48px]">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive ? "bg-primary/15 text-primary glow-primary-custom" : "text-text-muted hover:text-white"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-text-muted"}`}>{item.label}</span>
            </Link>
          );
        })}

        {/* Center + button */}
        <Link to="/analysis?start=true" className="flex flex-col items-center -mt-7">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg glow-primary-custom ring-4 ring-background-dark">
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-semibold text-primary mt-1">Análise</span>
        </Link>

        {rightItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className="flex flex-col items-center gap-1 min-w-[48px]">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive ? "bg-primary/15 text-primary glow-primary-custom" : "text-text-muted hover:text-white"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-text-muted"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
