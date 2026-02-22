import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, Users, User, Sparkles, Swords } from "lucide-react";
import navIcon from "@/assets/nav.png";
import { motion } from "framer-motion";

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-auto mx-auto">
        <div className="relative">
          <div className="h-16 rounded-full bg-graphite flex items-center px-5 shadow-[0_10px_40px_rgba(0,0,0,0.7)] border border-white/5">
            <div className="flex items-center gap-4 md:gap-5">
              {/* Home / Dashboard */}
              <Link
                to="/analysis"
                className="flex items-center justify-center"
              >
                <Home
                  className={`h-6 w-6 md:h-7 md:w-7 transition-colors ${
                    isActive("/analysis") ? "text-white" : "text-zinc-400"
                  }`}
                />
              </Link>

              {/* Duelos (Moved to Left) */}
              <Link to="/battles" className="flex items-center justify-center">
                <Swords
                  className={`h-6 w-6 md:h-7 md:w-7 transition-colors ${
                    isActive("/battles") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>

              {/* Progresso / Analytics */}
              <Link
                to="/progress"
                className="flex items-center justify-center"
              >
                <LineChart
                  className={`h-6 w-6 md:h-7 md:w-7 transition-colors ${
                    isActive("/progress") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>

              <Link
                to="/analysis?start=true"
                className="relative flex items-center justify-center -mt-8 mx-0"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="h-20 w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center overflow-hidden shadow-xl"
                >
                  <img
                    src={navIcon}
                    alt="Iniciar análise"
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              </Link>

              {/* Trends */}
              <Link to="/trends" className="flex items-center justify-center">
                <Sparkles
                  className={`h-6 w-6 md:h-7 md:w-7 transition-colors ${
                    isActive("/trends") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>

              {/* Amigos */}
              <Link to="/friends" className="flex items-center justify-center">
                <Users
                  className={`h-6 w-6 md:h-7 md:w-7 transition-colors ${
                    isActive("/friends") ? "text-primary" : "text-zinc-400"
                  }`}
                />
              </Link>

              {/* Conta */}
              <Link to="/profile" className="flex items-center justify-center">
                <User
                  className={`h-6 w-6 md:h-7 md:w-7 transition-colors ${
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
