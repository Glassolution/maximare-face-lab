import { useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

interface TutorialCarouselProps {
  interventionType: string; // The protocol/trend name
  steps: { text: string; detail?: string }[];
}

export function TutorialCarousel({ interventionType, steps }: TutorialCarouselProps) {
  // Construct a prompt based on the intervention type
  // Example: "Retinol skincare tutorial, step by step facial routine, clean minimalist illustration"
  // We'll use the first few words of the interventionType + some keywords
  
  const cleanTitle = interventionType.replace(/_/g, ' ').replace(/-/g, ' ');
  const prompt = `${cleanTitle} facial technique tutorial, aesthetic minimalist illustration, clean lines, educational medical style, soft lighting`;
  
  // URL encoding
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden bg-secondary/20 border border-white/5 relative aspect-video group">
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-[10px] text-muted-foreground">Gerando visualização...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/20 text-muted-foreground p-4 text-center">
          <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-xs">Visualização indisponível</p>
        </div>
      ) : (
        <img 
          src={imageUrl} 
          alt={`Tutorial visual para ${cleanTitle}`}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
        <p className="text-white text-xs font-medium drop-shadow-md">
          Ilustração gerada por IA
        </p>
      </div>
    </div>
  );
}
