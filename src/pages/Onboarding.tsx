import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/posthog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Wind,
  Scissors,
  Droplets,
  BarChart3,
  Sparkles,
  Target,
  Zap,
  Crown,
  Star,
  Dumbbell,
  AlertTriangle,
  Lock,
  ScanFace,
  Eye,
  FrownIcon,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";

import genderMale from "@/assets/gender-male.jpg";
import genderFemale from "@/assets/gender-female.jpg";
import genderNonbinary from "@/assets/gender-nonbinary.jpg";

const TOTAL_STEPS = 8;

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: -60, transition: { duration: 0.3 } },
};

const GOALS = [
  { icon: BarChart3, title: "Aprender o básico", sub: null },
  { icon: Sparkles, title: "Melhorar estética facial", sub: null },
  { icon: Target, title: "Melhorar rosto e físico", sub: null },
  { icon: Crown, title: "Impulsionar meu look e confiança", sub: "Uma transformação completa" },
];

const GENDERS = [
  { id: "male", label: "Masculino", img: genderMale },
  { id: "female", label: "Feminino", img: genderFemale },
  { id: "nonbinary", label: "Não Binário", img: genderNonbinary },
];

/* ─── Step 1: Emotional Impact ─── */
function StepImpact({ onNext, onBack }: { onNext: (habits: number[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const habits = [
    { icon: ScanFace, title: "Assimetria\nFacial", color: "#4F6EF7" },
    { icon: Eye, title: "Olhar\nCansado", color: "#4F6EF7" },
    { icon: FrownIcon, title: "Pele com\nImperfeições", color: "#4F6EF7" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0D0D14 0%, #0D1A3D 100%)",
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}
    >
      {/* Header */}
      <header className="pt-8 px-6 pb-4 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-[#4F6EF7] font-extrabold text-[13px] tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> MAXIMARE AI
          </span>
          <button
            onClick={() => onNext(Array.from(selected))}
            className="text-white/50 text-[13px] font-medium hover:text-white/70 transition-colors"
          >
            Salvar e sair
          </button>
        </div>
        <div className="w-full h-[4px] bg-white/10 rounded-full overflow-hidden">
          <div className="w-2/3 h-full bg-[#4F6EF7] rounded-full" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-[32px] font-bold leading-[1.2] mb-2 text-white">
            O que está travando<br />
            <span className="text-[#4F6EF7]">seu potencial?</span>
          </h1>
          <p className="text-white/50 text-[13px]">
            Selecione tudo que se aplica a você
          </p>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#4F6EF7]" />
            <span className="text-[#4F6EF7] text-[12px] font-semibold">Selecione um ou mais</span>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-2 gap-4">
          {habits.slice(0, 2).map((h, i) => {
            const Icon = h.icon;
            const isSelected = selected.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleSelection(i)}
                className={`rounded-[20px] p-6 flex flex-col items-center text-center gap-4 transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? "bg-[#4F6EF7] selected-card-shadow"
                    : "bg-white"
                }`}
                style={{
                  boxShadow: isSelected ? "0 0 25px rgba(79, 110, 247, 0.4)" : "none",
                }}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full ${
                    isSelected ? "bg-white/20" : "bg-[#4F6EF7]/5"
                  }`}
                >
                  <Icon
                    className={`w-7 h-7 ${isSelected ? "text-white" : "text-[#4F6EF7]"}`}
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  className={`font-bold text-sm leading-tight whitespace-pre-line ${
                    isSelected ? "text-white" : "text-[#4F6EF7]"
                  }`}
                >
                  {h.title}
                </span>
              </button>
            );
          })}
          <div className="col-span-2 flex justify-center">
            {(() => {
              const Icon = habits[2].icon;
              const isSelected = selected.has(2);
              return (
                <button
                  onClick={() => toggleSelection(2)}
                  className={`w-1/2 rounded-[20px] p-6 flex flex-col items-center text-center gap-4 transition-all duration-200 active:scale-95 ${
                    isSelected ? "bg-[#4F6EF7]" : "bg-white"
                  }`}
                  style={{
                    boxShadow: isSelected ? "0 0 25px rgba(79, 110, 247, 0.4)" : "none",
                  }}
                >
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-full ${
                      isSelected ? "bg-white/20" : "bg-[#4F6EF7]/5"
                    }`}
                  >
                    <Icon
                      className={`w-7 h-7 ${isSelected ? "text-white" : "text-[#4F6EF7]"}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span
                    className={`font-bold text-sm leading-tight whitespace-pre-line ${
                      isSelected ? "text-white" : "text-[#4F6EF7]"
                    }`}
                  >
                    {habits[2].title}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 space-y-4">
        <p className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Suas respostas são usadas apenas para personalizar seu plano
        </p>
        <button
          onClick={() => onNext(Array.from(selected))}
          className="w-full py-5 rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(255, 255, 255, 0.15)",
          }}
        >
          <span className="text-[#4F6EF7] font-bold text-lg">
            Continuar com {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <ArrowRight className="w-5 h-5 text-[#4F6EF7]" />
        </button>
      </footer>

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

/* ─── Step 2: Age Picker ─── */
function StepAge({ onNext, onBack, initialAge }: { onNext: (age: number) => void; onBack: () => void; initialAge: number }) {
  const [selectedAge, setSelectedAge] = useState(initialAge);
  const ages = Array.from({ length: 83 }, (_, i) => i + 12); // Range 12-94
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const idx = ages.indexOf(selectedAge);
      scrollRef.current.scrollTop = idx * 72; // 72px item height
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const centerIdx = Math.round(scrollTop / 72);
    const clamped = Math.max(0, Math.min(ages.length - 1, centerIdx));
    if (ages[clamped] !== selectedAge) {
      setSelectedAge(ages[clamped]);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ backgroundColor: "#0D0D14", fontFamily: "Inter, sans-serif" }}
    >
      <div className="relative w-full max-w-[400px] h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="w-full px-6 pt-12 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#4F6EF7]" />
              <span className="text-[#4F6EF7] text-[11px] font-extrabold tracking-[0.2em]">MAXIMARE AI</span>
            </div>
            <button
              onClick={() => onNext(selectedAge)}
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              Salvar e sair
            </button>
          </div>
          <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-[#4F6EF7]"></div>
          </div>
        </header>

        {/* Title */}
        <div className="w-full px-6 pt-6 text-center shrink-0">
          <h1 className="text-[28px] font-bold leading-tight mb-2 text-white">
            Qual é sua <span className="text-[#4F6EF7]">idade</span>?
          </h1>
          <p className="text-[13px] text-white/50">
            Calibramos a análise para seu grupo etário
          </p>
        </div>

        {/* Age Picker */}
        <main className="flex-1 w-full relative flex flex-col items-center justify-center overflow-hidden">
          {/* Active lines */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <div
              className="w-20 h-[2px] bg-[#4F6EF7] absolute"
              style={{ marginBottom: "72px", left: "50%", transform: "translateX(-50%)" }}
            />
            <div
              className="w-20 h-[2px] bg-[#4F6EF7] absolute"
              style={{ marginTop: "72px", left: "50%", transform: "translateX(-50%)" }}
            />
          </div>

          {/* Scrollable ages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto w-full h-full snap-y snap-mandatory flex flex-col items-center relative z-0 no-scrollbar"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="h-[40%] shrink-0"></div>
            {ages.map((age) => {
              const isSelected = age === selectedAge;
              return (
                <div
                  key={age}
                  className="snap-center py-2 transition-all duration-200 cursor-pointer"
                  style={{
                    fontSize: isSelected ? "56px" : "30px",
                    fontWeight: 700,
                    color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.2)",
                    lineHeight: 1,
                  }}
                  onClick={() => {
                    setSelectedAge(age);
                    scrollRef.current?.scrollTo({ top: ages.indexOf(age) * 72, behavior: "smooth" });
                  }}
                >
                  {age}
                </div>
              );
            })}
            <div className="h-[40%] shrink-0"></div>
          </div>

          {/* Gradient mask */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to bottom,
                #0D0D14 0%,
                rgba(13, 13, 20, 0.7) 15%,
                rgba(13, 13, 20, 0) 40%,
                rgba(13, 13, 20, 0) 60%,
                rgba(13, 13, 20, 0.7) 85%,
                #0D0D14 100%)`,
            }}
          />
        </main>

        {/* Footer */}
        <footer className="w-full flex flex-col items-center justify-end pb-8 shrink-0">
          <button
            onClick={() => onNext(selectedAge)}
            className="w-[85%] py-[18px] rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{
              backgroundColor: "#ffffff",
              color: "#4F6EF7",
              fontWeight: 700,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span>Continuar</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="w-32 h-1 bg-white/20 rounded-full mt-8"></div>
        </footer>
      </div>
    </div>
  );
}

/* ─── Step 3: Goal Selection ─── */
function StepGoal({ onNext, initialGoal }: { onNext: (idx: number) => void; initialGoal: number }) {
  const [selected, setSelected] = useState<number | null>(initialGoal);

  const goals = [
    { icon: ScanFace, title: "Entender meu rosto", sub: "Descobrir meus pontos fortes" },
    { icon: Sparkles, title: "Melhorar minha aparência", sub: "Protocolo facial personalizado" },
    { icon: Dumbbell, title: "Transformação completa", sub: "Rosto, físico e presença" },
    { icon: Zap, title: "Maximizar minha atratividade", sub: "Nível elite de presença e confiança", popular: true },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0D0D14", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-6 pt-14 pb-4 flex flex-col gap-4 sticky top-0 z-50"
        style={{ backgroundColor: "rgba(13, 13, 20, 0.8)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNext(selected ?? 0)}
            className="flex items-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4F6EF7]" />
            <span className="text-[#4F6EF7] text-sm font-bold tracking-widest">MAXIMARE AI</span>
          </div>
          <button
            onClick={() => onNext(selected ?? 0)}
            className="text-white/50 text-[13px] font-medium hover:text-white transition-colors"
          >
            Salvar e sair
          </button>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="w-1/3 h-full bg-[#4F6EF7] rounded-full" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-6 pb-32">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight mb-8 text-white">
          Qual é sua <span className="text-[#4F6EF7]">meta principal?</span>
        </h1>

        <div className="space-y-4">
          {goals.map((g, i) => {
            const Icon = g.icon;
            const isSelected = selected === i;

            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full flex items-center p-4 rounded-2xl transition-all active:scale-[0.98] group relative overflow-hidden ${
                  isSelected
                    ? "bg-[#4F6EF7]/10 border-2 border-[#4F6EF7]"
                    : "bg-[#13131F] border border-white/5 hover:border-white/10"
                }`}
              >
                {/* Popular badge */}
                {g.popular && (
                  <div
                    className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg flex items-center gap-1"
                    style={{ backgroundColor: "rgba(79, 110, 247, 0.2)" }}
                  >
                    <Zap className="w-2.5 h-2.5 text-[#4F6EF7]" />
                    <span className="text-[#4F6EF7] text-[10px] font-bold">MAIS ESCOLHIDO</span>
                  </div>
                )}

                <div
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center mr-4 ${
                    isSelected ? "bg-[#4F6EF7]/20" : "bg-[#4F6EF7]/10"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isSelected ? "text-[#4F6EF7]" : "text-[#4F6EF7]"}`}
                    strokeWidth={1.5}
                  />
                </div>

                <div className="flex-1 text-left">
                  <p className="font-bold text-[15px] text-white">{g.title}</p>
                  <p className="text-[13px] text-white/50">{g.sub}</p>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-[#4F6EF7]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-[#4F6EF7] transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 p-6"
        style={{
          background: "linear-gradient(to top, #0D0D14, rgba(13, 13, 20, 0.9), transparent)",
        }}
      >
        <button
          onClick={() => selected !== null && onNext(selected)}
          disabled={selected === null}
          className="w-full h-[58px] rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 hover:opacity-90"
          style={{
            backgroundColor: "#ffffff",
            color: "#4F6EF7",
            boxShadow: "0 8px 32px rgba(79, 110, 247, 0.1)",
          }}
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Gender Selection ─── */
function StepGender({ onNext, initialGender }: { onNext: (id: string) => void; initialGender: string }) {
  const [selected, setSelected] = useState<string | null>(initialGender);

  return (
    <div className="flex flex-col flex-1 justify-between py-6 -mx-6 px-6 h-full">
      <div className="flex flex-col gap-4">
        <div className="text-left">
          <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">Escolha o Gênero</h1>
          <p className="text-muted-foreground text-sm mt-2">Escolha um deles para uma experiência melhor</p>
        </div>

        <div className="flex flex-col gap-3 mt-3">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className={`relative rounded-2xl overflow-hidden h-[120px] border transition-all bg-[#09090b] ${
                selected === g.id ? "border-primary ring-1 ring-primary" : "border-border/30"
              }`}
            >
              <img 
                src={g.img} 
                alt={g.label} 
                className="absolute right-0 top-0 h-full w-auto object-cover [mask-image:linear-gradient(to_right,transparent,black_40%)]" 
              />
              <span className="relative z-10 font-heading font-bold text-foreground text-2xl p-6 block text-left mt-8">
                {g.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="w-full h-14 bg-white text-primary font-bold rounded-full shadow-lg shadow-primary/20 text-base tracking-wide hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 mt-4"
      >
        <ArrowRight className="h-4 w-4" />
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 5: Authority / Modules ─── */
function StepAuthority({ onNext }: { onNext: () => void }) {
  const modules = [
    { icon: Star, name: "PSLMAX", desc: "Sistema de pontuação de atratividade", color: "text-primary" },
    { icon: Sparkles, name: "ASTRA", desc: "Análise de Cor e Pele", color: "text-primary" },
    { icon: Dumbbell, name: "GYMMAX", desc: "Projeção Física", color: "text-primary" },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-6 -mx-6 px-6 h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-primary">AI</span>
          </span>
        </div>

        <h1 className="font-heading text-2xl font-extrabold text-foreground leading-tight">
          Controle Total
          <br />
          da Atratividade
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
          Do seu Ângulo Goniaco à sua Estação de Cor,
          <br />
          nossa IA otimiza cada pixel da sua aparência.
        </p>

        <div className="flex flex-col gap-2 w-full mt-2">
          {modules.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-3 p-3 rounded-2xl border border-primary/30 bg-secondary/30"
            >
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-primary/20">
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div className="text-left">
                <span className="font-heading font-bold text-foreground">{m.name}</span>
                <p className="text-muted-foreground text-xs mt-0.5">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full h-14 bg-white text-primary font-bold rounded-full shadow-lg shadow-primary/20 text-base tracking-wide hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <ArrowRight className="h-4 w-4" />
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 6: Future Projection (Loading) ─── */
function StepProjection({ onNext, userData }: { onNext: () => void; userData: { age: number; goal: number; gender: string } }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 4000; // 4 seconds total
    const interval = 40; 
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const getStatusText = (p: number) => {
    if (p < 30) return "Analisando simetria facial...";
    if (p < 60) return "Calculando proporções áureas...";
    if (p < 90) return "Gerando projeção futura...";
    return "Finalizando análise...";
  };

  const goalLabel = GOALS[userData.goal]?.title || "N/A";
  const genderLabel = GENDERS.find(g => g.id === userData.gender)?.label || "N/A";

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6 relative">
      
      {/* Loading State */}
      <div className={`flex flex-col items-center justify-center w-full h-full absolute inset-0 px-6 transition-all duration-500 ${progress === 100 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="flex flex-col items-center gap-8 w-full max-w-xs">
          {/* Loading Circle/Animation Container */}
          <div className="relative flex items-center justify-center">
            {/* Background Ring */}
            <div className="w-48 h-48 rounded-full border-4 border-white/5" />
            
            {/* Progress Ring */}
            <svg className="absolute inset-0 w-48 h-48 -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="94"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-primary transition-all duration-200 ease-linear"
                strokeDasharray={590} // 2 * pi * 94
                strokeDashoffset={590 - (590 * progress) / 100}
                strokeLinecap="round"
              />
            </svg>

            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-6xl font-heading font-black text-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          <div className="space-y-2 h-16">
            <h2 className="text-xl font-heading font-bold text-foreground animate-pulse">
              Processando Dados
            </h2>
            <p className="text-muted-foreground text-sm">
              {getStatusText(progress)}
            </p>
          </div>
        </div>
      </div>

      {/* Result Summary State */}
      <div className={`flex flex-col items-center justify-between w-full h-full transition-all duration-500 delay-300 ${progress === 100 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
          <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mb-2 ring-4 ring-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-heading font-extrabold text-foreground">
              Análise Concluída
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mx-auto">
              Processamos seus dados e identificamos seu potencial estético único.
            </p>
          </div>

          <div className="w-full bg-secondary/30 rounded-2xl p-6 border border-white/5 space-y-4 text-left shadow-lg shadow-black/20">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-muted-foreground text-sm font-medium">Idade</span>
                <span className="font-heading font-bold text-foreground">{userData.age} anos</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-muted-foreground text-sm font-medium">Gênero</span>
                <span className="font-heading font-bold text-foreground">{genderLabel}</span>
              </div>
              <div className="flex justify-between items-start pt-1">
                <span className="text-muted-foreground text-sm font-medium shrink-0">Objetivo</span>
                <span className="font-heading font-bold text-foreground text-right pl-4">{goalLabel}</span>
              </div>
          </div>

        <div className="w-full flex justify-center mt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 text-primary bg-white/5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold tracking-wider uppercase">Algoritmo Maximare Ativo</span>
          </div>
        </div>
        </div>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20 mt-6"
      >
        Ver Resultados
      </Button>
      </div>
    </div>
  );
}

/* ─── Step 7: Brutal Truth ─── */
function StepBrutalTruth({ onNext, userData }: { onNext: () => void; userData: { age: number; goal: number; gender: string; habits: number[] } }) {
  const { title, sub, metricLabel, metricValue, chartData } = useMemo(() => {
    const habitsCount = userData.habits?.length || 0;
    const title = "Análise Personalizada";
    const sub = "Resultado baseado nas respostas do seu quiz.";
    const metricLabel = "Índice de Preparação";

    const goalBase = [30, 50, 70, 85][userData.goal] || 50;
    const ageAdj = userData.age < 18 ? 20 : userData.age <= 29 ? 60 : userData.age <= 39 ? 45 : 35;
    const habitsAdj = Math.min(30, habitsCount * 12);
    const genderAdj = 5;

    const metricValue = Math.min(99, Math.round((goalBase * 0.5) + (ageAdj * 0.3) + (habitsAdj * 0.2) + genderAdj));

    const chartData = [
      { label: "Objetivo", value: Math.round(goalBase) },
      { label: "Idade", value: Math.round(ageAdj) },
      { label: "Hábitos", value: Math.round(habitsAdj) },
    ];

    return { title, sub, metricLabel, metricValue, chartData };
  }, [userData.age, userData.gender, userData.goal, userData.habits]);

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6">
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-primary">AI</span>
          </span>
        </div>

        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          {sub}
        </p>

        <div className="w-full mt-4 text-left">
          <h3 className="font-heading font-bold text-foreground text-sm tracking-wider uppercase">
            {metricLabel}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Metric: Preparação</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-heading font-black text-foreground">{metricValue}%</span>
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="border border-primary/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase">Nível Crítico</span>
            </div>
          </div>

          <div className="w-full h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(224,76%,35%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(224,76%,35%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215, 15%, 60%)", fontSize: 12 }}
                />
                <YAxis hide domain={[0, 100]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(224,76%,35%)"
                  strokeWidth={3}
                  fill="url(#blueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full h-14 bg-white text-primary font-bold rounded-full shadow-lg shadow-primary/20 text-base tracking-wide hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <ArrowRight className="h-4 w-4" />
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 8: Final CTA ─── */
function StepFinalCTA({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6">
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center"
        >
          <Lock className="h-10 w-10 text-foreground" />
        </motion.div>

        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">
          Seu plano personalizado
          <br />
          está pronto
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          Desbloqueie sua análise completa com recomendações personalizadas de IA para maximizar seu potencial estético.
        </p>

        <div className="flex flex-col gap-2 text-left w-full max-w-xs">
          {["Análise facial completa com IA", "Recomendações personalizadas", "Acompanhamento de progresso", "Protocolo exclusivo de 90 dias"].map(
            (item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground text-sm">{item}</span>
              </div>
            )
          )}
        </div>
      </div>

      <Button
        onClick={onFinish}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20"
      >
        <Lock className="h-5 w-5" />
        Desbloquear Análise Completa
      </Button>
    </div>
  );
}

/* ─── Main Onboarding ─── */
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({ age: 20, goal: 0, gender: "male", habits: [] as number[] });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("maximare_quiz_accessed", "true");
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));

  const handleAgeNext = (age: number) => {
    setUserData((prev) => ({ ...prev, age }));
    next();
  };

  const handleGoalNext = (goalIdx: number) => {
    setUserData((prev) => ({ ...prev, goal: goalIdx }));
    next();
  };

  const handleGenderNext = (genderId: string) => {
    setUserData((prev) => ({ ...prev, gender: genderId }));
    next();
  };

  const back = () => {
    if (step === 0) {
      navigate("/");
    } else {
      setStep((s) => s - 1);
    }
  };
  const finish = () => {
    // PostHog: track onboarding completed
    trackEvent('anonymous', 'onboarding_completed', {
      age: userData.age,
      goal: GOALS[userData.goal]?.title || userData.goal,
      gender: userData.gender,
    });
    navigate("/login");
  };

  // Render StepAge in full screen mode without the default wrapper
  if (step === 0) {
    return <StepImpact onNext={(habits) => { setUserData((prev) => ({ ...prev, habits })); next(); }} onBack={back} />;
  }
  if (step === 1) {
    return <StepAge onNext={handleAgeNext} onBack={back} initialAge={userData.age} />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(0,0%,8%)] from-0% via-[hsl(0,0%,8%)] via-40% to-[hsl(224,76%,35%)] pointer-events-none" />
      <div className="relative z-10 flex flex-col flex-1 min-h-[100dvh] max-w-md mx-auto w-full">
        <div className="px-6 pt-6 pb-0 flex items-center justify-between">
          <button onClick={back} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-secondary"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className={`text-sm font-bold transition-colors ${
              step === TOTAL_STEPS - 1 ? "opacity-0 pointer-events-none" : "text-primary hover:text-primary/80"
            }`}
          >
            Pular
          </button>
        </div>

        <div className="flex-1 flex flex-col p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col flex-1"
            >
              {/* StepImpact is handled by the conditional return above */}
              {/* StepAge is handled by the conditional return above */}
              {step === 2 && <StepGoal onNext={handleGoalNext} initialGoal={userData.goal} />}
              {step === 3 && <StepGender onNext={handleGenderNext} initialGender={userData.gender} />}
              {step === 4 && <StepAuthority onNext={next} />}
              {step === 5 && <StepProjection onNext={next} userData={userData} />}
              {step === 6 && <StepBrutalTruth onNext={next} userData={userData} />}
              {step === 7 && <StepFinalCTA onFinish={finish} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
