"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const DEFAULT_DESCRIPTION =
  "Warm, confident baritone with relaxed cadence, clear diction, and subtle grit. Medium pace, steady energy, professional and reassuring.";

const DEFAULT_TEXT =
  "Control room check. Airspace remains stable and visibility is clear. Maintain altitude at seven point eight thousand feet, hold perimeter scan, and report any anomaly within sector five. Keep comms crisp and steady.";

const PRESETS = [
  {
    name: "Warm & Confident",
    description:
      "Warm, confident baritone with relaxed cadence, clear diction, and subtle grit. Medium pace, steady energy, professional and reassuring.",
    text: DEFAULT_TEXT,
  },
  {
    name: "Bright & Quick",
    description:
      "Bright tenor with crisp diction, upbeat energy, and fast but controlled pace. Friendly and concise, great for alerts.",
    text:
      "Heads up team: quick sweep complete. No anomalies in sectors one through four. Holding pattern and awaiting next directive. Keep channels clear for immediate updates.",
  },
  {
    name: "Calm Bilingual",
    description:
      "Neutral mid‑low pitch, calm and steady, clear consonants, gentle warmth. Comfortable switching between English and Spanish.",
    text:
      "Control update: airspace is stable, alt set at seven point eight thousand. Mantén vigilancia en el perímetro y reporta cualquier cambio de inmediato. Comms must stay clean and calm.",
  },
] as const;

type Preview = {
  generated_voice_id: string;
  audio_base_64: string;
  media_type?: string;
};

type DesignResponse = {
  previews: Preview[];
};

type StoredVoice = {
  voiceId: string;
  name: string;
  description: string;
  generatedVoiceId: string;
  createdAt: string;
};

export default function VoiceLab() {
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [voiceName, setVoiceName] = useState("Ghettobird One");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StoredVoice[]>([]);

  // load history from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("voice-history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored) as StoredVoice[]);
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveHistory = (entry: StoredVoice) => {
    if (typeof window === "undefined") return;
    const nextHistory = [entry, ...history].slice(0, 10);
    setHistory(nextHistory);
    window.localStorage.setItem("voice-history", JSON.stringify(nextHistory));
  };

  const clearHistory = () => {
    if (typeof window === "undefined") return;
    setHistory([]);
    window.localStorage.removeItem("voice-history");
  };

  const canCreate = useMemo(() => Boolean(preview?.generated_voice_id), [preview]);

  const applyPreset = (presetName: (typeof PRESETS)[number]["name"]) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setDescription(preset.description);
    setText(preset.text);
    setVoiceName(preset.name);
  };

  const generatePreview = async () => {
    setStatus("loading");
    setError(null);
    setVoiceId(null);
    setPreview(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const response = await fetch("/api/voice/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_description: description,
          text,
          model_id: "eleven_ttv_v3",
        }),
      });

      const data = (await response.json()) as DesignResponse & { error?: string };
      if (!response.ok || !data.previews?.length) {
        throw new Error(data.error || "Failed to generate preview.");
      }

      const first = data.previews[0];
      setPreview(first);

      const binary = atob(first.audio_base_64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: first.media_type ?? "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error.");
    }
  };

  const createVoice = async () => {
    if (!preview) {
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/voice/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_name: voiceName,
          voice_description: description,
          generated_voice_id: preview.generated_voice_id,
        }),
      });

      const data = (await response.json()) as { voice_id?: string; error?: string };
      if (!response.ok || !data.voice_id) {
        throw new Error(data.error || "Failed to create voice.");
      }

      setVoiceId(data.voice_id);
      setStatus("ready");

      saveHistory({
        voiceId: data.voice_id,
        name: voiceName,
        description,
        generatedVoiceId: preview.generated_voice_id,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error.");
    }
  };

  return (
    <section className={styles.voiceSection}>
      <div className={styles.voiceCard}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Voice lab</p>
            <h2>Design a voice preview</h2>
          </div>
          <span className={styles.panelBadge}>ElevenLabs</span>
        </div>

        <div className={styles.voicePresets}>
          <label className={styles.voiceLabel} htmlFor="voice-preset">
            Presets
          </label>
          <div className={styles.voicePresetRow}>
            <select
              id="voice-preset"
              className={styles.voiceSelect}
              onChange={(event) => applyPreset(event.target.value as typeof PRESETS[number]["name"])}
              defaultValue=""
            >
              <option value="" disabled>
                Select a preset
              </option>
              {PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => applyPreset("Warm & Confident")}
            >
              Reset
            </button>
          </div>
        </div>

        <div className={styles.voiceField}>
          <label className={styles.voiceLabel} htmlFor="voice-description">
            Voice description
          </label>
          <textarea
            id="voice-description"
            className={styles.voiceTextarea}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className={styles.voiceField}>
          <label className={styles.voiceLabel} htmlFor="voice-text">
            Preview script
          </label>
          <textarea
            id="voice-text"
            className={styles.voiceTextarea}
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <div className={styles.voiceRow}>
          <div className={styles.voiceField}>
            <label className={styles.voiceLabel} htmlFor="voice-name">
              Save as voice name
            </label>
            <input
              id="voice-name"
              className={styles.voiceInput}
              value={voiceName}
              onChange={(event) => setVoiceName(event.target.value)}
            />
          </div>
          <div className={styles.voiceActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={generatePreview}
              disabled={status === "loading"}
            >
              Generate preview
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={createVoice}
              disabled={!canCreate || status === "loading"}
            >
              Save to library
            </button>
          </div>
        </div>

        {audioUrl ? (
          <div className={styles.voiceMeta}>
            <span className={styles.voiceBadge}>Preview ready</span>
            <audio className={styles.voiceAudio} controls src={audioUrl} />
          </div>
        ) : null}

        {preview?.generated_voice_id ? (
          <p className={styles.voiceNote}>
            Preview ID: <span>{preview.generated_voice_id}</span>
          </p>
        ) : null}

        {voiceId ? (
          <p className={styles.voiceSuccess}>
            Saved voice ID: <span>{voiceId}</span>
          </p>
        ) : null}

        {error ? <p className={styles.voiceError}>{error}</p> : null}
      </div>

      <div className={styles.voiceHistoryCard}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>Saved voices</p>
            <h2>Recent library adds</h2>
          </div>
          <button type="button" className={styles.ghostButton} onClick={clearHistory} disabled={!history.length}>
            Clear
          </button>
        </div>
        {history.length === 0 ? (
          <p className={styles.voiceNote}>No saved voices yet.</p>
        ) : (
          <ul className={styles.voiceHistoryList}>
            {history.map((item) => (
              <li key={item.voiceId} className={styles.voiceHistoryItem}>
                <div>
                  <p className={styles.voiceHistoryName}>{item.name}</p>
                  <p className={styles.voiceHistoryMeta}>
                    ID: <span>{item.voiceId}</span>
                  </p>
                  <p className={styles.voiceHistoryDesc}>{item.description}</p>
                </div>
                <span className={styles.voiceHistoryDate}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
