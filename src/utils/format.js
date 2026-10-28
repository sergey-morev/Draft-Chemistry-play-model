

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function nearlyEqual(a, b, epsilon = 0.05) {
  return Math.abs(a - b) <= epsilon;
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.round(value * 100) / 100;
}

export function formatCompactCount(value) {
  if (value >= 1000000) return `${formatNumber(value / 1000000)}M`;
  if (value >= 1000) return `${formatNumber(value / 1000)}k`;
  return String(value);
}

export function signed(value, zero = false) {
  if (value === 0) return zero ? "0" : "";
  return value > 0 ? `+${value}` : String(value);
}

export function bondName(order) {
  if (order === "hbond") return "hydrogen / ion–dipole";
  if (order === "solvation") return "solvation";
  if (order === "ionic") return "ionic";
  if (order === "coordination") return "coordination";
  if (order === "aromatic") return "aromatic";
  if (order === 1) return "single";
  if (order === 2) return "double";
  if (order === 3) return "triple";
  return String(order);
}

export function bondNameShort(order) {
  if (order === "hbond") return "H···";
  if (order === "solvation") return "solv";
  if (order === "ionic") return "ion";
  if (order === "coordination") return "coord";
  if (order === "aromatic") return "⏣";
  return `${order}×`;
}

export function stabilityColor(score) {
  if (score >= 86) return "#2a9d62";
  if (score >= 66) return "#0f8b8d";
  if (score >= 44) return "#d18d00";
  return "#d34b4b";
}

export function stabilityText(score) {
  if (score >= 86) return "high heuristic stability";
  if (score >= 66) return "conditional heuristic stability";
  if (score >= 44) return "strained in model";
  return "low heuristic stability";
}
