import { NextResponse } from "next/server";

const SAMPLE_REPLY =
  "Copy. Holding pattern. Returning latest telemetry and locking perimeter.";
const SAMPLE_AUDIO_BASE64 = "UklGRAAA"; // placeholder (not real audio)

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({
    reply: SAMPLE_REPLY,
    audio_base64: SAMPLE_AUDIO_BASE64,
    media_type: "audio/wav",
  });
}
