import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { SmartTrend } from "@/lib/smartTrendsEngine";

interface TutorialStepByStepProps {
  trend: SmartTrend;
  onClose: () => void;
}

export default function TutorialStepByStep({ trend, onClose }: TutorialStepByStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = trend.steps;
  const total = steps.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Tutorial</p>
          <h2 className="text-base font-semibold text-foreground leading-tight mt-0.5">{trend.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Safety Alert */}
      {trend.safety_alert && currentStep === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mb-4 p-3 rounded-xl bg-warning/5 border border-warning/15 flex gap-2.5 items-start"
        >
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80 leading-relaxed">{trend.safety_alert}</p>
        </motion.div>
      )}

      {/* Step Content */}
      <div className="flex-1 flex flex-col justify-center px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Step number */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{currentStep + 1}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  Passo {currentStep + 1} de {total}
                </p>
              </div>
            </div>

            {/* Step title */}
            <h3 className="text-xl font-bold text-foreground leading-tight">
              {steps[currentStep].text}
            </h3>

            {/* Step detail */}
            {steps[currentStep].detail && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {steps[currentStep].detail}
              </p>
            )}

            {/* Duration hint */}
            {trend.session_duration && currentStep === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Duração da sessão: {trend.session_duration}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Common Errors (show on last step) */}
      {currentStep === total - 1 && trend.common_errors && trend.common_errors.length > 0 && (
        <div className="mx-5 mb-4 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
          <p className="text-[10px] uppercase tracking-widest text-destructive/70 font-mono mb-2">Erros comuns</p>
          <ul className="space-y-1">
            {trend.common_errors.map((err, i) => (
              <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                <span className="text-destructive/50 mt-0.5">✕</span>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress & Navigation */}
      <div className="px-5 pb-8 pt-4 space-y-4">
        {/* Progress bar */}
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-colors duration-300 ${
                i <= currentStep ? "bg-primary" : "bg-muted/30"
              }`}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center disabled:opacity-20 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          
          {currentStep < total - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
            >
              Próximo passo
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
            >
              Concluído
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
