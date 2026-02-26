
import { Check, ArrowRight, ChevronLeft, Signal, Wifi, Battery } from "lucide-react";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { useState } from "react";

interface PlanSelectionProps {
  onPlanSelected: (plan: PlanType) => void;
  onBack: () => void;
}

export const PlanSelection = ({ onPlanSelected, onBack }: PlanSelectionProps) => {
  const [selected, setSelected] = useState<PlanType>('yearly');

  const handleContinue = () => {
    onPlanSelected(selected);
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-foreground">
      {/* Header */}
      <div className="px-6 pt-2 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Seleção de Protocolo</h1>
        <div className="w-10"></div>
      </div>

      {/* Progress Steps */}
      <div className="px-8 mb-8">
        <div className="flex items-center justify-between relative">
          <div className="flex flex-col items-center z-10">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mb-1">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Análise</span>
          </div>
          <div className="step-line h-[2px] flex-grow mx-2 bg-primary"></div>
          <div className="flex flex-col items-center z-10">
            <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-primary bg-background-light dark:bg-background-dark mb-1">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Plano</span>
          </div>
          <div className="step-line h-[2px] flex-grow mx-2 bg-gray-200 dark:bg-gray-800"></div>
          <div className="flex flex-col items-center z-10">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-1">
            </div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Pagamento</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Maximize seu potencial</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione um protocolo científico para desbloquear sua análise biométrica completa.</p>
        </div>

        <div className="space-y-4">
          {/* Weekly Plan */}
          <div 
            onClick={() => setSelected('weekly')}
            className={`relative group cursor-pointer p-5 rounded-2xl border transition-all ${
              selected === 'weekly' 
                ? 'border-2 border-primary bg-white dark:bg-graphite glow-blue shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-graphite hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Acesso Semanal</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ciclo curto de 7 dias</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900 dark:text-white">R$ {PLAN_CONFIG.PLANS.weekly.price.toFixed(2)}</span>
                <p className="text-[10px] text-gray-400 uppercase">Por Semana</p>
              </div>
            </div>
          </div>

          {/* Monthly Plan */}
          <div 
            onClick={() => setSelected('monthly')}
            className={`relative group cursor-pointer p-5 rounded-2xl border transition-all ${
              selected === 'monthly' 
                ? 'border-2 border-primary bg-white dark:bg-graphite glow-blue shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-graphite hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Acesso Mensal</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ciclo biológico de 30 dias</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900 dark:text-white">R$ {PLAN_CONFIG.PLANS.monthly.price.toFixed(2)}</span>
                <p className="text-[10px] text-gray-400 uppercase">Por Mês</p>
              </div>
            </div>
          </div>

          {/* Yearly Plan - Best Value */}
          <div 
            onClick={() => setSelected('yearly')}
            className={`relative group cursor-pointer p-5 rounded-2xl border transition-all ${
              selected === 'yearly' 
                ? 'border-2 border-primary bg-white dark:bg-graphite glow-blue shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-graphite hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 uppercase tracking-wider">
                Melhor Valor
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Protocolo Anual</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">Evolução de longo prazo</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900 dark:text-white">R$ {PLAN_CONFIG.PLANS.yearly.price.toFixed(2)}</span>
                <p className="text-[10px] text-primary font-bold uppercase">Economize 60%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">Incluso em todos os planos</h4>
          
          <div className="flex items-start space-x-3">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Relatório Biométrico Completo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Análise detalhada de 42 pontos faciais & índices de simetria.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Guia de Estratégia IA</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rotinas personalizadas baseadas em dados para otimização estética.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Rastreamento Progressivo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Monitore mudanças com scans mensais e análise de tendências.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10">
        <button 
          onClick={handleContinue}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
        >
          <span>Continuar para Pagamento</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-4 px-4 leading-relaxed">
            Transação segura criptografada de 256 bits. Ao continuar, você concorda com nossos Termos de Serviço.
        </p>
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gray-300 dark:bg-gray-800 rounded-full"></div>
    </div>
  );
};
