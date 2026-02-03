import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GBird Voice AI",
    short_name: "GBird",
    description:
      "Voice-powered AI consciousness with Groq Whisper transcription and live commands.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6efe6",
    theme_color: "#12b5a6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
