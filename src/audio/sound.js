import { elementProfile } from "../chemistry/elements.js";
import { audioFiles } from "../config.js";
import { state as labState } from "../state.js";
import { audioToggleButton } from "../ui/dom.js";

export function toggleAudio() {
  labState.audioEnabled = !labState.audioEnabled;
  let ctx = null;
  if (labState.audioEnabled) ctx = ensureAudioContext();
  audioToggleButton.innerHTML = `<i data-lucide="${labState.audioEnabled ? "volume-2" : "volume-x"}"></i>`;
  audioToggleButton.setAttribute("aria-pressed", String(labState.audioEnabled));
  audioToggleButton.title = labState.audioEnabled ? "Выключить звук" : "Включить звук";
  window.lucide?.createIcons();
  audioToggleButton.classList.toggle("is-active", labState.audioEnabled);
  if (labState.audioEnabled && ctx) playSoftClick(ctx);
}

export function ensureAudioContext() {
  if (!labState.audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      labState.audioEnabled = false;
      return null;
    }
    labState.audioContext = new AudioCtor();
  }
  if (labState.audioContext.state === "suspended") labState.audioContext.resume();
  return labState.audioContext;
}

export function playElementSound(element, kind = elementProfile(element).kind) {
  if (!labState.audioEnabled) return;
  if (playAudioFile(audioFiles[kind])) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (kind === "radioactive" || kind === "nuclear") return playRadiationTicks(ctx);
  if (kind === "gas") return playGasHiss(ctx);
  if (kind === "liquid") return playLiquidDrop(ctx);
  if (kind === "metal") return playMetalPing(ctx);
  return playSoftClick(ctx);
}

export function playReactionSound(result, state) {
  if (!labState.audioEnabled || !result?.success) return;
  const title = `${result.title || ""} ${result.equation || ""}`.toLowerCase();
  if (title.includes("горен") || title.includes("combust")) {
    if (playAudioFile(audioFiles.combustion)) return;
  } else if (title.includes("катализ") || title.includes("catalyst")) {
    if (playAudioFile(audioFiles.catalyst)) return;
  } else if (title.includes("u-демо") || title.includes("ядер")) {
    if (playAudioFile(audioFiles.nuclear)) return;
  } else if (playAudioFile(audioFiles.reaction)) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (state === "unstable") playRadiationTicks(ctx);
  else playSoftClick(ctx);
}

export function playAudioFile(src) {
  if (!src || typeof Audio === "undefined") return false;
  try {
    const sound = new Audio(src);
    sound.volume = 0.42;
    sound.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function playMetalPing(ctx) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(620, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.24);
}

export function playGasHiss(ctx) {
  playNoise(ctx, 0.22, 0.025, 900, 0.18);
}

export function playLiquidDrop(ctx) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.16);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.24);
}

export function playRadiationTicks(ctx) {
  for (let i = 0; i < 9; i++) {
    window.setTimeout(() => playNoise(ctx, 0.025, 0.055, 2600, 0.04), i * 55 + Math.random() * 35);
  }
}

export function playSoftClick(ctx) {
  playNoise(ctx, 0.04, 0.03, 1200, 0.035);
}

export function playNoise(ctx, duration, volume, frequency, decay) {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 4;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (decay || duration));
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + duration);
}
