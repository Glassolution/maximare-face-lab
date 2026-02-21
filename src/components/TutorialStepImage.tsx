import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, RefreshCw, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface TutorialStepImageProps {
  interventionType: string;
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
}

// In-memory cache to avoid redundant requests during session
const imageCache = new Map<string, string>();

export default function TutorialStepImage({
  interventionType,
  stepIndex,
  stepTitle,
  stepDescription,
}: TutorialStepImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const cacheKey = `${interventionType}_step_${stepIndex}`;

  useEffect(() => {
    // Check memory cache first
    const cached = imageCache.get(cacheKey);
    if (cached) {
      setImageUrl(cached);
      return;
    }

    loadImage();
  }, [cacheKey]);

  const loadImage = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-tutorial-image", {
        body: {
          intervention_type: interventionType,
          step_index: stepIndex,
          step_title: stepTitle,
          step_description: stepDescription,
          locale: "pt-BR",
        },
      });

      if (fnError) throw fnError;

      if (data?.image_url) {
        imageCache.set(cacheKey, data.image_url);
        setImageUrl(data.image_url);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Tutorial image error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden bg-secondary/30 border border-border/10">
        <Skeleton className="w-full aspect-[4/3]" />
        <div className="px-3 py-2">
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <button
        onClick={loadImage}
        className="w-full rounded-xl border border-dashed border-border/30 bg-secondary/10 flex flex-col items-center justify-center gap-2 py-6 hover:bg-secondary/20 transition-colors"
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/70">
          {error ? "Falha ao gerar" : "Gerar ilustração"}
        </span>
        {error && (
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden bg-secondary/20 border border-border/10 cursor-pointer group relative"
        onClick={() => setZoomed(true)}
      >
        <img
          src={imageUrl}
          alt={`Tutorial: ${stepTitle}`}
          className="w-full aspect-[4/3] object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
      </motion.div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageUrl}
                alt={`Tutorial: ${stepTitle}`}
                className="w-full rounded-2xl"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl">
                <p className="text-white text-sm font-medium">{stepTitle}</p>
                <p className="text-white/70 text-xs">{stepDescription}</p>
              </div>
              <button
                onClick={() => setZoomed(false)}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Carousel for all steps ───
interface TutorialCarouselProps {
  interventionType: string;
  steps: { text: string; detail?: string }[];
}

export function TutorialCarousel({ interventionType, steps }: TutorialCarouselProps) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <TutorialStepImage
          interventionType={interventionType}
          stepIndex={activeStep}
          stepTitle={steps[activeStep].text}
          stepDescription={steps[activeStep].detail || steps[activeStep].text}
        />
      </div>

      {/* Step dots */}
      {steps.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center disabled:opacity-30"
          >
            <ChevronLeft className="h-3 w-3 text-foreground" />
          </button>
          
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeStep ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
          
          <button
            onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
            disabled={activeStep === steps.length - 1}
            className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center disabled:opacity-30"
          >
            <ChevronRight className="h-3 w-3 text-foreground" />
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Passo {activeStep + 1}: {steps[activeStep].text}
      </p>
    </div>
  );
}
