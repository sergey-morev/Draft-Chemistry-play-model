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
        <span>${result.success ? stabilityText(after?.score || 0) : "не выполнено"}</span>
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
    advice.push("Модель выглядит устойчивой: можно добавлять функциональные группы и сравнивать, как меняется полярность.");
  } else if (analysis.score >= 66) {
    advice.push("Состояние условно стабильное: проверьте длины связей и запустите релаксацию кнопкой ▶.");
  } else if (analysis.score >= 44) {
    advice.push("Молекула напряжена: уменьшите порядок перегруженных связей или добавьте H к свободным валентностям.");
  } else {
    advice.push("Молекула нестабильна: сначала уберите лишние связи, затем нейтрализуйте заряд.");
  }

  if (overValence) {
    advice.push(`${overValence.atom.symbol}${overValence.atom.id}: снизьте порядок одной связи или удалите лишний заместитель.`);
  }
  if (charged) {
    advice.push(`${charged.atom.symbol}${charged.atom.id}: кнопками +/− можно вернуть заряд ближе к 0.`);
  }
  if (underFilled) {
    advice.push(`${underFilled.atom.symbol}${underFilled.atom.id}: добавьте H или создайте связь с подходящим атомом.`);
  }
  if (polarIssue) {
    advice.push("Сильно полярные связи полезны для реакционности, но могут снижать простую оценку стабильности.");
  }
  if (analysis.aromaticRings > 0) {
    advice.push("Ароматическое кольцо стабилизировано делокализацией; заместители лучше добавлять к свободному C-H.");
  }
  if ((analysis.counts.D || 0) + (analysis.counts.T || 0) > 0) {
    advice.push("Изотопное обогащение меняет массу и метку положения, но не добавляет лишнюю валентность.");
  }

  return [...new Set(advice)].slice(0, 5);
}
