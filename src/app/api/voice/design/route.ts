import { NextResponse } from "next/server";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-voice/design";
const BLOCKED_TERMS = [
  "chicano",
  "mexican",
  "latino",
  "latina",
  "hispanic",
  "mexicali",
  "cholo",
  "gangster",
];

export const runtime = "nodejs";

type DesignRequest = {
  voice_description?: string;
  text?: string | null;
  model_id?: string;
  auto_generate_text?: boolean;
  output_format?: string;
  seed?: number;
  guidance_scale?: number;
  loudness?: number;
  quality?: number;
  stream_previews?: boolean;
};

const hasBlockedTerm = (input: string) => {
  const normalized = input.toLowerCase();
  return BLOCKED_TERMS.some((term) => normalized.includes(term));
};

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY on the server." },
      { status: 500 }
    );
  }

  let payload: DesignRequest;
  try {
    payload = (await request.json()) as DesignRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.voice_description || payload.voice_description.trim().length < 20) {
    return NextResponse.json(
      { error: "voice_description must be at least 20 characters." },
      { status: 400 }
    );
  }

  if (payload.voice_description.length > 1000) {
    return NextResponse.json(
      { error: "voice_description must be 1000 characters or fewer." },
      { status: 400 }
    );
  }

  if (hasBlockedTerm(payload.voice_description)) {
    return NextResponse.json(
      {
        error:
          "Please describe the voice using neutral traits (pitch, pace, energy, clarity).",
      },
      { status: 400 }
    );
  }

  if (payload.text && (payload.text.length < 100 || payload.text.length > 1000)) {
    return NextResponse.json(
      { error: "text must be between 100 and 1000 characters when provided." },
      { status: 400 }
    );
  }

  const url = new URL(ELEVENLABS_API_URL);
  if (payload.output_format) url.searchParams.set("output_format", payload.output_format);
  if (payload.auto_generate_text !== undefined) {
    url.searchParams.set("auto_generate_text", String(payload.auto_generate_text));
  }
  if (payload.seed !== undefined) url.searchParams.set("seed", String(payload.seed));
  if (payload.guidance_scale !== undefined) {
    url.searchParams.set("guidance_scale", String(payload.guidance_scale));
  }
  if (payload.loudness !== undefined) {
    url.searchParams.set("loudness", String(payload.loudness));
  }
  if (payload.quality !== undefined) {
    url.searchParams.set("quality", String(payload.quality));
  }
  if (payload.stream_previews !== undefined) {
    url.searchParams.set("stream_previews", String(payload.stream_previews));
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      voice_description: payload.voice_description,
      text: payload.text ?? undefined,
      model_id: payload.model_id ?? undefined,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(
      { error: data?.detail ?? data ?? "ElevenLabs request failed." },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
