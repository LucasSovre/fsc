import type { EventType } from "../../server/types";
export const typeLabels: Record<EventType, string> = { spectacle: "Spectacle", sortie: "Sortie", vacances: "Vacances", visio: "Visio", travail: "Travail" };
export const typeEmojis: Record<EventType, string> = { spectacle: "🎭", sortie: "🍽️", vacances: "🏖️", visio: "💻", travail: "💼" };
export const typesWithTickets: (EventType | "")[] = ["spectacle", "sortie"];
export const typesWithLink: (EventType | "")[] = ["visio", "spectacle", "sortie"];
