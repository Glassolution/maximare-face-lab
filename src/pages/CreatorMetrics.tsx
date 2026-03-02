import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function CreatorMetrics() {
  const { user, profile } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile?.is_ugc) {
    return <Navigate to="/analysis" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f171e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f171e] border-b border-gray-800 py-6 px-4">
        <h1 className="text-xl font-bold text-center">Métricas de Influenciador</h1>
      </header>

      <main className="flex-grow p-4 space-y-6 pb-20">
        {/* Código de referência */}
        <section>
          <div className="p-6 rounded-2xl border border-gray-800 bg-[#17212b] shadow-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Seu Código de Referência
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-4">
              <h2 className="font-black tracking-widest text-white drop-shadow-sm text-4xl sm:text-5xl">
                MAXMARIA10
              </h2>
              <button className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
                <span>Copiar Código</span>
              </button>
            </div>
          </div>
        </section>

        {/* Desempenho Geral */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-sky-500 p-1 rounded-md">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Desempenho Geral</h3>
          </div>

          {/* Usos Totais */}
          <div className="bg-[#17212b] p-6 rounded-2xl border border-gray-800 relative">
            <div className="absolute top-6 right-6 text-gray-700">
              <svg
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-4">Usos Totais</p>
            <div className="text-4xl font-bold mb-6">0</div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full w-[65%] rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
            </div>
          </div>

          {/* Comissão Gerada */}
          <div className="bg-[#17212b] p-6 rounded-2xl border border-gray-800 relative">
            <div className="absolute top-6 right-6 text-gray-700">
              <svg
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-4">Comissão Gerada</p>
            <div className="text-4xl font-bold mb-6">R$ 0,00</div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full w-[45%] rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
            </div>
          </div>
        </section>

        {/* Atividades Recentes */}
        <section className="space-y-4 pb-4">
          <h3 className="text-xl font-bold">Atividades Recentes</h3>
          <div className="space-y-3">
            <div className="bg-[#17212b] p-8 rounded-xl border border-gray-800 text-center">
              <p className="text-slate-400 text-sm font-medium">Nenhuma atividade recente</p>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom nav highlight for métricas */}
      <footer className="sticky bottom-0 bg-[#0f171e] border-t border-gray-800 py-3 flex justify-around items-center px-4">
        <div className="flex flex-col items-center gap-1 opacity-50">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tight">Início</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-sky-500">
          <svg
            className="h-6 w-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 19H7V11H9V19ZM13 19H11V5H13V19ZM17 19H15V13H17V19Z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tight">Métricas</span>
          <div className="h-1 w-1 bg-sky-500 rounded-full" />
        </div>
      </footer>
    </div>
  );
}

