import type { Metadata } from "next";
import PageClient from "./PageClient";

export const metadata: Metadata = {
  title: "GBird Voice AI",
  description: "Voice-powered AI consciousness with Groq Whisper transcription and live commands.",
};

export default function Page() {
  return <PageClient />;
}
