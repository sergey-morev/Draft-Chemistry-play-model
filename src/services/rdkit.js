import { normalizeFormulaInput, parseFormula } from "../chemistry/formula.js";
import { RDKIT_SCRIPT_URL } from "../config.js";
import { analyzeAndRender } from "../simulation/update.js";
import { state as labState } from "../state.js";
import { formatNumber } from "../utils/format.js";

export function initRdkitEngine() {
  if (typeof window === "undefined") return;
  if (labState.rdkitStatus === "загрузка") return;
  labState.rdkitStatus = "загрузка";
  const finishUnavailable = () => {
    if (labState.rdkitModule) return;
    labState.rdkitStatus = "недоступен";
    analyzeAndRender(false);
  };
  if (window.RDKit) {
    labState.rdkitModule = window.RDKit;
    labState.rdkitStatus = "готов";
    requestRdkitCheck();
    return;
  }
  const script = document.createElement("script");
  script.src = RDKIT_SCRIPT_URL;
  script.async = true;
  script.onload = () => {
    if (typeof window.initRDKitModule !== "function") {
      finishUnavailable();
      return;
    }
    window.initRDKitModule()
      .then((module) => {
        labState.rdkitModule = module;
        labState.rdkitStatus = "готов";
        requestRdkitCheck();
      })
      .catch(finishUnavailable);
  };
  script.onerror = finishUnavailable;
  (document.head || document.documentElement || document.body).appendChild(script);
}

export function requestRdkitCheck(smiles = labState.compoundMeta?.smiles, meta = labState.compoundMeta) {
  if (!meta) return;
  if (!smiles) {
    labState.compoundMeta.rdkit = { status: "нет SMILES", notes: ["Для проверки RDKit нужен SMILES: например CCO, c1ccccc1 или O=C=O."] };
    analyzeAndRender(false);
    return;
  }
  if (!labState.rdkitModule) {
    labState.compoundMeta.rdkit = { status: labState.rdkitStatus, smiles, notes: ["RDKit is optional and loads from an external CDN only when enabled. The local teaching checks work without it."] };
    analyzeAndRender(false);
    return;
  }
  try {
    const mol = labState.rdkitModule.get_mol(smiles);
    if (!mol || mol.is_valid?.() === false) {
      labState.compoundMeta.rdkit = { status: "ошибка", smiles, notes: ["RDKit не принял этот SMILES. Проверьте скобки, заряды и кольца."] };
      analyzeAndRender(false);
      return;
    }
    const descriptors = readRdkitDescriptors(mol);
    const canonical = typeof mol.get_smiles === "function" ? mol.get_smiles() : smiles;
    const formula = typeof mol.get_molformula === "function" ? mol.get_molformula() : (descriptors.molFormula || descriptors.MolFormula || descriptors.formula || "");
    const exactMass = descriptors.exactmw || descriptors.exactMolWt || descriptors.ExactMolWt || descriptors.amw || descriptors.MolWt || null;
    const aromaticAtoms = typeof mol.get_aromatic_atoms === "function" ? mol.get_aromatic_atoms() : "";
    labState.compoundMeta.rdkit = {
      status: "готов",
      smiles,
      canonical,
      formula,
      exactMass,
      aromaticAtoms,
      notes: buildRdkitNotes(formula, exactMass, canonical)
    };
    if (typeof mol.delete === "function") mol.delete();
  } catch (error) {
    labState.compoundMeta.rdkit = { status: "ошибка", smiles, notes: [`RDKit не смог проверить структуру: ${error.message || error}`] };
  }
  analyzeAndRender(false);
}

export function readRdkitDescriptors(mol) {
  if (typeof mol.get_descriptors !== "function") return {};
  const raw = mol.get_descriptors();
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export function buildRdkitNotes(formula, exactMass, canonical) {
  const notes = [];
  if (formula && labState.lastAnalysis?.formula && formulasEquivalent(formula, labState.lastAnalysis.formula)) {
    notes.push("Формула совпадает с нашей моделью.");
  } else if (formula) {
    notes.push(`RDKit формула: ${formula}; наша: ${labState.lastAnalysis?.formula || "нет"}.`);
  }
  if (exactMass != null) notes.push(`Масса RDKit: ${formatNumber(Number(exactMass))} г/моль.`);
  if (canonical) notes.push(`Канонический SMILES: ${canonical}.`);
  return notes.length ? notes : ["RDKit принял структуру."];
}

export function formulasEquivalent(a, b) {
  const parsedA = parseFormula(a);
  const parsedB = parseFormula(b);
  if (!parsedA.ok || !parsedB.ok) return normalizeFormulaInput(a).toUpperCase() === normalizeFormulaInput(b).toUpperCase();
  const keys = new Set([...Object.keys(parsedA.counts), ...Object.keys(parsedB.counts)]);
  return [...keys].every((key) => (parsedA.counts[key] || 0) === (parsedB.counts[key] || 0));
}
