import { knownSubstances } from "../data/catalogs.js";
import { elementBySymbol } from "../data/elements.js";
import { getElement } from "../simulation/graph.js";
import { formatNumber, nearlyEqual } from "../utils/format.js";

export function parseFormula(input) {
  const source = normalizeFormulaInput(input);
  if (!source) return { ok: false, error: "Enter a formula." };
  let index = 0;

  function parseGroup(stopChar = "") {
    const counts = {};
    while (index < source.length) {
      const char = source[index];
      if (stopChar && char === stopChar) {
        index++;
        return counts;
      }
      if (char === "(" || char === "[") {
        index++;
        const inner = parseGroup(char === "(" ? ")" : "]");
        const multiplier = readNumber() || 1;
        mergeCounts(counts, inner, multiplier);
        continue;
      }
      if (char === ")" || char === "]") {
        return null;
      }
      if (char === "." || char === "·") {
        index++;
        continue;
      }
      const symbol = readElementSymbol();
      if (!symbol) return null;
      if (!elementBySymbol.has(symbol)) return { error: `Unknown element ${symbol}.` };
      const amount = readNumber() || 1;
      counts[symbol] = (counts[symbol] || 0) + amount;
    }
    if (stopChar) return null;
    return counts;
  }

  function readElementSymbol() {
    const first = source[index];
    if (!/[A-Z]/.test(first || "")) return "";
    let symbol = first;
    index++;
    if (/[a-z]/.test(source[index] || "")) {
      symbol += source[index];
      index++;
    }
    return symbol;
  }

  function readNumber() {
    let text = "";
    while (/[0-9]/.test(source[index] || "")) {
      text += source[index++];
    }
    return text ? Number(text) : 0;
  }

  const counts = parseGroup();
  if (!counts || counts.error) return { ok: false, error: counts?.error || `Could not parse near "${source.slice(index, index + 8)}".` };
  if (index < source.length) return { ok: false, error: `Unexpected character "${source[index]}".` };
  if (!Object.keys(counts).length) return { ok: false, error: "The formula is empty." };
  return { ok: true, counts, formula: formulaFromCounts(counts) };
}

export function normalizeFormulaInput(input) {
  const sub = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  return String(input || "")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => sub[char])
    .replace(/[Сс]/g, "C")
    .replace(/[Нн]/g, "H")
    .replace(/[Оо]/g, "O")
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

export function resolveSubstanceInput(input) {
  const raw = String(input || "").trim();
  const byName = findKnownSubstance(raw);
  if (byName) {
    const parsed = parseFormula(byName.formula);
    if (parsed.ok && (parsed.counts.D || parsed.counts.T)) {
      return { ...byName, type: "formula", smiles: byName.formula === "D2O" ? "[2H]O[2H]" : "", input: raw, label: byName.commonName || raw };
    }
  }
  if (byName) return { ...byName, type: byName.structure ? "formula" : byName.smiles ? "smiles" : "formula", input: raw, label: byName.commonName || raw };
  if (looksLikeSmiles(raw)) return { type: "smiles", smiles: raw, commonName: "", className: "SMILES", note: "", input: raw, label: raw };
  return { type: "formula", formula: raw, commonName: "", className: "", note: "", input: raw };
}

export function findKnownSubstance(input) {
  const key = normalizeName(input);
  if (!key) return null;
  const byName = knownSubstances.find((item) => item.names.some((name) => normalizeName(name) === key));
  if (byName) return byName;
  const keys = formulaLookupKeys(input);
  return knownSubstances.find((item) => keys.includes(normalizeFormulaInput(item.formula).toUpperCase())) || null;
}

export function formulaLookupKeys(input) {
  const raw = normalizeFormulaInput(input).toUpperCase();
  const keys = new Set([raw]);
  if (raw.includes("0")) keys.add(raw.replace(/0/g, "O"));
  const glucoseTypo = raw.match(/^C6H12(?:0|O)6$/);
  if (glucoseTypo) keys.add("C6H12O6");
  return [...keys];
}

export function normalizeName(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeSmiles(input) {
  const text = String(input || "").trim();
  if (!text || /\s/.test(text)) return false;
  if (/^[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*(?:[()[\].·]\d*)*$/.test(text) && !/[=#@+\-\[\]cnosp]/.test(text)) return false;
  return /[=#@+\-\[\]cnosp]|\d/.test(text) && /[A-Za-z]/.test(text);
}

export function formulaFromCounts(counts) {
  const keys = Object.keys(counts).filter((key) => counts[key] > 0);
  if (!keys.length) return "";
  const ordered = [];
  ["C", "H", "D", "T"].forEach((key) => {
    if (keys.includes(key)) ordered.push(key);
  });
  keys.filter((key) => !["C", "H", "D", "T"].includes(key)).sort().forEach((key) => ordered.push(key));
  return ordered.map((key) => `${key}${counts[key] === 1 ? "" : formatSubscriptPlain(counts[key])}`).join("");
}

export function addCount(counts, symbol, value) {
  counts[symbol] = (counts[symbol] || 0) + value;
}

export function mergeCounts(target, source, multiplier = 1) {
  Object.entries(source).forEach(([symbol, value]) => {
    target[symbol] = (target[symbol] || 0) + value * multiplier;
  });
}

export function groupMass(groupCounts) {
  return Object.entries(groupCounts || {}).reduce((sum, [symbol, value]) => {
    return sum + getElement(symbol).mass * value;
  }, 0);
}

export function formatSubscriptPlain(value) {
  return Number.isInteger(value) ? String(value) : formatNumber(value);
}

export function formatCoefficient(value) {
  if (nearlyEqual(value, 1)) return "";
  if (Number.isInteger(value)) return `${value} `;
  if (nearlyEqual(value * 2, Math.round(value * 2))) return `${Math.round(value * 2)}/2 `;
  return `${formatNumber(value)} `;
}
