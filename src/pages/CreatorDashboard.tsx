import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CreatorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile?.is_ugc) {
    return <Navigate to="/analysis" replace />;
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <main className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pt-8 pb-24 relative">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-center">Painel do Criador</h1>
        </div>
        {/* Lucro Card */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              Lucro
            </p>
            <p
              className="text-3xl font-bold leading-tight"
              style={{ color: "#00FF88" }}
            >
              R$ 0,00
            </p>
          </div>
        </div>

        {/* Churn Card */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              Taxa de Churn
            </p>
            <p className="text-red-500 text-3xl font-bold leading-tight">0%</p>
          </div>
        </div>

        {/* Faturamento Bruto Card */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              Faturamento Bruto
            </p>
            <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
              R$ 0,00
            </p>
          </div>
        </div>

        {/* Distribuição de Indicadores */}
        <div className="rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-8 shadow-sm mt-4 text-center sm:text-left">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-8">
            Distribuição de Indicadores
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
            {/* Donut Chart */}
            <div className="relative h-48 w-48">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <circle
                  className="dark:stroke-slate-700"
                  cx="18"
                  cy="18"
                  r="15.915494309189533"
                  fill="transparent"
                  stroke="#cbd5e1"
                  strokeWidth="3"
                />
                {/* Base vazia para quando ainda não há dados */}
                <circle
                  className="dark:stroke-white"
                  cx="18"
                  cy="18"
                  r="15.915494309189533"
                  fill="transparent"
                  stroke="#0f172a"
                  strokeWidth="4"
                  strokeDasharray="0 100"
                  strokeDashoffset={0}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Total
                </span>
                <span className="text-lg font-bold">100%</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-col gap-4 min-w-[180px]">
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: "#00FF88" }}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Lucro</span>
                  <span className="text-sm font-semibold">R$ 0,00</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Taxa de Churn</span>
                  <span className="text-sm font-semibold">0%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-slate-900 dark:bg-white" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">
                    Faturamento Bruto
                  </span>
                  <span className="text-sm font-semibold">
                    R$ 0,00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão simples no final da página para abrir métricas */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/creator/metrics")}
            className="h-10 px-4 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center gap-2 shadow-md shadow-sky-500/30 text-sm font-medium transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Métricas do Criador</span>
          </button>
        </div>
      </main>
    </div>
  );
}

