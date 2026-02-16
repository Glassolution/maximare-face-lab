export interface Celebrity {
  id: string;
  name: string;
  category: "actor" | "model" | "singer" | "influencer";
  photoUrl: string; // Placeholder for now
  tags: string[]; // e.g., "jawline", "hunter_eyes", "high_cheekbones"
  tier: "god" | "top" | "mid"; // Internal tier for matching
  description: string; // "Known for..."
}

export const CELEBRITIES: Celebrity[] = [
  // Actors
  {
    id: "henry_cavill",
    name: "Henry Cavill",
    category: "actor",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", // Placeholder
    tags: ["jawline", "hunter_eyes", "masculine", "thick_neck"],
    tier: "god",
    description: "Superman jawline and classic masculine features.",
  },
  {
    id: "brad_pitt",
    name: "Brad Pitt (90s)",
    category: "actor",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", // Placeholder
    tags: ["jawline", "harmony", "blonde", "low_body_fat"],
    tier: "god",
    description: "Peak facial harmony and definition.",
  },
  {
    id: "christian_bale",
    name: "Christian Bale",
    category: "actor",
    photoUrl: "https://images.unsplash.com/photo-1534030347209-7147fd9e791a?w=400&h=400&fit=crop", // Placeholder
    tags: ["cheekbones", "intense_gaze", "masculine"],
    tier: "top",
    description: "Patrick Bateman style cheekbones.",
  },
  {
    id: "cillian_murphy",
    name: "Cillian Murphy",
    category: "actor",
    photoUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop", // Placeholder
    tags: ["cheekbones", "blue_eyes", "androgynous_balance"],
    tier: "top",
    description: "Striking bone structure and eyes.",
  },

  // Models
  {
    id: "chico_lachowski",
    name: "Francisco Lachowski",
    category: "model",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", // Placeholder
    tags: ["pretty_boy", "symmetry", "youthful"],
    tier: "god",
    description: "The ultimate 'pretty boy' archetype.",
  },
  {
    id: "sean_opry",
    name: "Sean O'Pry",
    category: "model",
    photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop", // Placeholder
    tags: ["hunter_eyes", "sharp_features", "blue_eyes"],
    tier: "god",
    description: "World's most successful male model features.",
  },
  {
    id: "jordan_barrett",
    name: "Jordan Barrett",
    category: "model",
    photoUrl: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=400&fit=crop", // Placeholder
    tags: ["alien_look", "compact_midface", "wide_jaw"],
    tier: "top",
    description: "Exotic and highly dimorphic features.",
  },
  {
    id: "david_gandy",
    name: "David Gandy",
    category: "model",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop", // Placeholder
    tags: ["classic", "mature", "masculine", "blue_eyes"],
    tier: "top",
    description: "Classic masculine elegance.",
  },

  // Singers
  {
    id: "zayn_malik",
    name: "Zayn Malik",
    category: "singer",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", // Placeholder
    tags: ["pretty_boy", "stubble", "eyelashes"],
    tier: "top",
    description: "High harmony and grooming.",
  },
];
