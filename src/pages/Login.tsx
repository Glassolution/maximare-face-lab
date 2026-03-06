import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Lock } from "lucide-react";
import loginHero from "@/assets/login-hero.jpg";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (location.state && (location.state as any).mode) {
      setMode((location.state as any).mode);
    }
  }, [location]);

  // Handle device motion for mobile tilt effect
  useEffect(() => {
    let animationFrame: number;
    let currentTilt = { x: 0, y: 0 };
    let targetTilt = { x: 0, y: 0 };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.accelerationIncludingGravity) return;

      const { accelerationIncludingGravity } = event;

      // Invert for natural feel - tilt device left, card tilts right
      targetTilt.x = -((accelerationIncludingGravity.x || 0) * 1.5);
      targetTilt.y = (accelerationIncludingGravity.y || 0) * 1.5;

      // Clamp values
      targetTilt.x = Math.max(-15, Math.min(15, targetTilt.x));
      targetTilt.y = Math.max(-15, Math.min(15, targetTilt.y));
    };

    // Check if device supports motion
    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleMotion);
    }

    // Smooth animation loop
    const animate = () => {
      // Lerp towards target
      currentTilt.x += (targetTilt.x - currentTilt.x) * 0.1;
      currentTilt.y += (targetTilt.y - currentTilt.y) * 0.1;

      setTilt({ x: currentTilt.x, y: currentTilt.y });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, []);

  // Mouse move fallback for desktop
  useEffect(() => {
    let currentTilt = { x: 0, y: 0 };
    let targetTilt = { x: 0, y: 0 };
    let animationFrame: number;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      targetTilt.x = ((e.clientX - centerX) / centerX) * 8;
      targetTilt.y = ((e.clientY - centerY) / centerY) * 8;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      currentTilt.x += (targetTilt.x - currentTilt.x) * 0.08;
      currentTilt.y += (targetTilt.y - currentTilt.y) * 0.08;

      // Only update if not using device motion
      if (!window.DeviceMotionEvent) {
        setTilt({ x: currentTilt.x, y: currentTilt.y });
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Reset tilt when user leaves the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTilt({ x: 0, y: 0 });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      navigate("/analysis", { replace: true, state: { showPaywallOnEntry: true } });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError(String((err as { message: string }).message));
      } else {
        setError("Erro ao autenticar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden"
      style={{ backgroundColor: "#0D0D14" }}
    >
      {/* Top Section - Glass Card - Extended to cover gap */}
      <div
        className="relative px-6 pt-12 pb-16"
        style={{
          background: "linear-gradient(180deg, #0D0D14 0%, #0D1A3D 40%, #0D1A3D 70%, #0D0D14 100%)",
          zIndex: 10,
        }}
      >
        {/* Background card (decorative) */}
        <div
          className="absolute w-full max-w-xs aspect-[1.6/1] rounded-2xl transform -rotate-6 scale-[0.92] opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(79, 110, 247, 0.4) 0%, rgba(45, 79, 214, 0.5) 100%)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            left: "50%",
            transform: "translateX(-50%) rotate(-6deg) scale(0.92)",
          }}
        />

        {/* Main glass card with tilt effect */}
        <div
          ref={cardRef}
          className="w-full max-w-xs mx-auto aspect-[1.6/1] rounded-2xl overflow-hidden cursor-pointer z-10 relative"
          style={{
            background: "linear-gradient(135deg, rgba(79, 110, 247, 0.8) 0%, rgba(45, 79, 214, 0.9) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 20px 60px rgba(79, 110, 247, 0.4)",
            transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src={loginHero}
              alt="Análise Facial"
              className="w-full h-full object-cover opacity-60"
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, rgba(79, 110, 247, 0.3) 0%, rgba(45, 79, 214, 0.6) 50%, rgba(13, 13, 20, 0.8) 100%)",
              }}
            />
          </div>

          {/* Facial scan overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-[#4F6EF7]/60 rounded-tl" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-[#4F6EF7]/60 rounded-tr" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-[#4F6EF7]/60 rounded-bl" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-[#4F6EF7]/60 rounded-br" />

            {/* Biometric dots */}
            <div className="absolute w-1.5 h-1.5 bg-[#4F6EF7] rounded-full top-[35%] left-[30%]" style={{ boxShadow: "0 0 6px #4F6EF7" }} />
            <div className="absolute w-1.5 h-1.5 bg-[#4F6EF7] rounded-full top-[35%] right-[30%]" style={{ boxShadow: "0 0 6px #4F6EF7" }} />
            <div className="absolute w-1.5 h-1.5 bg-[#4F6EF7] rounded-full top-[50%] left-[50%] -translate-x-1/2" style={{ boxShadow: "0 0 6px #4F6EF7" }} />
            <div className="absolute w-1.5 h-1.5 bg-[#4F6EF7] rounded-full top-[65%] left-[35%]" style={{ boxShadow: "0 0 6px #4F6EF7" }} />
            <div className="absolute w-1.5 h-1.5 bg-[#4F6EF7] rounded-full top-[65%] right-[35%]" style={{ boxShadow: "0 0 6px #4F6EF7" }} />
          </div>

          {/* Content */}
          <div className="relative z-10 p-5 h-full flex flex-col justify-between">
            <div className="flex justify-end items-start">
              <span className="text-white/80 text-[10px] font-bold tracking-[0.2em] uppercase bg-black/20 px-2 py-1 rounded">MAXIMARE AI</span>
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium mb-1">Análise Facial</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-extrabold text-white tracking-tight">80.0</h2>
                <span className="text-white/80 text-sm font-semibold">Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full -z-10"
          style={{
            background: "rgba(79, 110, 247, 0.2)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Bottom Section - Login Form - Overlaps the card */}
      <div
        className="relative flex-1 rounded-t-[32px] flex flex-col px-8 pt-16 pb-8 -mt-2 z-20"
        style={{
          backgroundColor: "#0D0D14",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="mb-8 mt-4">
          <h1 className="text-[28px] font-bold text-white leading-tight">Bem-vindo!</h1>
          <p className="text-sm text-white/50 mt-1">Sua jornada começa aqui</p>
        </div>

        <form className="flex flex-col flex-grow" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <div
                  className="rounded-[12px] flex items-center px-4 py-3.5 group transition-all duration-300 focus-within:border-[#4F6EF7]/50"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <User className="text-white/40 w-[18px] h-[18px] mr-3 group-focus-within:text-[#4F6EF7] transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nome"
                    className="bg-transparent border-none p-0 w-full focus:ring-0 focus:outline-none text-white placeholder:text-white/40 text-[15px] h-5"
                    style={{ WebkitAppearance: "none", appearance: "none" }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div
                className="rounded-[12px] flex items-center px-4 py-3.5 group transition-all duration-300 focus-within:border-[#4F6EF7]/50"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Mail className="text-white/40 w-[18px] h-[18px] mr-3 group-focus-within:text-[#4F6EF7] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="E-mail"
                  className="bg-transparent border-none p-0 w-full focus:ring-0 focus:outline-none text-white placeholder:text-white/40 text-[15px] h-5"
                  style={{ WebkitAppearance: "none", appearance: "none" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div
                className="rounded-[12px] flex items-center px-4 py-3.5 group transition-all duration-300 focus-within:border-[#4F6EF7]/50"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Lock className="text-white/40 w-[18px] h-[18px] mr-3 group-focus-within:text-[#4F6EF7] transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Senha"
                  className="bg-transparent border-none p-0 w-full focus:ring-0 focus:outline-none text-white placeholder:text-white/40 text-[15px] h-5"
                  style={{
                    WebkitAppearance: "none",
                    appearance: "none",
                    backgroundColor: "transparent",
                  }}
                />
              </div>
              <div className="flex justify-end">
                <a
                  className="text-xs font-medium text-[#4F6EF7] hover:text-[#2D4FD6] transition-colors cursor-pointer"
                  style={{ color: "#4F6EF7" }}
                >
                  Esqueceu a senha?
                </a>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-2">{error}</p>
          )}

          <div className="mt-auto space-y-4 pt-8 text-center">
            <button
              type="submit"
              className="w-full text-white font-semibold py-4 rounded-[14px] transition-all duration-300 active:scale-[0.98]"
              style={{
                backgroundColor: "#4F6EF7",
                boxShadow: "0 4px 20px rgba(79, 110, 247, 0.4)",
              }}
              disabled={loading}
            >
              {loading ? "Carregando..." : mode === "signup" ? "Criar conta" : "Entrar"}
            </button>

            <button
              type="button"
              className="py-2 text-white/70 text-[15px] font-medium hover:text-white transition-colors underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
            </button>
          </div>
        </form>

        <div className="h-6" />
      </div>

      {/* Fixed background */}
      <div
        className="fixed top-0 left-0 w-full h-full -z-20"
        style={{ backgroundColor: "#0D0D14" }}
      />
    </div>
  );
}
