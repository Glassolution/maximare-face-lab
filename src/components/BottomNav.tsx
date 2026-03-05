import { Link, useLocation } from "react-router-dom";
import { Home, Crown, Trophy, User, Camera, ScanFace, BarChart3, Sparkles } from "lucide-react";
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
    <Link to={to} className="flex flex-col items-center gap-1 relative flex-1">
      <motion.div
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Icon
          className={`w-[22px] h-[22px] transition-colors duration-200 ${
            active ? "text-white" : "text-white/40"
          }`}
          strokeWidth={1.5}
        />
      </motion.div>
      <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? "text-white" : "text-white/40"}`}>
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute -bottom-1 w-1 h-1 bg-[#4F6EF7] rounded-full"
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      )}
    </Link>
  );

  return (
    <nav className="fixed bottom-4 left-5 right-5 z-50 pointer-events-none">
      <div
        className="pointer-events-auto w-full rounded-[30px] px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <NavItem to="/analysis" icon={Home} label="Início" active={isActive("/analysis")} />
        <NavItem to="/premium" icon={Crown} label="Pro" active={isActive("/premium")} />

        {/* Center Camera Button */}
        <Drawer>
          <DrawerTrigger asChild>
            <motion.button
              className="relative flex items-center justify-center -mt-8 mx-2"
              aria-label="Nova Análise"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="w-[52px] h-[52px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #4F6EF7 0%, #7B5EF7 100%)",
                  borderRadius: "16px",
                  boxShadow: "0 4px 20px rgba(79, 110, 247, 0.5)",
                }}
              >
                <Camera className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
            </motion.button>
          </DrawerTrigger>
          <DrawerContent
            className="border-white/5"
            style={{
              background: "rgba(13, 13, 20, 0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-center text-white text-xl font-semibold">O que deseja fazer?</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 pb-8 space-y-3">
                <Link to="/analysis?start=true">
                  <Button
                    className="w-full h-14 text-white rounded-xl flex items-center justify-start px-6 gap-4 mb-3 border-0"
                    style={{
                      background: "linear-gradient(135deg, #4F6EF7 0%, #7B5EF7 100%)",
                    }}
                  >
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
                    className="w-full h-14 rounded-xl flex items-center justify-start px-6 gap-4 mb-3 border-white/10 hover:bg-white/5 text-white"
                    style={{ background: "rgba(255, 255, 255, 0.03)" }}
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: "rgba(79, 110, 247, 0.15)" }}
                    >
                      <BarChart3 className="w-5 h-5" style={{ color: "#4F6EF7" }} />
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
                    className="w-full h-14 rounded-xl flex items-center justify-start px-6 gap-4 border-white/10 hover:bg-white/5 text-white"
                    style={{ background: "rgba(255, 255, 255, 0.03)" }}
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: "rgba(79, 110, 247, 0.15)" }}
                    >
                      <Sparkles className="w-5 h-5" style={{ color: "#4F6EF7" }} />
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

        <NavItem to="/friends" icon={Trophy} label="Ranking" active={isActive("/friends")} />
        <NavItem to="/profile" icon={User} label="Perfil" active={isActive("/profile")} />
      </div>
    </nav>
  );
}
