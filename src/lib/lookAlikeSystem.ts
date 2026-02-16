import { CELEBRITIES, Celebrity } from "./celebrityDatabase";

export interface LookAlikeResult {
  topMatch: Celebrity;
  similarity: number; // 0-100
  top5: { celebrity: Celebrity; similarity: number; reasons: string[] }[];
  analyzedTraits: string[];
}

// Mock function to simulate the "AI Pipeline"
// In a real app, this would send the image to a backend with FaceNet/Dlib
export async function findLookAlike(frontPhoto: string, sidePhoto: string | null): Promise<LookAlikeResult> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Randomly shuffle celebrities to pick a "match"
  // In reality, this would use cosine similarity of embeddings
  const shuffled = [...CELEBRITIES].sort(() => 0.5 - Math.random());
  
  const topMatch = shuffled[0];
  const others = shuffled.slice(1, 5);

  // Generate a high similarity score for the top match (75-95%)
  const topScore = Math.floor(Math.random() * 20) + 75;

  return {
    topMatch: topMatch,
    similarity: topScore,
    top5: [
      {
        celebrity: topMatch,
        similarity: topScore,
        reasons: generateReasons(topMatch),
      },
      ...others.map((c, i) => ({
        celebrity: c,
        similarity: topScore - (i + 1) * (Math.floor(Math.random() * 5) + 2), // Decreasing score
        reasons: generateReasons(c),
      })),
    ],
    analyzedTraits: ["Estrutura Óssea", "Região dos Olhos", "Proporção Facial"],
  };
}

function generateReasons(celeb: Celebrity): string[] {
  const reasons = [
    `Formato de ${celeb.tags[0]} similar`,
    "Proporção do terço médio",
    "Simetria facial compatível",
    "Ângulo da mandíbula",
    "Desenho da sobrancelha",
    "Distância entre os olhos",
  ];
  
  // Pick 2 random reasons
  return reasons.sort(() => 0.5 - Math.random()).slice(0, 2);
}
