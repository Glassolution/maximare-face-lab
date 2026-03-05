import { Link, useLocation } from "react-router-dom";
import { Home, Crown, BarChart3, User, Plus, ScanFace, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export default function BottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({
    to,
    icon: Icon,
    label,
    active,
  }: {
    to: string;
    icon: any;
    label: string;
    active: boolean;
  }) => (
    <Link to={to} className="flex flex-col items-center gap-1 w-16 relative">
      <Icon
        className={`w-6 h-6 ${
          active ? "text-[#4F6EF7]" : "text-white/35"
        } transition-colors`}
        strokeWidth={1.5}
      />
      <span className={`text-[10px] font-medium ${active ? "text-[#4F6EF7]" : "text-white/35"}`}>
        {label}
      </span>
    </Link>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[430px]">
        {/* Glass background */}
        <div className="backdrop-blur-xl bg-[#0D0D14]/90 border-t border-white/5 px-4 pb-6 pt-3">
          <div className="flex items-end justify-between px-2">
            <NavItem to="/analysis" icon={Home} label="Início" active={isActive("/analysis")} />
            <NavItem to="/premium" icon={Crown} label="Pro" active={isActive("/premium")} />

            {/* Center Add Button */}
            <Drawer>
              <DrawerTrigger asChild>
                <div className="relative pb-1">
                  <motion.button
                    className="w-14 h-14 bg-[#4F6EF7] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#4F6EF7]/30 active:scale-90 transition-transform mb-1"
                    aria-label="Adicionar"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Plus className="w-7 h-7" strokeWidth={2.5} />
                  </motion.button>
                </div>
              </DrawerTrigger>
              <DrawerContent className="bg-[#0D0D14] border-white/5">
                <div className="mx-auto w-full max-w-sm">
                  <DrawerHeader>
                    <DrawerTitle className="text-center text-white text-xl">O que deseja fazer?</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 pb-8 space-y-3">
                    <Link to="/analysis?start=true">
                      <Button className="w-full h-14 bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white rounded-xl flex items-center justify-start px-6 gap-4 mb-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <ScanFace className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="block font-semibold">Nova Análise</span>
                          <span className="text-xs text-white/70 font-normal">Capturar métricas faciais</span>
                        </div>
                      </Button>
                    </Link>

                    <Link to="/progress">
                      <Button
                        variant="outline"
                        className="w-full h-14 bg-[#13131F] border-white/5 hover:bg-[#13131F]/80 text-white rounded-xl flex items-center justify-start px-6 gap-4 mb-3"
                      >
                        <div className="bg-[#4F6EF7]/10 p-2 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-[#4F6EF7]" />
                        </div>
                        <div className="text-left">
                          <span className="block font-semibold">Meu Progresso</span>
                          <span className="text-xs text-white/50 font-normal">Acompanhe sua evolução</span>
                        </div>
                      </Button>
                    </Link>

                    <Link to="/trends">
                      <Button
                        variant="outline"
                        className="w-full h-14 bg-[#13131F] border-white/5 hover:bg-[#13131F]/80 text-white rounded-xl flex items-center justify-start px-6 gap-4"
                      >
                        <div className="bg-[#4F6EF7]/10 p-2 rounded-lg">
                          <Sparkles className="w-5 h-5 text-[#4F6EF7]" />
                        </div>
                        <div className="text-left">
                          <span className="block font-semibold">Plano Personalizado</span>
                          <span className="text-xs text-white/50 font-normal">Recomendações exclusivas</span>
                        </div>
                      </Button>
                    </Link>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            <NavItem to="/friends" icon={BarChart3} label="Ranking" active={isActive("/friends")} />
            <NavItem to="/profile" icon={User} label="Perfil" active={isActive("/profile")} />
          </div>
        </div>
      </div>
    </nav>
  );
}
