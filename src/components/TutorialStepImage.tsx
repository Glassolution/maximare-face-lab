import { useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

interface TutorialCarouselProps {
  interventionType: string; // The protocol/trend name
  steps: { text: string; detail?: string }[];
}

// Mapeamento de protocolos para keywords do Unsplash
const PROTOCOL_KEYWORDS: Record<string, string> = {
  // Mandíbula / Estrutura
  "mewing-basic": "man,jawline,profile,portrait",
  "chewing-hypertrophy": "gum,chewing,man,eating",
  
  // Gordura / Inchaço
  "sodium-flush": "water,drinking,healthy,man",
  "lymphatic-drainage": "facial,massage,spa,skincare",
  "caloric-deficit": "healthy,food,salad,man,fitness",
  
  // Pele
  "basic-skincare": "skincare,face,wash,man,cream",
  "retinol-protocol": "serum,skincare,bottle,night",
  
  // Olhos
  "ice-eyes": "ice,cube,face,cold",
  "volufiline-eyes": "eye,cream,serum,cosmetic",
  
  // Pescoço / Postura
  "neck-training": "neck,workout,gym,man,fitness",
  "chin-tucks": "posture,neck,man,standing",

  // Fallbacks genéricos
  "skincare": "skincare,routine,face,wash",
  "exercicio": "fitness,workout,gym,man",
  "habito": "meditation,calm,man,lifestyle",
  "procedimento": "clinic,aesthetic,treatment"
};

export function TutorialCarousel({ interventionType, steps }: TutorialCarouselProps) {
  // Get keywords from map or fallback to interventionType
  const keywords = PROTOCOL_KEYWORDS[interventionType] || 
                   interventionType.replace(/_/g, ',').replace(/-/g, ',') + ",facial,aesthetic";
  
  // Unsplash Source URL (random image based on keywords)
  // Using 800x600 for good resolution
  const imageUrl = `https://source.unsplash.com/800x600/?${keywords}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Clean title for alt text
  const cleanTitle = interventionType.replace(/_/g, ' ').replace(/-/g, ' ');

  return (
    <div className="rounded-xl overflow-hidden bg-secondary/20 border border-white/5 relative aspect-video group">
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-[10px] text-muted-foreground">Carregando visualização...</span>
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
            console.warn("Failed to load Unsplash image:", imageUrl);
            setLoading(false);
            setError(true);
          }}
          crossOrigin="anonymous"
        />
      )}
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
        <p className="text-white text-xs font-medium drop-shadow-md">
          Referência Visual
        </p>
      </div>
    </div>
  );
}
