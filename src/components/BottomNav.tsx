import { Link, useLocation } from "react-router-dom";
import { Home, BarChart2, Users, User, Sparkles, Plus, ScanFace } from "lucide-react";
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
    <Link to={to} className="flex flex-col items-center justify-center w-14 relative">
      <Icon
        className={`w-[26px] h-[26px] ${
          active ? "text-[#0080ff] drop-shadow-[0_0_8px_rgba(0,128,255,0.8)]" : "text-gray-500"
        } transition-colors`}
        strokeWidth={1.5}
      />
      <span className={`text-[9px] mt-1 font-bold uppercase tracking-wider ${active ? "text-[#0080ff]" : "text-gray-500"}`}>
        {label}
      </span>
      {active ? <div className="w-1 h-1 bg-[#0080ff] rounded-full mt-0.5" /> : null}
    </Link>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-4">
      <div className="pointer-events-auto w-full max-w-md relative h-24">
        {/* Glass pill */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 h-20 w-[92%] bg-[#121212]/95 border border-white/5 rounded-[40px] backdrop-blur-xl" />

        {/* Content centered */}
        <div className="absolute inset-x-0 bottom-6 h-20 flex items-center justify-between px-6">
          <NavItem to="/analysis" icon={Home} label="Home" active={isActive("/analysis")} />
          <NavItem to="/trends" icon={BarChart2} label="Plano" active={isActive("/trends")} />

          <Drawer>
            <DrawerTrigger asChild>
              <div className="relative w-16 h-full flex justify-center items-center cursor-pointer">
                <motion.button
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 origin-center bg-[#0080ff] text-white w-14 h-14 flex items-center justify-center rounded-full shadow-[0_0_30px_rgba(0,128,255,0.8)] ring-8 ring-[#0080ff]/25 z-20"
                  aria-label="Action"
                >
                  <Plus className="w-8 h-8" strokeWidth={3} />
                </motion.button>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 w-24 h-24 rounded-full bg-[#0080ff]/25 blur-2xl -z-10" />
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
                    <Button
                      variant="outline"
                      className="w-full h-14 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-start px-6 gap-4 mb-3"
                    >
                      <div className="bg-zinc-800 p-2 rounded-lg">
                        <BarChart2 className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <span className="block font-semibold">Meu Progresso</span>
                        <span className="text-xs text-zinc-400 font-normal">Acompanhe sua evolução</span>
                      </div>
                    </Button>
                  </Link>

                  <Link to="/trends">
                    <Button
                      variant="outline"
                      className="w-full h-14 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-start px-6 gap-4"
                    >
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

          <NavItem to="/friends" icon={Users} label="Social" active={isActive("/friends")} />
          <NavItem to="/profile" icon={User} label="Profile" active={isActive("/profile")} />
        </div>
      </div>
    </nav>
  );
}
