import { useState, useRef, useCallback, useEffect } from "react";
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

/* ─── Step 1: Emotional Impact ─── */
function StepImpact({ onNext }: { onNext: () => void }) {
  const habits = [
    { icon: Wind, title: "Respiração pela Boca", sub: "(Queixo Fraco)" },
    { icon: Scissors, title: "Penteado Errado", sub: "(Formato de Cabeça de Ovo)" },
    { icon: Droplets, title: "Inchaço", sub: "(Rosto com Alto Sódio)" },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-destructive">AI</span>
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
                <div className="relative h-20 w-20 rounded-full border-2 border-destructive flex items-center justify-center">
                  <Icon className="h-8 w-8 text-destructive/70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-[2px] w-16 bg-destructive rotate-45 rounded-full" />
                    <div className="absolute h-[2px] w-16 bg-destructive -rotate-45 rounded-full" />
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
        onClick={onNext}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 2: Age Picker ─── */
function StepAge({ onNext }: { onNext: () => void }) {
  const [selectedAge, setSelectedAge] = useState(20);
  const ages = Array.from({ length: 50 }, (_, i) => i + 12);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const itemH = 56;
      const idx = ages.indexOf(selectedAge);
      scrollRef.current.scrollTop = idx * itemH - itemH * 2.5;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const itemH = 56;
    const scrollTop = scrollRef.current.scrollTop;
    const centerIdx = Math.round((scrollTop + itemH * 2.5) / itemH);
    const clamped = Math.max(0, Math.min(ages.length - 1, centerIdx));
    setSelectedAge(ages[clamped]);
  }, [ages]);

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 bg-gradient-to-b from-[hsl(224,60%,12%)] to-[hsl(224,40%,8%)] -mx-6 px-6 rounded-none min-h-0">
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
          className="relative h-[336px] w-full overflow-y-auto scrollbar-hide snap-y snap-mandatory mt-4"
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
                  onClick={() => setSelectedAge(age)}
                >
                  <span
                    className={`font-heading font-extrabold transition-all duration-200 ${
                      isSelected
                        ? "text-4xl text-foreground"
                        : diff === 1
                        ? "text-2xl text-muted-foreground/60"
                        : diff === 2
                        ? "text-xl text-muted-foreground/30"
                        : "text-lg text-muted-foreground/15"
                    }`}
                  >
                    {age}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Selection highlight */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-14 bg-secondary/50 rounded-xl pointer-events-none border border-border/30" />
        </div>
      </div>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 3: Goal Selection ─── */
function StepGoal({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const goals = [
    { icon: BarChart3, title: "Aprender o básico", sub: null },
    { icon: Sparkles, title: "Melhorar estética facial", sub: null },
    { icon: Target, title: "Melhorar rosto e físico", sub: null },
    { icon: Crown, title: "Impulsionar meu look e confiança", sub: "Uma transformação completa" },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 bg-gradient-to-b from-[hsl(224,60%,12%)] to-[hsl(224,40%,8%)] -mx-6 px-6">
      <div className="flex flex-col items-center gap-6 w-full">
        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">
          Qual é sua
          <br />
          meta principal?
        </h1>

        <div className="flex flex-col gap-3 w-full mt-2">
          {goals.map((g, i) => (
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
        onClick={onNext}
        disabled={selected === null}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground mt-4 disabled:opacity-40"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 4: Gender Selection ─── */
function StepGender({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const genders = [
    { id: "male", label: "Masculino", img: genderMale },
    { id: "female", label: "Feminino", img: genderFemale },
    { id: "nonbinary", label: "Não Binário", img: genderNonbinary },
  ];

  return (
    <div className="flex flex-col flex-1 justify-between py-8">
      <div className="flex flex-col gap-4">
        <div className="text-left">
          <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">Escolha o Gênero</h1>
          <p className="text-muted-foreground text-sm mt-2">Escolha um deles para uma experiência melhor</p>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          {genders.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className={`relative rounded-2xl overflow-hidden h-52 border transition-all flex items-end ${
                selected === g.id ? "border-destructive ring-1 ring-destructive" : "border-border/30"
              }`}
            >
               <img
                 src={g.img}
                 alt={g.label}
                 className="absolute inset-0 w-full h-full object-cover object-[center_20%] opacity-90"
               />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
              <span className="relative z-10 font-heading font-bold text-foreground text-xl p-5 block text-left">
                {g.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!selected}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground mt-4 disabled:opacity-40"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 5: Authority / Modules ─── */
function StepAuthority({ onNext }: { onNext: () => void }) {
  const modules = [
    { icon: Star, name: "PSLMAX", desc: "Sistema de pontuação de atratividade", color: "text-destructive" },
    { icon: Sparkles, name: "ASTRA", desc: "Análise de Cor e Pele", color: "text-destructive" },
    { icon: Dumbbell, name: "GYMMAX", desc: "Projeção Física", color: "text-destructive" },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-destructive">AI</span>
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
              className="flex items-center gap-4 p-4 rounded-2xl border border-destructive/30 bg-secondary/30"
            >
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-destructive/20">
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
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 6: Future Projection ─── */
function StepProjection({ onNext }: { onNext: () => void }) {
  const data = [
    { day: "Sem 1", normal: 3.5, protocol: 4 },
    { day: "Sem 4", normal: 3.8, protocol: 5.5 },
    { day: "Sem 8", normal: 4.0, protocol: 7.0 },
    { day: "90 dias", normal: 4.2, protocol: 8.5 },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8 bg-gradient-to-b from-primary to-[hsl(224,60%,25%)] -mx-6 px-6">
      <div className="flex flex-col items-center gap-6 w-full flex-1 justify-center">
        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight w-full text-left">
          Te entendemos.
        </h1>

        <div className="text-8xl font-heading font-black text-foreground leading-none">92%</div>

        <div className="text-foreground text-lg font-heading font-bold leading-relaxed">
          de nossos usuários
          <br />
          <span className="bg-foreground text-background rounded-lg px-4 py-2 font-extrabold text-base inline-block">
            se sentem mais seguros
          </span>
          <br />
          em 2 semanas
          <br />
          com nosso
          <br />
          <span className="font-black">exclusivo</span> programa
        </div>
      </div>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-foreground/20 hover:bg-foreground/30 text-foreground/60 border border-foreground/10"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 7: Brutal Truth ─── */
function StepBrutalTruth({ onNext }: { onNext: () => void }) {
  const chartData = [
    { year: "2010", value: 10 },
    { year: "2015", value: 15 },
    { year: "2020", value: 30 },
    { year: "Now", value: 85 },
  ];

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8">
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-heading font-extrabold text-sm text-primary-foreground">M</span>
          </div>
          <span className="font-heading font-bold text-foreground">
            Maximare <span className="text-destructive">AI</span>
          </span>
        </div>

        <h1 className="font-heading text-3xl font-extrabold text-foreground leading-tight">A Verdade Brutal</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          99% das pessoas não percebem o quanto a atratividade impacta suas vidas, especialmente para namoro.
        </p>

        <div className="w-full mt-4 text-left">
          <h3 className="font-heading font-bold text-foreground text-sm tracking-wider uppercase">
            Índice de Solidão Masculina
          </h3>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Metric: Isolation</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-heading font-black text-foreground">85%</span>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <div className="border border-destructive/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive text-xs font-bold uppercase">Critical Levels</span>
            </div>
          </div>

          <div className="w-full h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
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
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={3}
                  fill="url(#redGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      >
        Continuar
      </Button>
    </div>
  );
}

/* ─── Step 8: Final CTA ─── */
function StepFinalCTA({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-between py-8">
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="h-24 w-24 rounded-full bg-gradient-to-br from-destructive to-primary flex items-center justify-center"
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
                <div className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-destructive" />
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
        className="w-full rounded-2xl py-7 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => navigate("/analysis");

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto w-full">
      {/* Progress bar */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div className="flex items-center gap-3 px-6 pt-4">
          <button onClick={back} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <button
            onClick={next}
            className="text-primary text-sm font-medium hover:text-primary/80 transition-colors"
          >
            Pular
          </button>
        </div>
      )}

      {/* Steps */}
      <div className="flex-1 flex flex-col px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex-1 flex flex-col"
          >
            {step === 0 && <StepImpact onNext={next} />}
            {step === 1 && <StepAge onNext={next} />}
            {step === 2 && <StepGoal onNext={next} />}
            {step === 3 && <StepGender onNext={next} />}
            {step === 4 && <StepAuthority onNext={next} />}
            {step === 5 && <StepProjection onNext={next} />}
            {step === 6 && <StepBrutalTruth onNext={next} />}
            {step === 7 && <StepFinalCTA onFinish={finish} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
