export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  keywords: string[];
};

export const services: Service[] = [
  {
    id: "bridal-glam",
    name: "Signature Bridal Glam",
    description:
      "A luxe, camera-ready bridal application with complexion prep, airbrushed finish, and touch-up kit.",
    durationMinutes: 120,
    price: 320,
    keywords: ["bridal", "wedding", "bride"],
  },
  {
    id: "event-glam",
    name: "Event Glam",
    description:
      "Full-face glam perfect for red carpet, photoshoots, and elevated nights out.",
    durationMinutes: 90,
    price: 220,
    keywords: ["event", "glam", "party", "photoshoot"],
  },
  {
    id: "soft-glow",
    name: "Soft Glow Makeup",
    description:
      "Effortless complexion focus with luminous skin, soft eyes, and natural lashes.",
    durationMinutes: 75,
    price: 180,
    keywords: ["soft", "natural", "glow", "daytime"],
  },
  {
    id: "lesson",
    name: "Personal Makeup Lesson",
    description:
      "A 90-minute one-on-one lesson covering techniques, product curation, and a personalized face chart.",
    durationMinutes: 90,
    price: 260,
    keywords: ["lesson", "class", "tutorial", "session"],
  },
];
