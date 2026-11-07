import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: "FSC — Fucking Simple Calendar", short_name: "FSC", description: "Ton calendrier commun et solo.", start_url: "/", display: "standalone", lang: "fr" };
}
