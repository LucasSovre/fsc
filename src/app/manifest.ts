import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: "FSC — Fucking Simple Calendar", short_name: "FSC", description: "Ton calendrier commun et solo.", start_url: "/", display: "standalone", lang: "fr", background_color: "#f6f6f6", theme_color: "#272725", icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }] };
}
