import { normalizeFormulaInput, normalizeName } from "../chemistry/formula.js";
import { knownFormulaSmiles, knownSubstances } from "../data/catalogs.js";
import { elementBySymbol } from "../data/elements.js";
import { analyzeAndRender } from "../simulation/update.js";
import { state as labState } from "../state.js";
import { renderSelectedElement } from "../ui/elements.js";

export function mergeExternalSubstanceRecords() {
  const records = typeof window !== "undefined" ? window.CHEM_LAB_EXTRA_SUBSTANCES : null;
  if (!Array.isArray(records)) return;
  records.forEach(addKnownSubstance);
}

export async function loadLocalDatabases() {
  if (typeof fetch !== "function") return;
  const loaded = [];
  try {
    const substances = await loadJsonFile("data/substances.ru.json");
    if (Array.isArray(substances?.records)) {
      substances.records.forEach(addKnownSubstance);
      loaded.push("substances");
    }
  } catch {
    // file:// browsers may block local JSON fetch; the built-in fallback stays active.
  }
  try {
    const common = await loadJsonFile("data/substances.common.ru.json");
    if (Array.isArray(common?.records)) {
      common.records.forEach(addKnownSubstance);
      loaded.push("common substances");
    }
  } catch {
    // The JS dictionary is loaded before app.js, so the file:// version still works offline.
  }
  try {
    const reactions = await loadJsonFile("data/reactions.json");
    if (Array.isArray(reactions?.records)) {
      labState.reactionDatabase = reactions.records;
      loaded.push("reactions");
    }
  } catch {
    labState.reactionDatabase = [];
  }
  try {
    const overrides = await loadJsonFile("data/element-overrides.json");
    if (Array.isArray(overrides?.records)) {
      overrides.records.forEach(applyElementOverride);
      loaded.push("elements");
    }
  } catch {
    // Built-in element data remains active.
  }
  labState.dataLoadStatus = loaded.length ? `JSON: ${loaded.join(", ")}` : "встроенная база";
  renderSelectedElement();
  analyzeAndRender(false);
}

export async function loadJsonFile(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Не удалось загрузить ${path}`);
  return response.json();
}

export function addKnownSubstance(record) {
  if (!record || !record.formula || !Array.isArray(record.names)) return;
  const normalizedNames = new Set(record.names.map(normalizeName));
  const duplicate = knownSubstances.find((item) => item.names.some((name) => normalizedNames.has(normalizeName(name))));
  if (duplicate) {
    Object.assign(duplicate, record);
  } else {
    knownSubstances.push(record);
  }
  if (record.smiles) {
    const formulaKey = normalizeFormulaInput(record.formula).toUpperCase();
    if (!knownFormulaSmiles.has(formulaKey)) knownFormulaSmiles.set(formulaKey, record.smiles);
  }
}

export function applyElementOverride(record) {
  if (!record?.symbol) return;
  const element = elementBySymbol.get(record.symbol);
  if (!element) return;
  ["name", "mass", "valences", "electronegativity", "radius", "category", "color", "organic"].forEach((key) => {
    if (record[key] !== undefined) {
      if (key === "name") {
        // Preserve inherited names for search without replacing the English display name.
        element.legacyNames = [...new Set([...(element.legacyNames || []), record[key]])];
      } else element[key] = record[key];
    }
  });
  if (record.brief) element.brief = record.brief;
}
