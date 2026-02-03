"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import styles from "./page.module.css";

const quickCommands = ["Transcend", "Omniscient", "Reality", "Divine"];
const autopilotRoutes = ["Orbit", "Grid sweep", "Perimeter"];
const telemetry = [
  { label: "Battery", value: "78%" },
  { label: "Signal", value: "98%" },
  { label: "GPS", value: "Locked" },
];
const missionLog = [
  { time: "21:04", text: "Voice link established." },
  { time: "21:07", text: "Perimeter sweep complete." },
  { time: "21:11", text: "Target tagged. Holding." },
];
const autopilotClips = [
  {
    id: "wooden-gate",
    title: "Wooden Gate Approach",
    file: "/clips/wooden-gate.mp4",
    note: "Forward crawl toward the gate, ~30-40 ft hover.",
  },
  {
    id: "alley-sweep",
    title: "Alley Sweep",
    file: "/clips/alley.mp4",
    note: "Lateral drift down alley, steady altitude for clearance.",
  },
  {
    id: "alley-zoom",
    title: "Alley Zoom (Red Lens)",
    file: "/clips/alley-zoom.mp4",
    note: "Red lens zoom on subject in alley; slow push-in with focus.",
  },
  {
    id: "red-lens-overlook",
    title: "Red Lens Overlook",
    file: "/clips/red-lens-overlook.mp4",
    note: "Thermal-style red lens, fence hop with backyard overview.",
  },
  {
    id: "red-lens-left-pan",
    title: "Red Lens Left Pan",
    file: "/clips/red-lens-left-pan.mp4",
    note: "Rotates left ~90 deg while overlooking a backyard in red lens.",
  },
  {
    id: "street-corner-scan",
    title: "Street Corner Scan",
    file: "/clips/street-corner-scan.mp4",
    note: "Looking around a light pole from above before someone enters the corner.",
  },
];

const perchClips = [
  {
    id: "perch-neighborhood",
    title: "Perch – Neighborhood",
    file: "/clips/perch-neighborhood.mp4",
    note: "Low perch over wood fences and backyards in a quiet block.",
  },
  {
    id: "wooden-gate",
    title: "Wooden Gate Approach",
    file: "/clips/wooden-gate.mp4",
    note: "Forward crawl toward the gate, ~30-40 ft hover.",
  },
  {
    id: "red-lens-left-pan",
    title: "Red Lens Left Pan",
    file: "/clips/red-lens-left-pan.mp4",
    note: "Rotates left ~90 deg while overlooking a backyard in red lens.",
  },
];

