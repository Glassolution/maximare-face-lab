import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, Users, User, Sparkles, Swords, Plus, ScanFace } from "lucide-react";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { usePendingBattles } from "@/hooks/usePendingBattles"; // New Hook

export default function BottomNav() {
  const location = useLocation();
  const pendingBattlesCount = usePendingBattles(); // Get realtime count

  const isActive = (path: string) => location.pathname === path;

  // Updated NavItem to accept badge count
  const NavItem = ({ to, icon: Icon, active, badge }: { to: string; icon: any; active: boolean; badge?: number }) => (
    <Link to={to} className="flex items-center justify-center relative">
      <div className={`flex items-center justify-center p-2.5 rounded-full transition-all duration-300 ${active ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "bg-transparent"}`}>
        <Icon
          className={`h-5 w-5 md:h-6 md:w-6 transition-colors ${
            active ? "text-white" : "text-zinc-500"
          } stroke-[1.5px]`}
        />
      </div>
      {/* Badge Indicator */}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full animate-pulse shadow-sm border border-[#0a0a0a]">
            {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-auto mx-auto">
        <div className="relative">
          <div className="h-16 rounded-full bg-[#0a0a0a] flex items-center px-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-5">
              {/* Home / Dashboard */}
              <NavItem to="/analysis" icon={Home} active={isActive("/analysis")} />

              {/* Duelos (With Badge) */}
              <NavItem to="/battles" icon={Swords} active={isActive("/battles")} badge={pendingBattlesCount} />

              {/* Central Action Button */}
              <Drawer>
                <DrawerTrigger asChild>
                  <div className="relative flex items-center justify-center -mt-8 mx-1 group cursor-pointer">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                        {/* Hexagon Shape */}
                        <div 
                            className="h-14 w-14 bg-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] group-hover:bg-blue-500 transition-colors"
                            style={{ 
                                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" 
                            }}
                        >
                            <Plus className="text-white w-7 h-7" strokeWidth={3} />
                        </div>
                    </motion.div>
                  </div>
                </DrawerTrigger>
                <DrawerContent className="bg-[#0a0a0a] border-zinc-800">
                  <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                      <DrawerTitle className="text-center text-white text-xl">O que deseja fazer?</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-8 space-y-3">
                      <Link to="/analysis?start=true">
                        <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-start px-6 gap-4 mb-3">
                          <div className="bg-white/20 p-2 rounded-lg">
                            <ScanFace className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <span className="block font-semibold">Nova Análise</span>
                            <span className="text-xs text-blue-100 font-normal">Capturar métricas faciais</span>
                          </div>
                        </Button>
                      </Link>

                      <Link to="/progress">
                        <Button variant="outline" className="w-full h-14 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-start px-6 gap-4 mb-3">
                          <div className="bg-zinc-800 p-2 rounded-lg">
                            <LineChart className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="text-left">
                            <span className="block font-semibold">Meu Progresso</span>
                            <span className="text-xs text-zinc-400 font-normal">Acompanhe sua evolução</span>
                          </div>
                        </Button>
                      </Link>

                      <Link to="/trends">
                        <Button variant="outline" className="w-full h-14 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-start px-6 gap-4">
                          <div className="bg-zinc-800 p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="text-left">
                            <span className="block font-semibold">Plano Personalizado</span>
                            <span className="text-xs text-zinc-400 font-normal">Recomendações exclusivas</span>
                          </div>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>

              {/* Amigos */}
              <NavItem to="/friends" icon={Users} active={isActive("/friends")} />

              {/* Conta */}
              <NavItem to="/profile" icon={User} active={isActive("/profile")} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
