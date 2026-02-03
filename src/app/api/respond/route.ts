import { NextResponse } from "next/server";

const SAMPLE_REPLY =
  "Copy. Holding pattern. Returning latest telemetry and locking perimeter.";

const makeBeepBase64 = () => {
  const sampleRate = 16000;
  const durationSeconds = 0.25;
  const freq = 440;
  const samples = Math.floor(sampleRate * durationSeconds);

  const header = Buffer.alloc(44);
  const data = Buffer.alloc(samples * 2);

  let offset = 0;
  const wstr = (s: string) => {
    header.write(s, offset, "ascii");
    offset += s.length;
  };
  const w16 = (v: number) => {
    header.writeUInt16LE(v, offset);
    offset += 2;
  };
  const w32 = (v: number) => {
    header.writeUInt32LE(v, offset);
    offset += 4;
  };

  wstr("RIFF");
  w32(36 + data.length);
  wstr("WAVE");
  wstr("fmt ");
  w32(16);
  w16(1); // PCM
  w16(1); // mono
  w32(sampleRate);
  w32(sampleRate * 2); // byte rate
  w16(2); // block align
  w16(16); // bits per sample
  wstr("data");
  w32(data.length);

  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const sample = Math.floor(Math.sin(2 * Math.PI * freq * t) * 0.25 * 32767);
    data.writeInt16LE(sample, i * 2);
  }

  const wav = Buffer.concat([header, data]);
  return wav.toString("base64");
};

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({
    reply: SAMPLE_REPLY,
    audio_base64: makeBeepBase64(),
    media_type: "audio/wav",
  });
}