export default function PageClient() {
  const [nav, setNav] = useState<"home" | "voice" | "vision" | "logs">("home");
  const [opsMode, setOpsMode] = useState<"Autopilot" | "Perch">("Autopilot");
  const [route, setRoute] = useState<string>("Orbit");
  const [liveTranscript, setLiveTranscript] = useState<string>(
    '"Sweep the alley. Lock target. Hold altitude."'
  );
  const [recording, setRecording] = useState<boolean>(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [groqError, setGroqError] = useState<string | null>(null);
  const [replyAudioUrl, setReplyAudioUrl] = useState<string | null>(null);
  const [commsInput, setCommsInput] = useState<string>("");
  const [commsLog, setCommsLog] = useState<
    { from: "GBird" | "You"; text: string; time: string }[]
  >([
    {
      from: "GBird",
      text: "Comms online. Awaiting mission directives.",
      time: "21:00",
    },
  ]);

  const homeRef = useRef<HTMLDivElement | null>(null);
  const voiceRef = useRef<HTMLDivElement | null>(null);
  const visionRef = useRef<HTMLDivElement | null>(null);
  const logsRef = useRef<HTMLDivElement | null>(null);

  const heroClip = useMemo(() => "/clips/red-lens-overlook.mp4", []);
  const visionClip = useMemo(
    () => (opsMode === "Perch" ? "/clips/perch-neighborhood.mp4" : "/clips/alley-zoom.mp4"),
    [opsMode]
  );
  const galleryClips = opsMode === "Perch" ? perchClips : autopilotClips;

  const appendComms = (entry: { from: "GBird" | "You"; text: string }) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCommsLog((prev) => [...prev, { ...entry, time }]);
  };

  const handleQuickCommand = (cmd: string) => {
    const text = `${cmd} acknowledged. Executing now.`;
    setLiveTranscript(`"${text}"`);
    appendComms({ from: "You", text: cmd });
    appendComms({ from: "GBird", text });
  };

  const handleSaveToHome = () => {
    if (typeof window !== "undefined") {
      window.alert('Use your browser "Add to Home Screen" to pin GBird.');
    }
  };

  const handleCommsChip = (text: string) => {
    appendComms({ from: "You", text });
    const ack = "On it. Cycling tasking and reporting back.";
    appendComms({ from: "GBird", text: ack });
    setLiveTranscript(`"${ack}"`);
  };

  const handleCommsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = commsInput.trim();
    if (!trimmed) return;
    appendComms({ from: "You", text: trimmed });
    const ack = "Received. Executing and will advise.";
    appendComms({ from: "GBird", text: ack });
    setLiveTranscript(`"${ack}"`);
    setCommsInput("");
  };

  const scrollToSection = (key: typeof nav) => {
    const map = {
      home: homeRef,
      voice: voiceRef,
      vision: visionRef,
      logs: logsRef,
    } as const;
    const ref = map[key];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setNav(key);
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  };

  const startRecording = async () => {
    if (recording) return;
    if (typeof window === "undefined") return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
    if (!stream) {
      setLiveTranscript("Mic unavailable. Check permissions.");
      return;
    }
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const form = new FormData();
      form.append("file", blob, "speech.webm");
      setLiveTranscript("Transcribing...");
      setGroqError(null);
      if (replyAudioUrl) {
        URL.revokeObjectURL(replyAudioUrl);
        setReplyAudioUrl(null);
      }
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok || !data.text) {
          throw new Error(data.error || "Transcription failed");
        }
        setLiveTranscript(data.text);

        const respond = await fetch("/api/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: data.text }),
        });
        const rjson = (await respond.json()) as {
          reply?: string;
          audio_base64?: string;
          media_type?: string;
          error?: string;
        };
        if (!respond.ok || !rjson.reply || !rjson.audio_base64) {
          throw new Error(rjson.error || "Groq/Elevens response failed");
        }
        setLiveTranscript(rjson.reply);
        const buf = Uint8Array.from(atob(rjson.audio_base64), (c) => c.charCodeAt(0));
        const audioBlob = new Blob([buf], { type: rjson.media_type ?? "audio/mpeg" });
        const url = URL.createObjectURL(audioBlob);
        setReplyAudioUrl(url);
        const audio = new Audio(url);
        audio.play().catch(() => null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transcription error";
        setLiveTranscript(msg);
        setGroqError(msg);
      }
    };
    setRecorder(mediaRecorder);
    setRecording(true);
    mediaRecorder.start();
  };

  return (
    <main className={styles.birdApp}>
      <div className={styles.birdAppBg} aria-hidden>
        <span className={`${styles.birdOrb} ${styles.orbOne}`}></span>
        <span className={`${styles.birdOrb} ${styles.orbTwo}`}></span>
        <span className={`${styles.birdOrb} ${styles.orbThree}`}></span>
        <span className={styles.birdGrid}></span>
      </div>

      <div className={styles.birdDevice} ref={homeRef}>
        <div className={styles.statusbar}>
          <span className={styles.statusTime}>9:41</span>
          <span className={styles.statusRight}>5G | 78%</span>
        </div>

        <header className={styles.header}>
          <div className={styles.coreWrap}>
            <video
              className={styles.coreVideo}
              src={heroClip}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              aria-label="GBird core feed"
            />
            <span className={styles.coreGlow} aria-hidden></span>
          </div>
          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <p className={styles.kicker}>GBird</p>
              <h1>Field Ops</h1>
              <p className={styles.sub}>Robot demo - Voice + Vision</p>
            </div>
            <button
              type="button"
              className={styles.saveButton}
              aria-label="Save to home screen"
              onClick={handleSaveToHome}
            >
              Save to Home
            </button>
          </div>
          <div className={styles.statusPills}>
            <span className={`${styles.badge} ${styles.live}`}>Live</span>
            <span className={styles.badge}>Secure</span>
            <span className={styles.badge}>Sync</span>
          </div>
        </header>

        <section className={`${styles.card} ${styles.visionCard}`} ref={visionRef}>
          <div className={styles.cardHead}>
            <p className={styles.cardKicker}>Vision feed</p>
            <span className={styles.pill}>Active</span>
          </div>
          <div className={styles.visionFrame}>
            <video
              className={styles.visionVideo}
              src={visionClip}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              aria-label="GBird vision forward view"
              onTimeUpdate={(event) => {
                if (opsMode === "Perch" && event.currentTarget.currentTime > 4) {
                  event.currentTarget.currentTime = 0;
                }
              }}
            />
            <span className={styles.visionGrid} aria-hidden></span>
            <span className={styles.visionScan} aria-hidden></span>
            <span className={styles.visionTarget} aria-hidden></span>
            <div className={styles.visionLabel}>
              <span>Autopilot</span>
              <span>Forward</span>
            </div>
          </div>
          <div className={styles.metricsRow}>
            <div className={styles.metricTile}>
              <span>Objects</span>
              <strong>12</strong>
            </div>
            <div className={styles.metricTile}>
              <span>Threat</span>
              <strong>Low</strong>
            </div>
            <div className={styles.metricTile}>
              <span>FPS</span>
              <strong>30</strong>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.opsCard}`}>
          <div className={styles.cardHead}>
            <p className={styles.cardKicker}>Ops mode</p>
            <div className={styles.opsToggle} role="tablist" aria-label="Ops mode">
              {["Autopilot", "Perch"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`${styles.chip} ${opsMode === mode ? styles.isActive : ""}`}
                  aria-pressed={opsMode === mode}
                  onClick={() => setOpsMode(mode as typeof opsMode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.opsPanel}>
            <div className={styles.opsStatus}>
              <span className={styles.opsLabel}>Route</span>
              <span className={styles.opsValue}>{route}</span>
            </div>
            <div className={styles.commandRow}>
              {autopilotRoutes.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.chip} ${route === option ? styles.isActive : ""}`}
                  aria-pressed={route === option}
                  onClick={() => setRoute(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className={styles.helper}>Autopilot cycles the camera feed on a loop.</p>
          </div>
        </section>

        <section className={`${styles.card} ${styles.voiceCard}`} ref={voiceRef}>
          <div className={styles.cardHead}>
            <p className={styles.cardKicker}>Voice control</p>
            <span className={styles.pill}>Ready</span>
          </div>
          <div className={styles.voiceRow}>
            <button
              className={styles.talkButton}
              type="button"
              aria-pressed={recording}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              {recording ? "Listening..." : "Hold to talk"}
            </button>
            <div className={styles.voiceBars} aria-hidden>
              <span className={`${styles.voiceBar} ${styles.bar1}`}></span>
              <span className={`${styles.voiceBar} ${styles.bar2}`}></span>
              <span className={`${styles.voiceBar} ${styles.bar3}`}></span>
              <span className={`${styles.voiceBar} ${styles.bar4}`}></span>
            </div>
          </div>
          <div className={styles.transcript}>
            <span className={styles.transcriptLabel}>Live transcript</span>
            <p>{liveTranscript}</p>
          </div>
          <div className={styles.commandRow}>
            {quickCommands.map((cmd) => (
              <button key={cmd} className={styles.chip} type="button" onClick={() => handleQuickCommand(cmd)}>
                {cmd}
              </button>
            ))}
          </div>
        </section>

        <section className={`${styles.card} ${styles.commsCard}`}>
          <div className={styles.cardHead}>
            <p className={styles.cardKicker}>Comms link</p>
            <span className={styles.pill}>Connected</span>
          </div>
          <div className={styles.keyRow}>
            <label className={styles.keyLabel} htmlFor="groq-key">
              Groq API key
            </label>
            <input
              id="groq-key"
              className={styles.input}
              type="password"
              placeholder="gsk_..."
              autoComplete="off"
            />
            <p className={styles.helper}>
              Stored locally. Required for live Groq comms.{" "}
              <a
                className={styles.link}
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
              >
                Get a Groq API key
              </a>
            </p>
          </div>
          {groqError ? (
            <div
              className={styles.commsBubble}
              style={{ borderColor: "rgba(255,107,53,0.5)", background: "rgba(255,107,53,0.12)" }}
            >
              <span className={styles.commsName}>Groq</span>
              <p>{groqError}</p>
            </div>
          ) : null}
          <div className={styles.commsLog} aria-live="polite">
            {commsLog.map((entry, index) => (
              <div
                key={`${entry.time}-${index}-${entry.from}`}
                className={`${styles.commsBubble} ${
                  entry.from === "GBird" ? styles.assistant : styles.user
                }`}
              >
                <div className={styles.commsBubbleHead}>
                  <span className={styles.commsName}>{entry.from}</span>
                  <span className={styles.commsTime}>{entry.time}</span>
                </div>
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
          <div className={`${styles.commandRow} ${styles.commsActions}`}>
            <button
              type="button"
              className={`${styles.chip} ${styles.ghost}`}
              onClick={() =>
                handleCommsChip("Autopilot sweep: report anomalies and heat signatures.")
              }
            >
              Autopilot sweep: report anomalies and heat signatures.
            </button>
            <button
              type="button"
              className={`${styles.chip} ${styles.ghost}`}
              onClick={() => handleCommsChip("Hold patrol loop and confirm perimeter status.")}
            >
              Hold patrol loop and confirm perimeter status.
            </button>
            <button
              type="button"
              className={`${styles.chip} ${styles.ghost}`}
              onClick={() => handleCommsChip("Cycle the block and return a concise mission update.")}
            >
              Cycle the block and return a concise mission update.
            </button>
          </div>
          <form className={styles.commsForm} onSubmit={handleCommsSubmit}>
            <input
              className={styles.input}
              type="text"
              placeholder="Send a command..."
              value={commsInput}
              onChange={(event) => setCommsInput(event.target.value)}
            />
            <button className={styles.sendButton} type="submit">
              Send
            </button>
          </form>
        </section>

        <section className={styles.telemetryGrid}>
          {telemetry.map((item) => (
            <div key={item.label} className={styles.telemetryItem}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        <section className={`${styles.card} ${styles.missionCard}`} ref={logsRef}>
          <div className={styles.cardHead}>
            <p className={styles.cardKicker}>Mission log</p>
            <span className={styles.pill}>Synced</span>
          </div>
          <ul className={styles.missionList}>
            {missionLog.map((entry) => (
              <li key={entry.time}>
                <span className={styles.missionTime}>{entry.time}</span>
                <span className={styles.missionText}>{entry.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.card} ${styles.galleryCard}`}>
          <div className={styles.cardHead}>
            <p className={styles.cardKicker}>Captured clips</p>
            <span className={styles.pill}>{fieldClips.length} feeds</span>
          </div>
          <div className={styles.galleryGrid}>
            {fieldClips.map((clip) => (
              <div key={clip.id} className={styles.galleryItem}>
                <video
                  className={styles.galleryVideo}
                  src={clip.file}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={clip.title}
                />
                <div className={styles.galleryMeta}>
                  <h3>{clip.title}</h3>
                  <p>{clip.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <nav className={styles.nav} aria-label="Primary">
          {[
            { key: "home", label: "Home" },
            { key: "voice", label: "Voice" },
            { key: "vision", label: "Vision" },
            { key: "logs", label: "Logs" },
          ].map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${nav === item.key ? styles.isActive : ""}`}
              type="button"
              aria-pressed={nav === item.key}
              onClick={() => scrollToSection(item.key as typeof nav)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
