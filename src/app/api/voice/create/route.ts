import { NextResponse } from "next/server";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-voice/create";

export const runtime = "nodejs";

type CreateRequest = {
  voice_name?: string;
  voice_description?: string;
  generated_voice_id?: string;
  labels?: Record<string, string>;
  played_not_selected_voice_ids?: string[];
};

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY on the server." },
      { status: 500 }
    );
  }

  let payload: CreateRequest;
  try {
    payload = (await request.json()) as CreateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.voice_name || payload.voice_name.trim().length === 0) {
    return NextResponse.json({ error: "voice_name is required." }, { status: 400 });
  }
  if (!payload.voice_description || payload.voice_description.trim().length === 0) {
    return NextResponse.json({ error: "voice_description is required." }, { status: 400 });
  }
  if (!payload.generated_voice_id || payload.generated_voice_id.trim().length === 0) {
    return NextResponse.json({ error: "generated_voice_id is required." }, { status: 400 });
  }

  const response = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      voice_name: payload.voice_name,
      voice_description: payload.voice_description,
      generated_voice_id: payload.generated_voice_id,
      labels: payload.labels ?? undefined,
      played_not_selected_voice_ids: payload.played_not_selected_voice_ids ?? undefined,
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
