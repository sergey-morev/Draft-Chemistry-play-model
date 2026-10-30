import { playElementSound, playReactionSound } from "../audio/sound.js";
import { elementProfile, elementStateDescription, elementStudyTips, elementStudyUse } from "../chemistry/elements.js";
import { moleculeCenter } from "./camera.js";
import { makeSvg } from "./renderer.js";
import { getElement } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { effectLayer, reactionFlash, stageWrap } from "../ui/dom.js";
import { logReaction, reactionResult } from "../ui/journal.js";
import { escapeHtml, stabilityColor } from "../utils/format.js";

export function triggerElementFeedback(atom, reason = "add") {
  if (!atom) return;
  const element = getElement(atom.symbol);
  const profile = elementProfile(element);
  triggerElementVisual(atom, profile, reason);
  playElementSound(element, profile.kind);
  logReaction(reactionResult(true, `${element.name}: ${profile.label}`, elementStateDescription(element), {
    uses: elementStudyUse(element),
    advice: elementStudyTips(element)
  }), labState.lastAnalysis, labState.lastAnalysis);
}

export function triggerElementVisual(atom, profile, reason = "add") {
  if (!effectLayer) return;
  effectLayer.innerHTML = "";
  const color = profile.color;
  const label = makeSvg("text", {
    class: `element-effect-label ${profile.kind}`,
    x: atom.x,
    y: Math.max(42, atom.y - 72),
    fill: color
  });
  label.textContent = profile.label;
  effectLayer.appendChild(label);

  const count = profile.kind === "radioactive" ? 30 : profile.kind === "gas" ? 22 : profile.kind === "liquid" ? 18 : 14;
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * i / count;
    const radius = 30 + (i % 4) * 12;
    const particle = makeSvg("circle", {
      class: `element-particle ${profile.kind}`,
      cx: atom.x + Math.cos(angle) * radius,
      cy: atom.y + Math.sin(angle) * radius,
      r: profile.kind === "metal" ? 3.5 : 3,
      fill: color,
      style: `--dx:${Math.cos(angle) * (profile.kind === "gas" ? 92 : 58)}px;--dy:${Math.sin(angle) * (profile.kind === "gas" ? 92 : 58)}px;--delay:${i * 18}ms`
    });
    effectLayer.appendChild(particle);
  }
  window.setTimeout(() => {
    if (effectLayer) effectLayer.innerHTML = "";
  }, 1200);
}

export function triggerNuclearVisual() {
  const uraniumAtoms = labState.atoms.filter((atom) => atom.symbol === "U").slice(0, 4);
  if (!effectLayer || !uraniumAtoms.length) return;
  uraniumAtoms.forEach((atom, atomIndex) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI * 2 * i / 12 + atomIndex * 0.4;
      const neutron = makeSvg("circle", {
        class: "neutron-dot",
        cx: atom.x,
        cy: atom.y,
        r: 4,
        fill: "#47d6ff",
        style: `--dx:${Math.cos(angle) * 160}px;--dy:${Math.sin(angle) * 160}px;--delay:${i * 35}ms`
      });
      effectLayer.appendChild(neutron);
    }
  });
}

export function triggerReactionEffect(analysis, result) {
  const state = result?.success ? stabilityState(analysis?.score || 0) : "blocked";
  const color = result?.success ? stabilityColor(analysis?.score || 0) : "#657281";
  const center = moleculeCenter();
  playReactionSound(result, state);
  if (effectLayer) {
    effectLayer.innerHTML = "";

    const wave = makeSvg("circle", {
      class: `reaction-wave ${state}`,
      cx: center.x,
      cy: center.y,
      r: 34,
      stroke: color
    });
    effectLayer.appendChild(wave);

    const label = makeSvg("text", {
      class: `reaction-float-label ${state}`,
      x: center.x,
      y: Math.max(50, center.y - 120),
      fill: color
    });
    label.textContent = effectLabel(state);
    effectLayer.appendChild(label);

    const particleCount = state === "unstable" ? 32 : state === "tense" ? 24 : state === "blocked" ? 14 : 22;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.PI * 2 * i / particleCount;
      const radius = 52 + (i % 5) * 13;
      const particle = makeSvg("circle", {
        class: `reaction-particle ${state}`,
        cx: center.x + Math.cos(angle) * radius,
        cy: center.y + Math.sin(angle) * radius,
        r: state === "unstable" ? 5 : 4,
        fill: color,
        style: `--dx:${Math.cos(angle) * (state === "unstable" ? 118 : 72)}px;--dy:${Math.sin(angle) * (state === "unstable" ? 118 : 72)}px;--delay:${i * 14}ms`
      });
      effectLayer.appendChild(particle);
    }
  }

  if (reactionFlash) {
    reactionFlash.className = `reaction-flash show ${state}`;
    reactionFlash.innerHTML = `<strong>${escapeHtml(effectLabel(state))}</strong><span>${escapeHtml(result?.title || "reaction")}</span>`;
    window.setTimeout(() => {
      reactionFlash.className = "reaction-flash";
      reactionFlash.innerHTML = "";
    }, 1150);
  }

  if (stageWrap) {
    stageWrap.classList.remove("effect-stable", "effect-tense", "effect-unstable", "effect-blocked");
    stageWrap.classList.add(`effect-${state}`);
    window.setTimeout(() => stageWrap.classList.remove(`effect-${state}`), 900);
  }
  window.setTimeout(() => {
    if (effectLayer) effectLayer.innerHTML = "";
  }, 1200);
}

export function effectLabel(state) {
  if (state === "stable") return "model-consistent";
  if (state === "tense") return "model strain flagged";
  if (state === "unstable") return "model warnings";
  return "no reaction";
}

export function stabilityState(score) {
  if (score >= 66) return "stable";
  if (score >= 44) return "tense";
  return "unstable";
}
