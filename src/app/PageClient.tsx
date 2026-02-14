"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import styles from "./page.module.css";

type BatteryManager = {
  level: number;
  addEventListener: (type: "levelchange", listener: () => void) => void;
  removeEventListener: (type: "levelchange", listener: () => void) => void;
};

const quickCommands = ["Boulevard sweep", "Palm tree perch", "Low rider roll", "Cut the night"];
const autopilotRoutes = ["Orbit", "Grid sweep", "Perimeter"];
const telemetry = [
  { label: "Battery", value: "78%" },
  { label: "Signal", value: "98%" },
  { label: "GPS", value: "Locked" },
];
const missionLog = [
  { time: "21:04", text: "Boulevard palm tree sway. Eyes up." },
  { time: "21:07", text: "Low riders hop in. Block stays calm." },
  { time: "21:11", text: "Wings cut the night. Respect the signal." },
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
  const [nav, setNav] = useState<"home" | "voice" | "vision" | "logs" | "clips">("home");
  const [opsMode, setOpsMode] = useState<"Autopilot" | "Perch">("Autopilot");
  const [route, setRoute] = useState<string>("Orbit");
  const [manualClip, setManualClip] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>(
    '"That is it. Boulevard palm tree sway. Low riders hop in. Wings cut the night."'
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
      text: "Comms online. Boulevard is talking.",
      time: "21:00",
    },
  ]);

  const defaultVisionClip = useMemo(
    () =>
      opsMode === "Perch"
        ? "/clips/perch-neighborhood.mp4"
        : "https://ghettobirddemo.vercel.app/clips/red-lens-overlook.mp4",
    [opsMode]
  );
  const visionClip = manualClip ?? defaultVisionClip;
  const galleryClips = opsMode === "Perch" ? perchClips : autopilotClips;
  const [botStats, setBotStats] = useState({
    battery: 78,
    reserveBattery: 20,
    distanceMeters: 120,
    uptimeMinutes: 42,
  });
  const [position, setPosition] = useState({ lat: 34.0401, lng: -118.2489, heading: 72 });
  const [devicePosition, setDevicePosition] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [deviceBattery, setDeviceBattery] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmOscRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<number | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [memory, setMemory] = useState<
    { from: "GBird" | "You"; text: string; time: string; mode: "voice" | "comms" }[]
  >([]);
  const perchLine = '"Perched up. Quiet eyes, wide scan. Keeping it tight."';
  const autopilotLine = '"Autopilot rolling. Block in motion. Keep comms live."';

  // Load persisted memory on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("gbird-memory");
    if (saved) {
      try {
        setMemory(JSON.parse(saved));
      } catch {
        setMemory([]);
      }
    }
  }, []);

  // Track device battery (when supported)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let battery: BatteryManager | null = null;
    const sync = () => {
      if (!battery) return;
      setDeviceBattery(Math.round(battery.level * 100));
    };
    nav
      .getBattery()
      .then((bat) => {
        battery = bat;
        sync();
        battery.addEventListener("levelchange", sync);
      })
      .catch(() => null);
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", sync);
      }
    };
  }, []);

  // Persist memory
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("gbird-memory", JSON.stringify(memory.slice(-50)));
  }, [memory]);

  useEffect(
    () => () => {
      if (alarmOscRef.current) {
        alarmOscRef.current.stop();
        alarmOscRef.current.disconnect();
      }
      if (sirenIntervalRef.current) {
        window.clearInterval(sirenIntervalRef.current);
      }
    },
    []
  );

  // Track device location (when supported and permitted)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDevicePosition({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      () => null,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Match voice tone to ops mode
  useEffect(() => {
    if (recording) return;
    setLiveTranscript(opsMode === "Perch" ? perchLine : autopilotLine);
  }, [opsMode, recording]);

  const recordMemory = (entry: { from: "GBird" | "You"; text: string; mode: "voice" | "comms" }) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMemory((prev) => [...prev, { ...entry, time }].slice(-50));
  };

  const refreshStats = () => {
    // lightweight simulated telemetry update
    setBotStats((prev) => {
      const drain = 1 + Math.round(Math.random() * 2);
      let battery = Math.max(0, Math.min(100, prev.battery - drain));
      let reserveBattery = prev.reserveBattery;
      // auto-trigger emergency pack if main battery drops too low
      if (battery <= 5 && reserveBattery > 0) {
        const boost = Math.min(reserveBattery, 25);
        battery = Math.min(100, battery + boost);
        reserveBattery = Math.max(0, reserveBattery - boost);
        appendComms({
          from: "GBird",
          text: "Emergency pack lit. I am not dropping on your watch.",
        });
      }
      const distanceMeters = Math.max(
        30,
        Math.min(500, prev.distanceMeters + Math.round(Math.random() * 20 - 10))
      );
      const uptimeMinutes = prev.uptimeMinutes + 5;
      return { battery, reserveBattery, distanceMeters, uptimeMinutes };
    });
    setPosition((prev) => ({
      lat: Number((prev.lat + (Math.random() - 0.5) * 0.0012).toFixed(4)),
      lng: Number((prev.lng + (Math.random() - 0.5) * 0.0012).toFixed(4)),
      heading: (prev.heading + Math.round(Math.random() * 30 - 15) + 360) % 360,
    }));
  };

  const appendComms = (entry: { from: "GBird" | "You"; text: string }) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCommsLog((prev) => [...prev, { ...entry, time }]);
    recordMemory({ ...entry, mode: "comms" });
  };

  const clipByCommand = (cmd: string) => {
    const map: Record<string, string> = {
      "Boulevard sweep": "/clips/street-corner-scan.mp4",
      "Palm tree perch": "/clips/perch-neighborhood.mp4",
      "Low rider roll": "/clips/wooden-gate.mp4",
      "Cut the night": "/clips/red-lens-overlook.mp4",
      Orbit: "/clips/red-lens-left-pan.mp4",
      "Grid sweep": "/clips/alley.mp4",
      Perimeter: "/clips/alley-zoom.mp4",
    };
    return map[cmd];
  };

  const handleQuickCommand = (cmd: string) => {
    const text = `${cmd}. Wings up.`;
    setLiveTranscript(`"${text}"`);
    const clip = clipByCommand(cmd);
    if (clip) setManualClip(clip);
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
    const ack = "On it. Running the block and circling back.";
    appendComms({ from: "GBird", text: ack });
    setLiveTranscript(`"${ack}"`);
    const clip = clipByCommand("Grid sweep");
    if (clip) setManualClip(clip);
  };

  const handleCommsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = commsInput.trim();
    if (!trimmed) return;
    appendComms({ from: "You", text: trimmed });
    const ack = "Copy. Moving now. I will report back.";
    appendComms({ from: "GBird", text: ack });
    setLiveTranscript(`"${ack}"`);
    const clip = clipByCommand("Perimeter");
    if (clip) setManualClip(clip);
    setCommsInput("");
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  };

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => null);
    }
    return audioCtxRef.current;
  };

  const stopSfx = () => {
    if (alarmOscRef.current) {
      alarmOscRef.current.stop();
      alarmOscRef.current.disconnect();
      alarmOscRef.current = null;
    }
    if (sirenIntervalRef.current) {
      window.clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
  };

  const playAlarm = () => {
    stopSfx();
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    alarmOscRef.current = osc;
  };

  const playAlert = () => {
    stopSfx();
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  const playSiren = () => {
    stopSfx();
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    alarmOscRef.current = osc;
    let up = true;
    sirenIntervalRef.current = window.setInterval(() => {
      osc.frequency.value = up ? 640 : 980;
      up = !up;
    }, 350);
  };

  const renderCommsLog = (limit?: number) => {
    const items = limit ? commsLog.slice(-limit) : commsLog;
    return (
      <div className={styles.commsLog} aria-live="polite">
        {items.map((entry, index) => (
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
    );
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
        recordMemory({ from: "You", text: data.text, mode: "voice" });

        const respond = await fetch("/api/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: data.text,
            context: {
              opsMode,
              route,
              botStats,
              position,
              devicePosition,
              deviceBattery,
            },
          }),
        });
        const rjson = (await respond.json()) as {
          reply?: string;
          audio_base64?: string;
          media_type?: string;
          sfx?: "none" | "alert" | "alarm" | "siren";
          error?: string;
        };
        if (!respond.ok || !rjson.reply || !rjson.audio_base64) {
          throw new Error(rjson.error || "Groq/Elevens response failed");
        }
        setLiveTranscript(rjson.reply);
        recordMemory({ from: "GBird", text: rjson.reply, mode: "voice" });
        if (rjson.sfx === "alert") playAlert();
        if (rjson.sfx === "alarm") playAlarm();
        if (rjson.sfx === "siren") playSiren();
        const buf = Uint8Array.from(atob(rjson.audio_base64), (c) => c.charCodeAt(0));
        const audioBlob = new Blob([buf], { type: rjson.media_type ?? "audio/mpeg" });
        const url = URL.createObjectURL(audioBlob);
        setReplyAudioUrl(url);
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current.currentTime = 0;
        }
        const audio = new Audio(url);
        ttsAudioRef.current = audio;
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

      <div className={styles.birdDevice}>
        <div className={styles.statusbar}>
          <span className={styles.statusTime}>9:41</span>
          <span className={styles.statusRight}>5G | 78%</span>
        </div>

        <header className={styles.header}>
          <div className={styles.coreWrap}>
            <div className={styles.coreData} role="presentation">
              <div className={styles.coreHeader}>
                <p className={styles.kicker}>GBird</p>
                <h2>Ops Data Screen</h2>
              </div>
              <div className={styles.coreGrid}>
                <div className={styles.coreItem}>
                  <span>Mode</span>
                  <strong>{opsMode}</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Route</span>
                  <strong>{route}</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Bot Batt</span>
                  <strong>{botStats.battery}%</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Device</span>
                  <strong>{deviceBattery === null ? "--" : `${deviceBattery}%`}</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Lat</span>
                  <strong>{(devicePosition?.lat ?? position.lat).toFixed(4)}</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Lng</span>
                  <strong>{(devicePosition?.lng ?? position.lng).toFixed(4)}</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Heading</span>
                  <strong>{position.heading}°</strong>
                </div>
                <div className={styles.coreItem}>
                  <span>Uptime</span>
                  <strong>{botStats.uptimeMinutes}m</strong>
                </div>
              </div>
            </div>
            <span className={styles.coreGlow} aria-hidden></span>
          </div>
          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <p className={styles.kicker}>GBird</p>
              <h1>Field Ops</h1>
            <p className={styles.sub}>Block ops demo - Voice + Vision</p>
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

        {nav === "home" ? (
          <>
            <section className={`${styles.card} ${styles.statsCard}`}>
              <div className={styles.cardHead}>
                <p className={styles.cardKicker}>Mission status</p>
                <button type="button" className={styles.ghostButton} onClick={refreshStats}>
                  Refresh
                </button>
              </div>
              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryItem}>
                  <span>Battery</span>
                  <strong>{botStats.battery}%</strong>
                </div>
                <div className={styles.telemetryItem}>
                  <span>Device</span>
                  <strong>{deviceBattery === null ? "--" : `${deviceBattery}%`}</strong>
                </div>
                <div className={styles.telemetryItem}>
                  <span>Emergency reserve</span>
                  <strong>{botStats.reserveBattery}%</strong>
                </div>
                <div className={styles.telemetryItem}>
                  <span>Distance</span>
                  <strong>{botStats.distanceMeters} m</strong>
                </div>
                <div className={styles.telemetryItem}>
                  <span>Uptime</span>
                  <strong>{botStats.uptimeMinutes} min</strong>
                </div>
              </div>
            </section>

            <section className={`${styles.card} ${styles.mapCard}`}>
              <div className={styles.cardHead}>
                <p className={styles.cardKicker}>Live location</p>
                <span className={styles.pill}>Tracking</span>
              </div>
              {devicePosition ? (
                <p className={styles.helper}>
                  Device GPS active • Accuracy {devicePosition.accuracy}m
                </p>
              ) : (
                <p className={styles.helper}>Device GPS unavailable. Showing bot telemetry.</p>
              )}
              <div className={styles.mapFrame} role="img" aria-label="GBird live map">
                <div className={styles.mapGrid} aria-hidden></div>
                <div
                  className={styles.mapPing}
                  style={{ left: "58%", top: "42%" }}
                  aria-hidden
                >
                  <span className={styles.mapPulse}></span>
                </div>
                <div className={styles.mapCoords}>
                  <span>
                    LAT {(devicePosition?.lat ?? position.lat).toFixed(4)}
                  </span>
                  <span>
                    LNG {(devicePosition?.lng ?? position.lng).toFixed(4)}
                  </span>
                  <span>HDG {position.heading}°</span>
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
                      onClick={() => {
                        setRoute(option);
                        const clip = clipByCommand(option);
                        if (clip) setManualClip(clip);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className={styles.helper}>Autopilot runs the feed on a tight loop.</p>
              </div>
            </section>

            <section className={`${styles.card} ${styles.sfxCard}`}>
              <div className={styles.cardHead}>
                <p className={styles.cardKicker}>Sound FX</p>
                <span className={styles.pill}>System</span>
              </div>
              <div className={styles.commandRow}>
                <button type="button" className={styles.chip} onClick={playAlarm}>
                  Alarm
                </button>
                <button type="button" className={styles.chip} onClick={playAlert}>
                  Alert
                </button>
                <button type="button" className={styles.chip} onClick={playSiren}>
                  Siren
                </button>
                <button type="button" className={`${styles.chip} ${styles.ghost}`} onClick={stopSfx}>
                  Stop
                </button>
              </div>
              <p className={styles.helper}>Tap to test alarms. Works best with volume up.</p>
            </section>

            <section className={`${styles.card} ${styles.commsCard}`}>
              <div className={styles.cardHead}>
                <p className={styles.cardKicker}>Quick comms</p>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setNav("logs")}
                >
                  Open comms panel
                </button>
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
              {renderCommsLog(3)}
              <div className={`${styles.commandRow} ${styles.commsActions}`}>
                <button
                  type="button"
                  className={`${styles.chip} ${styles.ghost}`}
                  onClick={() =>
                    handleCommsChip("Boulevard sweep. Call out heat and movement.")
                  }
                >
                  Boulevard sweep. Call out heat and movement.
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${styles.ghost}`}
                  onClick={() =>
                    handleCommsChip("Palm tree perch. Confirm perimeter stays quiet.")
                  }
                >
                  Palm tree perch. Confirm perimeter stays quiet.
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${styles.ghost}`}
                  onClick={() => handleCommsChip("Low rider roll. Send a clean update.")}
                >
                  Low rider roll. Send a clean update.
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
          </>
        ) : null}

        {nav === "vision" ? (
          <section className={`${styles.card} ${styles.visionCard}`}>
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
        ) : null}

        {nav === "voice" ? (
          <section className={`${styles.card} ${styles.voiceCard}`}>
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
        ) : null}

        {nav === "logs" ? (
          <>
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
              {renderCommsLog()}
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

            <section className={`${styles.card} ${styles.memoryCard}`}>
              <div className={styles.cardHead}>
                <p className={styles.cardKicker}>Memory</p>
                <span className={styles.pill}>{memory.length} entries</span>
              </div>
              {memory.length === 0 ? (
                <p className={styles.helper}>No stored conversations yet.</p>
              ) : (
                <ul className={styles.missionList}>
                  {[...memory].reverse().slice(0, 8).map((item, idx) => (
                    <li key={`${item.time}-${idx}`}>
                      <span className={styles.missionTime}>{item.time}</span>
                      <span className={styles.missionText}>
                        {item.from}: {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${styles.card} ${styles.missionCard}`}>
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

            <section className={styles.telemetryGrid}>
              {telemetry.map((item) => (
                <div key={item.label} className={styles.telemetryItem}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {nav === "clips" ? (
          <section className={`${styles.card} ${styles.galleryCard}`}>
            <div className={styles.cardHead}>
              <p className={styles.cardKicker}>Captured clips</p>
              <span className={styles.pill}>{galleryClips.length} feeds</span>
            </div>
            <div className={styles.galleryGrid}>
              {galleryClips.map((clip) => (
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
        ) : null}

        <nav className={styles.nav} aria-label="Primary">
          {[
            { key: "home", label: "Home" },
            { key: "voice", label: "Voice" },
            { key: "vision", label: "Vision" },
            { key: "logs", label: "Logs" },
            { key: "clips", label: "Clips" },
          ].map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${nav === item.key ? styles.isActive : ""}`}
              type="button"
              aria-pressed={nav === item.key}
              onClick={() => setNav(item.key as typeof nav)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
