import { Link, useLocation } from "react-router-dom";
import { Home, Scan, TrendingUp, Sparkles, User } from "lucide-react";

const navItems = [
  { label: "Home", path: "/analysis", icon: Home },
  { label: "Análise", path: "/analysis", icon: Scan, isCenter: true },
  { label: "Progresso", path: "/progress", icon: TrendingUp },
  { label: "Dicas", path: "/recommendations", icon: Sparkles },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <Link key={item.path + "center"} to={item.path} className="flex flex-col items-center -mt-5">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium text-primary mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link key={item.path + item.label} to={item.path} className="flex flex-col items-center gap-1">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                isActive ? "bg-primary/15" : ""
              }`}>
                <Icon className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
