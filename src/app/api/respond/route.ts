import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_VOICE_ID = "nuzVc5hpXBWZjFEe4izg"; // male, Mexican accent
const SYSTEM_PROMPT =
  "You are GBird, an intelligent airborne assistant. Respond ONLY in strict JSON with keys: reply (string) and sfx (one of \"none\",\"alert\",\"alarm\",\"siren\"). Keep reply crisp, factual, under 80 words. Use provided telemetry for precise status, location, and route guidance. If asked for status, include battery, distance, altitude, and safety. If asked for location, include lat/lng/heading. Ask at most one clarifying question if needed. Avoid stereotypes and slang unless the user uses it first. If a cop is seen or mentioned, set sfx to \"siren\".";

type TelemetryContext = {
  opsMode?: string;
  route?: string;
  botStats?: {
    battery?: number;
    reserveBattery?: number;
    distanceMeters?: number;
    uptimeMinutes?: number;
    altitudeFeet?: number;
  };
  position?: {
    lat?: number;
    lng?: number;
    heading?: number;
  };
  deviceBattery?: number | null;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type GroqResult = { reply: string; sfx: "none" | "alert" | "alarm" | "siren" };

const formatStatus = (context?: TelemetryContext) => {
  const stats = context?.botStats;
  const battery = stats?.battery;
  const distance = stats?.distanceMeters;
  const altitude = stats?.altitudeFeet;
  const heading = context?.position?.heading;
  const safety = battery !== undefined && battery <= 10 ? "Critical" : "Nominal";
  const parts = [
    battery !== undefined ? `Batt ${battery}%` : null,
    distance !== undefined ? `Dist ${distance}m` : null,
    altitude !== undefined ? `Alt ${altitude}ft` : null,
    heading !== undefined ? `Hdg ${heading}deg` : null,
    context?.opsMode ? `Mode ${context.opsMode}` : null,
    context?.route ? `Route ${context.route}` : null,
    `Safe ${safety}`,
  ].filter(Boolean);
  return parts.length ? `Status - ${parts.join(" | ")}` : "";
};

async function callGroq(
  transcript: string,
  context?: TelemetryContext,
  history?: HistoryMessage[]
): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  const contextLine = context ? `Telemetry context: ${JSON.stringify(context)}.` : "Telemetry context: none.";
  const safeHistory =
    history?.filter((item) => item.role && item.content).slice(-12) ?? [];

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "groq/compound",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextLine },
        ...safeHistory,
        { role: "user", content: transcript },
      ],
      temperature: 0.3,
      max_tokens: 160,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Groq error: ${detail}`);
  }
  const data = (await resp.json()) as {
    choices?: { message: { content: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Groq returned no reply");
  try {
    const parsed = JSON.parse(content) as GroqResult;
    if (!parsed.reply) throw new Error("Missing reply");
    if (!parsed.sfx) parsed.sfx = "none";
    const status = formatStatus(context);
    if (status) parsed.reply = `${parsed.reply}\n${status}`;
    return parsed;
  } catch {
    const status = formatStatus(context);
    return { reply: status ? `${content}\n${status}` : content, sfx: "none" };
  }
}

async function callElevenLabsTTS(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");

  const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.55, similarity_boost: 0.8 },
      output_format: "mp3_22050_32",
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`ElevenLabs error: ${detail}`);
  }

  const arrayBuf = await resp.arrayBuffer();
  const b64 = Buffer.from(arrayBuf).toString("base64");
  return { audio_base64: b64, media_type: "audio/mpeg" };
}

export async function POST(request: Request) {
  let transcript: string | undefined;
  let context: TelemetryContext | undefined;
  let history: HistoryMessage[] | undefined;
  try {
    const body = (await request.json()) as {
      transcript?: string;
      context?: TelemetryContext;
      history?: HistoryMessage[];
    };
    transcript = body.transcript?.trim();
    context = body.context;
    history = body.history;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!transcript || transcript.length < 2) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  try {
    const groq = await callGroq(transcript, context, history);
    const tts = await callElevenLabsTTS(groq.reply);
    return NextResponse.json({
      reply: groq.reply,
      sfx: groq.sfx,
      audio_base64: tts.audio_base64,
      media_type: tts.media_type,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
