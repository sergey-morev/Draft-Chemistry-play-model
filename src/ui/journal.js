import { stabilityState } from "../render/effects.js";
import { reactionLog } from "./dom.js";
import { escapeHtml, stabilityText } from "../utils/format.js";

export function reactionResult(success, title, summary, details = {}) {
  return {
    success,
    title,
    summary,
    equation: details.equation || "",
    uses: details.uses || "",
    advice: details.advice || []
  };
}

export function logReaction(result, before = null, after = null) {
  if (!result || typeof result === "string") {
    reactionLog.textContent = result || "";
    return;
  }

  const state = after ? stabilityState(after.score) : "stable";
  const beforeFormula = before?.formula || "—";
  const afterFormula = after?.formula || "—";
  const advice = buildReactionAdvice(after, result);
  const equation = result.equation ? `<div class="reaction-equation">${escapeHtml(result.equation)}</div>` : "";
  const uses = result.uses ? `<p>${escapeHtml(result.uses)}</p>` : "";
  const formulaChange = beforeFormula === afterFormula ? afterFormula : `${beforeFormula} -> ${afterFormula}`;

  reactionLog.innerHTML = `
    <article class="reaction-card ${result.success ? state : "blocked"}">
      <div class="reaction-card-head">
        <strong>${escapeHtml(result.title)}</strong>
        <span>${result.success ? stabilityText(after?.score || 0) : "not performed"}</span>
      </div>
      <p>${escapeHtml(result.summary)}</p>
      ${equation}
      <div class="reaction-formula">${escapeHtml(formulaChange)}</div>
      ${uses}
      <ul>${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  `;
}

export function buildReactionAdvice(analysis, result) {
  const advice = [...(result.advice || [])];
  if (!analysis) return advice.slice(0, 5);

  const overValence = [...analysis.atomMap.values()].find((report) => report.usage > Math.max(...report.allowedValences) + 0.05);
  const charged = [...analysis.atomMap.values()].find((report) => report.atom.charge !== 0);
  const underFilled = [...analysis.atomMap.values()].find((report) => report.state === "warn" && report.implicitH === 0);
  const polarIssue = analysis.issues.find((issue) => issue.title.includes("strongly polar bond"));

  if (analysis.score >= 86) {
    advice.push("The model's heuristic score is high; try adding functional groups and compare the displayed polarity.");
  } else if (analysis.score >= 66) {
    advice.push("The heuristic score is intermediate; check drawn bond lengths and use Relax graph layout.");
  } else if (analysis.score >= 44) {
    advice.push("The model flags strain; reduce overloaded bond orders or add H at available valences.");
  } else {
    advice.push("The heuristic score is low; remove excess bonds, then review charge for the intended structure.");
  }

  if (overValence) {
    advice.push(`${overValence.atom.symbol}${overValence.atom.id}: lower a bond order or remove an extra substituent.`);
  }
  if (charged) {
    advice.push(`${charged.atom.symbol}${charged.atom.id}: use +/− to adjust charge if appropriate for the intended structure.`);
  }
  if (underFilled) {
    advice.push(`${underFilled.atom.symbol}${underFilled.atom.id}: add H or make a bond to a suitable atom.`);
  }
  if (polarIssue) {
    advice.push("Strongly polar bonds may affect the model's heuristic score; polarity alone does not establish reactivity.");
  }
  if (analysis.aromaticRings > 0) {
    advice.push("The model marks this ring as aromatic; try adding substituents at available C-H positions.");
  }
  if ((analysis.counts.D || 0) + (analysis.counts.T || 0) > 0) {
    advice.push("In this model, D/T settings change displayed mass and label placement without adding valence.");
  }

  return [...new Set(advice)].slice(0, 5);
}
