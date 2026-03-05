import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Premium() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Pagamentos desativados</h1>
        <p className="text-muted-foreground">O sistema de assinatura e reembolso foi removido deste app.</p>
        <Button onClick={() => navigate('/analysis')}>Voltar ao app</Button>
      </div>
    </div>
  );
}
