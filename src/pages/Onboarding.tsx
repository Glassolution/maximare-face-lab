import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
function StepImpact({ onNext }: { onNext: () => void }) {
  const habits = [
    { icon: Wind, title: "Respiração pela Boca", sub: "(Queixo Fraco)" },
    { icon: Scissors, title: "Penteado Errado", sub: "(Formato de Cabeça de Ovo)" },
    { icon: Droplets, title: "Inchaço", sub: "(Rosto com Alto Sódio)" },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-primary">AI</span>
          </span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
          Você está se
          <br />
          Segurando
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          A maioria das falhas são hábitos.
          <br />
          E hábitos podem ser corrigidos.
        </p>

        <div className="grid grid-cols-2 gap-6 mt-4">
          {habits.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={h.title}
                className={`flex flex-col items-center gap-2 ${i === 2 ? "col-span-2" : ""}`}
              >
                <div className="relative h-20 w-20 rounded-full border-2 border-primary flex items-center justify-center">
                  <Icon className="h-8 w-8 text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-[2px] w-16 bg-primary rotate-45 rounded-full" />
                    <div className="absolute h-[2px] w-16 bg-primary -rotate-45 rounded-full" />
                  </div>
                </div>
                <span className="font-heading font-bold text-foreground text-xs">{h.title}</span>
                <span className="text-muted-foreground text-[10px]">{h.sub}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        onClick={() => onNext(selectedAge)}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 2: Age Picker ─── */
function StepAge({ onNext, initialAge }: { onNext: (age: number) => void; initialAge: number }) {
  const [selectedAge, setSelectedAge] = useState(initialAge);
  const ages = Array.from({ length: 50 }, (_, i) => i + 12);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const itemH = 56;
      const idx = ages.indexOf(selectedAge);
      // Center the selected item: scrollTop = index * itemHeight
      scrollRef.current.scrollTop = idx * itemH;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const itemH = 56;
    const scrollTop = scrollRef.current.scrollTop;
    // Calculate index based on scroll position
    const centerIdx = Math.round(scrollTop / itemH);
    const clamped = Math.max(0, Math.min(ages.length - 1, centerIdx));
    
    // Only update if changed to avoid unnecessary re-renders
    if (ages[clamped] !== selectedAge) {
      setSelectedAge(ages[clamped]);
    }
  }, [ages, selectedAge]);

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6 rounded-none min-h-0">
      <div className="flex flex-col items-center gap-4 w-full">
        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">
          Qual é sua
          <br />
          idade?
        </h1>
        <p className="text-muted-foreground text-sm">Selecione sua idade para melhorar sua experiência!</p>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative h-[336px] w-full overflow-y-auto scrollbar-hide snap-y snap-mandatory mt-4 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
          style={{ scrollSnapType: "y mandatory" }}
        >
          <div className="py-[140px]">
            {ages.map((age) => {
              const isSelected = age === selectedAge;
              const diff = Math.abs(age - selectedAge);
              return (
                <div
                  key={age}
                  className="h-14 flex items-center justify-center snap-center cursor-pointer"
                  onClick={() => {
                    setSelectedAge(age);
                    if (scrollRef.current) {
                      const idx = ages.indexOf(age);
                      scrollRef.current.scrollTo({ top: idx * 56, behavior: 'smooth' });
                    }
                  }}
                >
                  <span
                    className={`font-heading font-extrabold transition-all duration-150 ${
                      isSelected
                        ? "text-5xl text-white scale-110"
                        : diff === 1
                        ? "text-3xl text-white/50"
                        : diff === 2
                        ? "text-xl text-white/20"
                        : "text-lg text-white/5 blur-[1px]"
                    }`}
                  >
                    {age}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Selection highlight */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-14 pointer-events-none border-t border-b border-primary/50 bg-white/5" />
        </div>
      </div>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 3: Goal Selection ─── */
function StepGoal({ onNext, initialGoal }: { onNext: (idx: number) => void; initialGoal: number }) {
  const [selected, setSelected] = useState<number | null>(initialGoal);

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6">
      <div className="flex flex-col items-center gap-6 w-full">
        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">
          Qual é sua
          <br />
          meta principal?
        </h1>

        <div className="flex flex-col gap-3 w-full mt-2">
          {GOALS.map((g, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all ${
                selected === i
                  ? "border-primary bg-primary/10"
                  : "border-border/30 bg-secondary/40 hover:border-border/60"
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <g.icon className={`h-5 w-5 ${selected === i ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <span className="font-heading font-bold text-foreground text-sm">{g.title}</span>
                {g.sub && <p className="text-primary text-xs mt-0.5">{g.sub}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => selected !== null && onNext(selected)}
        disabled={selected === null}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20 mt-4 disabled:opacity-40"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 4: Gender Selection ─── */
function StepGender({ onNext, initialGender }: { onNext: (id: string) => void; initialGender: string }) {
  const [selected, setSelected] = useState<string | null>(initialGender);

  return (
    <div className="flex flex-col flex-1 justify-between py-8 -mx-6 px-6">
      <div className="flex flex-col gap-4">
        <div className="text-left">
          <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">Escolha o Gênero</h1>
          <p className="text-muted-foreground text-sm mt-2">Escolha um deles para uma experiência melhor</p>
        </div>

        <div className="flex flex-col gap-3 mt-2 flex-1">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className={`relative rounded-2xl overflow-hidden flex-1 min-h-[160px] border transition-all bg-[#09090b] ${
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
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20 mt-4 disabled:opacity-40"
      >
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
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 -mx-6 px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-primary">AI</span>
          </span>
        </div>

        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">
          Controle Total
          <br />
          da Atratividade
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          Do seu Ângulo Goniaco à sua Estação de Cor,
          <br />
          nossa IA otimiza cada pixel da sua aparência.
        </p>

        <div className="flex flex-col gap-3 w-full mt-2">
          {modules.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-4 p-4 rounded-2xl border border-primary/30 bg-secondary/30"
            >
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-primary/20">
                <m.icon className={`h-6 w-6 ${m.color}`} />
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
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20"
      >
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
function StepBrutalTruth({ onNext, userData }: { onNext: () => void; userData: { age: number; goal: number; gender: string } }) {
  const { title, sub, metricLabel, metricValue, chartData } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const isFemale = userData.gender === 'female';
    
    // Dynamic Content Generation
    const title = isFemale ? "A Realidade Estética" : "A Verdade Brutal";
    
    const sub = isFemale 
      ? "A competição visual nunca foi tão alta. Redes sociais elevaram os padrões a níveis impossíveis."
      : "99% dos homens não percebem o quanto a atratividade impacta suas vidas, especialmente no namoro.";

    const metricLabel = isFemale ? "Pressão Estética" : "Índice de Solidão";
    
    // Calculate metric value based on age (peak pressure/loneliness around 20-30)
    let baseValue = 85;
    if (userData.age >= 18 && userData.age <= 35) baseValue = 92;
    if (userData.age > 35) baseValue = 88;
    
    const metricValue = baseValue;

    // Generate Chart Data
    // Simulating a rising trend of difficulty/pressure over the last 10 years
    const chartData = [
      { year: (currentYear - 10).toString(), value: baseValue - 45 },
      { year: (currentYear - 5).toString(), value: baseValue - 25 },
      { year: "Hoje", value: baseValue },
    ];

    return { title, sub, metricLabel, metricValue, chartData };
  }, [userData.age, userData.gender]);

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
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Metric: {userData.gender === 'female' ? 'Pressure' : 'Isolation'}</span>
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
                  dataKey="year"
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
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20"
      >
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
  const [userData, setUserData] = useState({ age: 20, goal: 0, gender: "male" });
  const navigate = useNavigate();

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
  const finish = () => navigate("/analysis");

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
            onClick={finish}
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
              {step === 0 && <StepImpact onNext={next} />}
              {step === 1 && <StepAge onNext={handleAgeNext} initialAge={userData.age} />}
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
