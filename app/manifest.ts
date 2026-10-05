import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LevelUp7",
    short_name: "LevelUp7",
    description: "Englisch und Französisch, ein paar Minuten am Tag.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14161c",
    theme_color: "#14161c",
    lang: "de",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
