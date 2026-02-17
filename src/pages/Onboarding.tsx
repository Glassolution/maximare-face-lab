import { useState, useRef, useEffect, useMemo } from "react";
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
    { icon: "air", title: "Respiração Bucal", sub: "Queixo Fraco" },
    { icon: "accessibility_new", title: "Má Postura", sub: "Pescoço Curvado" },
    { icon: "face_6", title: "Inchaço", sub: "Rosto com Alto Sódio" },
  ];

  return (
    <div className="dark font-display antialiased bg-background-dark text-white h-[100dvh] overflow-hidden relative flex flex-col">
      <div className="fixed inset-0 blueprint-bg pointer-events-none"></div>

      <main className="relative z-10 max-w-md mx-auto h-full flex flex-col px-5 pt-6 pb-4 w-full">
        <header
          className="grid grid-cols-[auto,1fr,auto] items-center mb-4"
          style={{
            paddingLeft: "calc(env(safe-area-inset-left))",
            paddingRight: "calc(env(safe-area-inset-right))",
          }}
        >
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/5 backdrop-blur-md hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="flex gap-1.5 justify-center min-w-0 overflow-hidden">
            <div className="w-12 h-1 rounded-full bg-primary neon-glow"></div>
            <div className="w-8 h-1 rounded-full bg-slate-200/20 dark:bg-white/10"></div>
            <div className="w-8 h-1 rounded-full bg-slate-200/20 dark:bg-white/10"></div>
            <div className="w-8 h-1 rounded-full bg-slate-200/20 dark:bg-white/10"></div>
            <div className="w-8 h-1 rounded-full bg-slate-200/20 dark:bg-white/10"></div>
          </div>
          <button
            onClick={() => onNext(Array.from(selected))}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            Pular
          </button>
        </header>

        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-primary/20">
            M
          </div>
          <span className="font-bold tracking-tight text-sm uppercase">
            Maximare <span className="text-primary">AI</span>
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            Você está se Segurando
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed px-4">
            A maioria das falhas são hábitos estruturais.
            <br />
            Nossa IA identifica e sugere correções biométricas.
          </p>
        </div>

        <div className="flex-grow grid grid-cols-2 gap-3 mb-3 content-start">
          {habits.map((h, i) => (
            <button
              key={i}
              className={`glass-node flex flex-col items-center justify-center p-6 rounded-[2rem] group transition-all duration-300 ${
                selected.has(i) ? "selected" : ""
              } ${i === 2 ? "col-span-2 h-28" : "h-32"}`}
              onClick={() => toggleSelection(i)}
            >
              <div
                className={`icon-container mb-4 transition-transform group-hover:scale-110 ${
                  selected.has(i) ? "" : "text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-4xl">{h.icon}</span>
              </div>
              <h3 className="text-sm font-bold mb-1">{h.title}</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{h.sub}</p>
            </button>
          ))}
        </div>

        <footer className="relative z-10 px-8 pb-8 pt-4 bg-gradient-to-t from-background-dark via-background-dark to-transparent shrink-0">
          <Button
            onClick={() => onNext(Array.from(selected))}
            className="w-full h-14 bg-white text-primary font-bold rounded-full shadow-lg shadow-primary/20 text-base tracking-wide hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
            Continuar
          </Button>
        </footer>
      </main>
    </div>
  );
}

/* ─── Step 2: Age Picker (Biometric Style) ─── */
function StepAge({ onNext, onBack, initialAge }: { onNext: (age: number) => void; onBack: () => void; initialAge: number }) {
  const [selectedAge, setSelectedAge] = useState(initialAge);
  const ages = Array.from({ length: 83 }, (_, i) => i + 12); // Range 12-94
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const idx = ages.indexOf(selectedAge);
      scrollRef.current.scrollTop = idx * 120;
    }
  }, []); // Run once on mount

  return (
    <div className="bg-white text-slate-900 h-[100dvh] flex flex-col overflow-hidden fixed inset-0 z-50">
      {/* Background Radial Gradient for subtle depth */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50/50 via-white to-white pointer-events-none"></div>

      {/* Header */}
      <header
        className="relative z-10 grid grid-cols-[auto,1fr,auto] items-center px-6 pt-14 pb-4 shrink-0"
        style={{
          paddingLeft: "calc(1.5rem + env(safe-area-inset-left))",
          paddingRight: "calc(1.5rem + env(safe-area-inset-right))",
          paddingTop: "calc(3.5rem + env(safe-area-inset-top))",
        }}
      >
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex gap-2 px-4 justify-center min-w-0 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-colors ${
                i === 1 ? "w-12 bg-primary neon-glow" : "w-8 bg-slate-300"
              }`}
            ></div>
          ))}
        </div>

        <button onClick={() => onNext(selectedAge)} className="text-sm font-semibold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors shrink-0">
          PULAR
        </button>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center shrink-0">
        <div className="text-center z-10 mb-8 px-6 mt-[-40px]">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Qual é sua idade?</h1>
          <p className="text-slate-500 text-sm max-w-[280px] mx-auto leading-relaxed">
            Selecione sua idade para calibrar o motor de análise biométrica.
          </p>
        </div>

        <div className="relative w-full max-w-[320px] h-[320px] flex items-center justify-center">
          <div className="radial-lines border-slate-200"></div>
          <div className="radial-lines w-[280px] h-[280px] opacity-30 border-slate-200"></div>
          
          <div className="absolute left-0 right-0 h-24 pointer-events-none flex items-center justify-between px-10 z-20">
            <div className="w-12 h-[1px] bg-primary/40"></div>
            <div className="w-12 h-[1px] bg-primary/40"></div>
          </div>

          <div 
            ref={scrollRef}
            onScroll={(e) => {
              const target = e.currentTarget;
              const scrollTop = target.scrollTop;
              const centerIdx = Math.round(scrollTop / 120); // 120 is ITEM_HEIGHT
              const clamped = Math.max(0, Math.min(ages.length - 1, centerIdx));
              if (ages[clamped] !== selectedAge) {
                setSelectedAge(ages[clamped]);
              }
            }}
            className="age-scroll flex flex-col items-center gap-0 overflow-y-auto snap-y snap-mandatory h-full w-full scrollbar-hide mask-gradient-y"
          >
            <div className="shrink-0 w-full" style={{ height: 'calc(50% - 60px)' }}></div>
            {ages.map((age) => {
              const isSelected = age === selectedAge;
              return (
                <div 
                  key={age} 
                  className={`age-item snap-center flex items-center justify-center h-[120px] min-h-[120px] w-full cursor-pointer transition-all duration-300 ${isSelected ? 'scale-110' : 'opacity-40'}`}
                  onClick={() => {
                    setSelectedAge(age);
                    scrollRef.current?.scrollTo({ top: ages.indexOf(age) * 120, behavior: 'smooth' });
                  }}
                >
                  <span className={`font-bold transition-all duration-300 relative font-heading ${
                    isSelected 
                      ? 'text-8xl text-slate-900 selected-age' 
                      : 'text-6xl text-slate-300'
                  }`}>
                    {age}
                    {isSelected && <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary text-center mt-2 absolute left-1/2 -translate-x-1/2 -bottom-6 whitespace-nowrap">SELECIONADO</div>}
                  </span>
                </div>
              );
            })}
            <div className="shrink-0 w-full" style={{ height: 'calc(50% - 60px)' }}></div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-8 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent shrink-0">
        <Button 
          onClick={() => onNext(selectedAge)}
          className="w-full h-14 bg-white text-primary font-bold rounded-full shadow-xl shadow-primary/40 glow-primary text-base tracking-wide hover:bg-white/90 hover:scale-[1.04] active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <ArrowRight className="h-4 w-4" />
          Continuar
        </Button>
      </footer>
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
        className="w-full h-14 bg-white text-primary font-bold rounded-full shadow-lg shadow-primary/20 text-base tracking-wide hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 mt-4"
      >
        <ArrowRight className="h-4 w-4" />
        Continuar
      </Button>
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
  const finish = () => navigate("/login");

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
