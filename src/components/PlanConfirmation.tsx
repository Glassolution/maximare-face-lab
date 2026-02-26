
import { Check, ArrowRight, ChevronLeft, ShieldCheck, Zap, Trophy, BarChart3, Scissors, Palette, Dumbbell } from "lucide-react";
import { PLAN_CONFIG, PlanType } from "@/config/plans";

interface PlanConfirmationProps {
  selectedPlan: PlanType;
  onConfirm: () => void;
  onBack: () => void;
}

export const PlanConfirmation = ({ selectedPlan, onConfirm, onBack }: PlanConfirmationProps) => {
  const plan = PLAN_CONFIG.PLANS[selectedPlan];

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-foreground">
      {/* Header */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Confirmação do Plano</h1>
        <div className="w-10"></div>
      </div>

      {/* Progress Steps */}
      <div className="px-8 mb-8">
        <div className="flex items-center justify-between relative">
          <div className="flex flex-col items-center z-10">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mb-1 shadow-lg shadow-primary/30">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Análise</span>
          </div>
          <div className="step-line h-[2px] flex-grow mx-2 bg-primary"></div>
          <div className="flex flex-col items-center z-10">
            <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-primary bg-background-light dark:bg-background-dark mb-1 shadow-lg shadow-primary/20">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Você escolheu: {plan.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Excelente escolha para maximizar seu potencial estético.</p>
        </div>

        {/* Selected Plan Card */}
        <div className="relative p-6 rounded-2xl border-2 border-primary bg-white dark:bg-graphite shadow-[0_0_20px_rgba(59,130,246,0.15)] mb-8">
            {selectedPlan === 'yearly' && (
                <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 uppercase tracking-wider shadow-lg shadow-blue-500/30">
                    Melhor Valor
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedPlan === 'weekly' ? 'Ciclo curto de 7 dias' : selectedPlan === 'monthly' ? 'Ciclo biológico de 30 dias' : 'Evolução de longo prazo'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">R$ {plan.price.toFixed(2)}</span>
                <p className="text-[10px] text-gray-400 uppercase font-medium">
                    {selectedPlan === 'weekly' ? 'Por Semana' : selectedPlan === 'monthly' ? 'Por Mês' : 'Pagamento Único'}
                </p>
              </div>
            </div>
            
            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800 my-4"></div>

            <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Acesso Imediato ao Relatório Completo</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Garantia de Satisfação</span>
                </div>
            </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">O que você vai receber:</h4>
          
          <div className="grid grid-cols-1 gap-4">
            <FeatureItem 
                icon={<Trophy className="w-5 h-5 text-yellow-500" />}
                title="Relatório Biométrico Completo"
                description="Análise detalhada de 42 pontos faciais & índices de simetria."
            />
            <FeatureItem 
                icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
                title="Guia de Estratégia IA"
                description="Rotinas personalizadas baseadas em dados para otimização estética."
            />
            <FeatureItem 
                icon={<Dumbbell className="w-5 h-5 text-orange-500" />}
                title="Análise Maximare Ultimate"
                description="Recomendações de treino baseadas no seu biotipo."
            />
             <FeatureItem 
                icon={<Palette className="w-5 h-5 text-purple-500" />}
                title="Análise de Cores"
                description="Descubra a paleta de cores que mais valoriza seu tom de pele."
            />
             <FeatureItem 
                icon={<Scissors className="w-5 h-5 text-teal-500" />}
                title="Análise Capilar"
                description="Cortes de cabelo ideais para o formato do seu rosto."
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10">
        <button 
          onClick={onConfirm}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] active:shadow-none"
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

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex items-start space-x-4 p-3 rounded-xl bg-white dark:bg-graphite/50 border border-gray-100 dark:border-gray-800">
        <div className="mt-1 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
    </div>
);
