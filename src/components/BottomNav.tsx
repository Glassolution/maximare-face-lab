import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Sparkles, Plus } from "lucide-react";

const navItems = [
  { label: "Home", path: "/analysis", icon: Home },
  { label: "Progresso", path: "/progress", icon: TrendingUp },
  { label: "Dicas", path: "/recommendations", icon: Sparkles },
];

export default function BottomNav() {
  const location = useLocation();

  const left = navItems.slice(0, 2);
  const right = navItems.slice(2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-6">
        {left.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className="flex flex-col items-center gap-1">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
            </Link>
          );
        })}

        {/* Center + button */}
        <Link to="/analysis" className="flex flex-col items-center -mt-7">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 ring-4 ring-background">
            <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-semibold text-primary mt-1">Análise</span>
        </Link>

        {right.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className="flex flex-col items-center gap-1">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
