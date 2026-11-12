import type { MetadataRoute } from "next";

// Installable sur l'écran d'accueil : nécessaire pour les notifications sur iPhone
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budget Molon", short_name: "Budget", start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#047857", lang: "fr",
    icons: [192, 512].map((t) => ({ src: `/icones/${t}`, sizes: `${t}x${t}`, type: "image/png" })),
  };
}
