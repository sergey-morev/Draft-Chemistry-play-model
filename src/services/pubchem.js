import { analyzeMolecule } from "../chemistry/analysis.js";
import { buildMoleculeFromFormula } from "../chemistry/builders.js";
import { findKnownSubstance, looksLikeSmiles, normalizeName, parseFormula } from "../chemistry/formula.js";
import { pubChemCache } from "./cache.js";
import { addKnownSubstance } from "./database.js";
import { analyzeAndRender } from "../simulation/update.js";
import { state as labState } from "../state.js";
import { databaseStatus, formulaInput } from "../ui/dom.js";
import { applyFormulaInput, applySmilesInput } from "../ui/input.js";
import { logReaction, reactionResult } from "../ui/journal.js";

export function scheduleExternalLookupHint() {
  if (!formulaInput) return;
  window.clearTimeout(labState.pubChemDebounceTimer);
  const query = formulaInput.value.trim();
  if (!query || query.length < 4 || findKnownSubstance(query) || parseFormula(query).ok) {
    setDatabaseStatus("локальная база", "ready");
    return;
  }
  setDatabaseStatus("можно искать PubChem", "ready");
  // Names typed into the editor stay local until the user explicitly requests PubChem.
}

export async function lookupExternalCompound(rawQuery, options = {}) {
  const query = String(rawQuery || "").trim();
  const build = options.build !== false;
  if (!query) {
    setDatabaseStatus("пустой запрос", "error");
    return reactionResult(false, "Нет запроса", "Введите название, формулу или SMILES.");
  }
  if (typeof fetch !== "function") {
    setDatabaseStatus("нет сетевого доступа", "error");
    return reactionResult(false, "Внешняя база недоступна", "Браузер не дал выполнить сетевой запрос.");
  }
  const cacheKey = normalizeName(query);
  if (pubChemCache.has(cacheKey)) {
    const cached = pubChemCache.get(cacheKey);
    if (build) buildFromExternalRecord(cached);
    setDatabaseStatus("PubChem: кэш", "ready");
    return reactionResult(true, "Найдено в кэше", `${cached.commonName}: ${cached.formula || cached.smiles}`, {
      equation: cached.formula || cached.smiles,
      uses: "Запись уже была загружена из PubChem в этой сессии.",
      advice: ["Кэш не записывается в файл автоматически: это безопаснее для учебной песочницы."]
    });
  }
  if (labState.pubChemAbortController) labState.pubChemAbortController.abort();
  labState.pubChemAbortController = new AbortController();
  const timeout = window.setTimeout(() => labState.pubChemAbortController.abort(), 9000);
  setDatabaseStatus("ищу PubChem...", "loading");
  try {
    const record = await fetchPubChemRecord(query, labState.pubChemAbortController.signal);
    window.clearTimeout(timeout);
    pubChemCache.set(cacheKey, record);
    if (record.formula) addKnownSubstance(record);
    setDatabaseStatus(`PubChem CID ${record.external?.cid || "?"}`, "ready");
    if (build) buildFromExternalRecord(record);
    if (!options.silent) {
      logReaction(reactionResult(true, "PubChem нашёл вещество", `${record.commonName}: ${record.formula || record.smiles}`, {
        equation: record.smiles || record.formula,
        uses: "Внешняя база помогает не раздувать локальный JSON и уточнять формулы/SMILES.",
        advice: ["Проверьте карточку «PubChem/ChEBI» в справочнике.", "Онлайн-запрос раскрывает введённое название внешнему сервису PubChem."]
      }), labState.lastAnalysis, labState.lastAnalysis);
    }
    return reactionResult(true, "PubChem нашёл вещество", record.commonName || query);
  } catch (error) {
    window.clearTimeout(timeout);
    const message = error.name === "AbortError" ? "таймаут или отмена запроса" : (error.message || String(error));
    setDatabaseStatus("PubChem: не найдено", "error");
    if (!options.silent) {
      logReaction(reactionResult(false, "Субстанция не найдена", `PubChem не вернул запись для «${query}»: ${message}`, {
        advice: ["Проверьте написание, попробуйте английское название или валидный SMILES.", "Локальная песочница продолжает работать без внешней базы."]
      }), labState.lastAnalysis, labState.lastAnalysis);
    }
    return reactionResult(false, "PubChem не нашёл вещество", message);
  }
}

export async function fetchPubChemRecord(query, signal) {
  const inputType = looksLikeSmiles(query) ? "smiles" : parseFormula(query).ok ? "formula" : "name";
  const encoded = encodeURIComponent(query);
  const properties = "MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES,IUPACName,InChIKey";
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${inputType}/${encoded}/property/${properties}/JSON`;
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const item = data?.PropertyTable?.Properties?.[0];
  if (!item) throw new Error("пустая выдача");
  const smiles = item.IsomericSMILES || item.CanonicalSMILES || "";
  return {
    names: [query, item.IUPACName].filter(Boolean),
    formula: item.MolecularFormula || "",
    smiles,
    commonName: query,
    className: `PubChem CID ${item.CID}`,
    note: `Запись получена через PubChem PUG REST: формула ${item.MolecularFormula || "не указана"}, молекулярная масса ${item.MolecularWeight || "не указана"}.`,
    source: "PubChem",
    external: {
      source: "PubChem",
      cid: item.CID,
      iupac: item.IUPACName || "",
      inchiKey: item.InChIKey || "",
      molecularWeight: item.MolecularWeight || "",
      url: item.CID ? `https://pubchem.ncbi.nlm.nih.gov/compound/${item.CID}` : ""
    }
  };
}

export function buildFromExternalRecord(record) {
  const meta = {
    ...record,
    type: record.smiles ? "smiles" : "formula",
    input: record.commonName || record.formula || record.smiles,
    rdkit: null,
    external: record.external
  };
  if (record.smiles) {
    applySmilesInput(record.smiles, meta);
    labState.compoundMeta.external = record.external;
    return;
  }
  const parsed = parseFormula(record.formula);
  if (parsed.ok) {
    const before = analyzeMolecule();
    buildMoleculeFromFormula(parsed.counts, parsed.formula, meta);
    analyzeAndRender();
    logReaction(reactionResult(true, "Формула из PubChem построена", record.commonName || parsed.formula), before, labState.lastAnalysis);
  }
}

export function setDatabaseStatus(text, state = "ready") {
  labState.externalLookupStatus = text;
  if (!databaseStatus) return;
  databaseStatus.textContent = text;
  databaseStatus.classList.toggle("loading", state === "loading");
  databaseStatus.classList.toggle("error", state === "error");
}

export function swapFormulaMetal() {
  const text = formulaInput.value.trim() || labState.lastAnalysis?.formula || "";
  if (!text) return;
  let next = text;
  if (/(Fe)(\d*)/.test(text)) next = text.replace(/Fe(\d*)/g, "Cu$1");
  else if (/(Cu)(\d*)/.test(text)) next = text.replace(/Cu(\d*)/g, "Fe$1");
  else next = `${text}Fe`;
  formulaInput.value = next;
  applyFormulaInput(next);
}
