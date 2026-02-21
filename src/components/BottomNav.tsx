import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, Users, User } from "lucide-react";
import navIcon from "@/assets/nav.png";

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-auto mx-auto">
        <div className="relative">
          <div className="h-14 rounded-full bg-graphite flex items-center px-6 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-6">
              {/* Home / Dashboard */}
              <Link
                to="/analysis"
                className="flex items-center justify-center"
              >
                <Home
                  className={`h-6 w-6 ${
                    isActive("/analysis") ? "text-white" : "text-zinc-400"
                  }`}
                />
              </Link>

              {/* Progresso / Analytics */}
              <Link
                to="/progress"
                className="flex items-center justify-center"
              >
                <LineChart
                  className={`h-6 w-6 ${
                    isActive("/progress") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>

              <Link
                to="/analysis?start=true"
                className="relative flex items-center justify-center -mt-6"
              >
                <div className="h-16 w-16 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                  <img
                    src={navIcon}
                    alt="Iniciar análise"
                    className="h-full w-full object-cover scale-110"
                  />
                </div>
              </Link>

              {/* Comunidade / Grupo */}
              <Link to="/trends" className="flex items-center justify-center">
                <Users
                  className={`h-6 w-6 ${
                    isActive("/trends") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>

              {/* Conta */}
              <Link to="/profile" className="flex items-center justify-center">
                <User
                  className={`h-6 w-6 ${
                    isActive("/profile") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
