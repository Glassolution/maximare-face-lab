import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import faceScanHero from "@/assets/face-scan-hero.jpg";

// Biometric dot component
const BiometricDot = ({ style, delay }: { style: React.CSSProperties; delay: number }) => (
  <motion.div
    className="absolute w-1 h-1 bg-[#4F6EF7] rounded-full"
    style={{
      ...style,
      boxShadow: "0 0 10px #4F6EF7",
    }}
    animate={{
      opacity: [0.4, 1, 0.4],
      scale: [1, 1.5, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  />
);

// Scanning line animation
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#4F6EF7] to-transparent opacity-50"
    style={{ filter: "blur(2px)" }}
    animate={{
      top: ["0%", "100%", "0%"],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: "linear",
    }}
  />
);

export default function Landing() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-8 py-12 overflow-hidden max-w-md mx-auto relative"
      style={{
        background: "linear-gradient(180deg, #0D0D14 0%, #0D1A3D 100%)",
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}
    >
      {/* Top Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10"
      >
        <div
          className="px-4 py-2 rounded-full flex items-center gap-2 border"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(79, 110, 247, 0.4)",
          }}
        >
          <span className="text-[12px] font-medium text-white/70 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4F6EF7]" /> Tecnologia de IA avançada
          </span>
        </div>
      </motion.div>

      {/* Hero Image with Scan Ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex-1 flex items-center justify-center w-full my-8"
      >
        <div className="relative w-64 h-64">
          {/* Rotating gradient ring */}
          <motion.div
            className="absolute inset-[-4px] rounded-full"
            style={{
              padding: "4px",
              background: "conic-gradient(from 0deg, #4F6EF7, #2D4FD6, #4F6EF7)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundColor: "rgba(79, 110, 247, 0.2)",
              filter: "blur(24px)",
            }}
          />

          {/* Image container */}
          <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-900">
            <img
              src={faceScanHero}
              alt="Análise facial com IA"
              className="w-full h-full object-cover"
            />

            {/* Biometric dots */}
            <BiometricDot style={{ top: "40%", left: "30%" }} delay={0} />
            <BiometricDot style={{ top: "40%", left: "70%" }} delay={0.3} />
            <BiometricDot style={{ top: "52%", left: "50%" }} delay={0.6} />
            <BiometricDot style={{ top: "68%", left: "38%" }} delay={0.9} />
            <BiometricDot style={{ top: "68%", left: "62%" }} delay={1.2} />
            <BiometricDot style={{ top: "32%", left: "50%" }} delay={1.5} />

            {/* Scanning line */}
            <ScanLine />
          </div>
        </div>
      </motion.div>

      {/* Bottom Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="w-full space-y-8 text-center z-10"
      >
        {/* Title and subtitle */}
        <div className="space-y-3">
          <h1
            className="text-[32px] font-extrabold leading-tight tracking-tight text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Descubra seu <span className="text-[#4F6EF7]">potencial</span>
          </h1>
          <p className="text-[16px] text-white/60 font-medium">
            Análise facial com IA em 30 segundos
          </p>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center items-center gap-2">
          <div className="w-8 h-1.5 rounded-full bg-[#4F6EF7]" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* CTA Button */}
        <Link to="/onboarding" className="block">
          <motion.button
            className="w-full py-5 rounded-full shadow-2xl flex items-center justify-center gap-2 group"
            style={{ backgroundColor: "#ffffff" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <span
              className="font-bold text-lg"
              style={{ color: "#4F6EF7" }}
            >
              Começar análise grátis
            </span>
            <ArrowRight
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              style={{ color: "#4F6EF7" }}
            />
          </motion.button>
        </Link>
      </motion.div>

      {/* Background blur effects */}
      <div
        className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{
          backgroundColor: "rgba(79, 110, 247, 0.1)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
        style={{
          backgroundColor: "rgba(45, 79, 214, 0.1)",
          filter: "blur(100px)",
        }}
      />
    </div>
  );
}
