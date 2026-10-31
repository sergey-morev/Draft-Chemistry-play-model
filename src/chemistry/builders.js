import { analyzeMolecule } from "./analysis.js";
import { applyRadioisotope, buildChelatorModel } from "./coordination.js";
import { findKnownSubstance, formulaFromCounts, normalizeFormulaInput, parseFormula } from "./formula.js";
import { isHydrogenLike, valenceUsage } from "./properties.js";
import { knownFormulaSmiles, radioisotopePresets } from "../data/catalogs.js";
import { centerMolecule } from "../render/camera.js";
import { addRadioligandScaffold } from "../simulation/fragments.js";
import { getAtom, getElement } from "../simulation/graph.js";
import { addAtom, createOrUpdateBond, removeAtom } from "../simulation/molecule.js";
import { state as labState } from "../state.js";
import { formulaInput, smilesInput } from "../ui/dom.js";
import { displayFormula } from "../ui/inspector.js";
import { reactionResult } from "../ui/journal.js";

export function buildMoleculeFromFormula(counts, formula, meta = {}) {
  labState.atoms = [];
  labState.bonds = [];
  labState.selectedAtomIds = [];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  labState.nextAtomId = 1;
  labState.nextBondId = 1;

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  labState.compoundMeta = {
    inputType: meta.type || "formula",
    sourceFormula: formula,
    sourceInput: meta.input || formula,
    displayFormula: meta.displayFormula || "",
    structure: meta.structure || "",
    smiles: meta.smiles || knownFormulaSmiles.get(normalizeFormulaInput(formula).toUpperCase()) || "",
    commonName: meta.commonName || "",
    className: meta.className || "",
    note: meta.note || "",
    uses: meta.uses || [],
    hazards: meta.hazards || [],
    external: meta.external || null,
    rdkit: null,
    condensed: total > 160,
    totalAtoms: total,
    bioName: meta.commonName || bioNameForFormula(formula, counts)
  };
  if (meta.structure === "glucose") buildGlucoseHaworthModel();
  else if (meta.structure === "fdg") buildFluorodeoxyGlucoseModel();
  else if (meta.structure === "sucrose") buildDisaccharideSketch("сахароза");
  else if (meta.structure === "starch" || meta.structure === "cellulose") buildPolymerRepeatSketch(meta.commonName || "полисахарид");
  else if (["dota", "dtpa", "macropa"].includes(meta.structure)) buildChelatorModel(meta.structure, meta.defaultMetal || meta.radioisotope || "");
  else if (meta.structure === "radioligand") addRadioligandScaffold(500, 350);
  else if (total > 160) buildCondensedFormulaModel(counts);
  else buildExplicitFormulaModel(counts);
  const allowImplicitHydrogens = ["dota", "dtpa", "macropa", "radioligand"].includes(meta.structure);
  labState.atoms.forEach((atom) => {
    atom.suppressImplicitH = !allowImplicitHydrogens || atom.suppressImplicitH === true;
  });
}

export function buildExplicitFormulaModel(counts) {
  const heavy = Object.entries(counts).filter(([symbol]) => !isHydrogenLike(symbol));
  const heavyAtoms = [];
  const carbonAtoms = [];
  const heteroAtoms = [];
  const center = { x: 500, y: 350 };

  for (let i = 0; i < (counts.C || 0); i++) {
    const x = center.x + (i - ((counts.C || 0) - 1) / 2) * 58;
    const y = center.y + Math.sin(i * 1.7) * 22;
    const atom = addAtom("C", x, y);
    carbonAtoms.push(atom);
    heavyAtoms.push(atom);
  }
  for (let i = 0; i < carbonAtoms.length - 1; i++) {
    createOrUpdateBond(carbonAtoms[i].id, carbonAtoms[i + 1].id, 1);
  }

  let heteroIndex = 0;
  heavy.filter(([symbol]) => symbol !== "C").forEach(([symbol, amount]) => {
    for (let i = 0; i < amount; i++) {
      const anchor = carbonAtoms.length ? carbonAtoms[heteroIndex % carbonAtoms.length] : null;
      const angle = heteroIndex * 2.399;
      const radius = anchor ? 78 : 48 + Math.floor(heteroIndex / 8) * 44;
      const x = anchor ? anchor.x + Math.cos(angle) * radius : center.x + Math.cos(angle) * radius;
      const y = anchor ? anchor.y + Math.sin(angle) * radius : center.y + Math.sin(angle) * radius;
      const atom = addAtom(symbol, x, y);
      heteroAtoms.push(atom);
      heavyAtoms.push(atom);
      if (anchor && valenceUsage(anchor.id) < Math.max(...getElement(anchor.symbol).valences)) {
        createOrUpdateBond(anchor.id, atom.id, 1);
      } else if (!anchor && heteroAtoms.length > 1) {
        createOrUpdateBond(heteroAtoms[heteroAtoms.length - 2].id, atom.id, 1);
      }
      heteroIndex++;
    }
  });

  const anchorPool = heavyAtoms.length ? heavyAtoms : [];
  const hydrogenSymbols = ["H", "D", "T"].flatMap((symbol) => Array.from({ length: counts[symbol] || 0 }, () => symbol));
  hydrogenSymbols.forEach((symbol, index) => {
    if (!anchorPool.length) {
      addAtom(symbol, center.x + Math.cos(index) * 80, center.y + Math.sin(index) * 80);
      return;
    }
    const anchor = anchorPool.find((atom) => valenceUsage(atom.id) < Math.max(...getElement(atom.symbol).valences))
      || anchorPool.find((atom) => atom.symbol === "C" && valenceUsage(atom.id) < 4);
    if (!anchor) {
      addAtom(symbol, center.x + Math.cos(index * 1.7) * 170, center.y + Math.sin(index * 1.7) * 170);
      return;
    }
    const angle = index * 2.399;
    const h = addAtom(symbol, anchor.x + Math.cos(angle) * 72, anchor.y + Math.sin(angle) * 72);
    createOrUpdateBond(anchor.id, h.id, 1);
  });

  labState.selectedAtomIds = heavyAtoms.slice(0, 6).map((atom) => atom.id);
  centerMolecule(false);
}

export function buildGlucoseHaworthModel() {
  const p = {
    O5: [560, 292], C1: [638, 348], C2: [604, 438], C3: [500, 452], C4: [420, 390], C5: [462, 300], C6: [414, 214]
  };
  const ring = {};
  Object.entries(p).forEach(([key, [x, y]]) => {
    const atom = addAtom(key === "O5" ? "O" : "C", x, y);
    atom.structLabel = key;
    ring[key] = atom;
  });
  [["O5", "C1"], ["C1", "C2"], ["C2", "C3"], ["C3", "C4"], ["C4", "C5"], ["C5", "O5"], ["C5", "C6"]].forEach(([a, b]) => {
    createOrUpdateBond(ring[a].id, ring[b].id, 1);
  });
  addHydroxy(ring.C1, 700, 308, 742, 282, "OH");
  addHydroxy(ring.C2, 640, 522, 685, 548, "OH");
  addHydroxy(ring.C3, 500, 360, 500, 315, "OH");
  addHydroxy(ring.C4, 344, 430, 304, 454, "OH");
  addHydroxy(ring.C6, 374, 142, 334, 116, "OH");
  addPlainHydrogen(ring.C1, 690, 386);
  addPlainHydrogen(ring.C2, 662, 404);
  addPlainHydrogen(ring.C3, 478, 516);
  addPlainHydrogen(ring.C4, 382, 344);
  addPlainHydrogen(ring.C5, 428, 270);
  addPlainHydrogen(ring.C6, 454, 180);
  addPlainHydrogen(ring.C6, 366, 236);
  labState.selectedAtomIds = Object.values(ring).map((atom) => atom.id);
  labState.selectedBondId = null;
  centerMolecule(false);
}

export function addHydroxy(anchor, ox, oy, hx, hy, label = "OH") {
  const oxygen = addAtom("O", ox, oy);
  oxygen.structLabel = label;
  oxygen.groupLabel = `${anchor.structLabel || anchor.symbol}-${label}`;
  const hydrogen = addAtom("H", hx, hy);
  hydrogen.groupLabel = `${anchor.structLabel || anchor.symbol}-${label}-H`;
  oxygen.ohHydrogenId = hydrogen.id;
  createOrUpdateBond(anchor.id, oxygen.id, 1);
  createOrUpdateBond(oxygen.id, hydrogen.id, 1);
  return oxygen;
}

export function addPlainHydrogen(anchor, x, y) {
  const h = addAtom("H", x, y);
  createOrUpdateBond(anchor.id, h.id, 1);
  return h;
}

export function buildDisaccharideSketch(name = "дисахарид") {
  buildGlucoseHaworthModel();
  const firstIds = labState.atoms.map((atom) => atom.id);
  const offset = 330;
  const beforeCount = labState.atoms.length;
  buildGlucoseHaworthModel();
  const secondAtoms = labState.atoms.slice(beforeCount);
  secondAtoms.forEach((atom) => {
    atom.x += offset;
    atom.y += 18;
  });
  const firstC1 = labState.atoms.find((atom) => firstIds.includes(atom.id) && atom.structLabel === "C1");
  const secondC4 = secondAtoms.find((atom) => atom.structLabel === "C4");
  const firstC1Oh = labState.atoms.find((atom) => firstIds.includes(atom.id) && atom.groupLabel === "C1-OH");
  const firstC1OhH = firstC1Oh ? getAtom(firstC1Oh.ohHydrogenId) : null;
  const secondC4Oh = secondAtoms.find((atom) => atom.groupLabel === "C4-OH");
  const secondC4OhH = secondC4Oh ? getAtom(secondC4Oh.ohHydrogenId) : null;
  if (firstC1OhH) removeAtom(firstC1OhH.id);
  if (secondC4OhH) removeAtom(secondC4OhH.id);
  if (secondC4Oh) removeAtom(secondC4Oh.id);
  if (firstC1 && secondC4 && firstC1Oh) {
    firstC1Oh.structLabel = "O-глик.";
    firstC1Oh.groupLabel = "glycosidic";
    createOrUpdateBond(firstC1Oh.id, secondC4.id, 1);
  }
  labState.compoundMeta.note = `${name}: учебная схема двух сахарных колец и гликозидной связи.`;
  centerMolecule(false);
}

export function buildPolymerRepeatSketch(name = "полисахарид") {
  buildGlucoseHaworthModel();
  const c1Oh = labState.atoms.find((atom) => atom.groupLabel === "C1-OH");
  const c1OhH = c1Oh ? getAtom(c1Oh.ohHydrogenId) : null;
  const c4Oh = labState.atoms.find((atom) => atom.groupLabel === "C4-OH");
  const c4OhH = c4Oh ? getAtom(c4Oh.ohHydrogenId) : null;
  if (c1OhH) removeAtom(c1OhH.id);
  if (c4OhH) removeAtom(c4OhH.id);
  if (c4Oh) removeAtom(c4Oh.id);
  if (c1Oh) {
    c1Oh.structLabel = "O-n";
    c1Oh.groupLabel = "polymer-link";
  }
  labState.compoundMeta.note = `${name}: показано одно ангидроглюкозное звено C6H10O5; реальный полимер содержит много таких повторов.`;
  centerMolecule(false);
}

export function buildFluorodeoxyGlucoseModel() {
  buildGlucoseHaworthModel();
  const c2 = labState.atoms.find((atom) => atom.structLabel === "C2");
  const c2Oh = labState.atoms.find((atom) => atom.groupLabel === "C2-OH");
  const c2OhH = c2Oh ? getAtom(c2Oh.ohHydrogenId) : null;
  if (c2OhH) removeAtom(c2OhH.id);
  if (c2Oh) removeAtom(c2Oh.id);
  if (c2) {
    const fluorine = addAtom("F", c2.x + 76, c2.y + 42);
    applyRadioisotope(fluorine, radioisotopePresets.find((preset) => preset.id === "f18"));
    fluorine.structLabel = "18F";
    createOrUpdateBond(c2.id, fluorine.id, 1);
  }
  labState.compoundMeta.note = "18F-FDG: учебная схема фтордезоксиглюкозы, где 18F заменяет одну OH-группу глюкозного кольца.";
  centerMolecule(false);
}

export function buildCondensedFormulaModel(counts) {
  const entries = Object.entries(counts).sort(([a], [b]) => {
    const order = ["C", "H", "N", "O", "S", "P", "Fe", "Cu", "Mg", "Zn"];
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)) || a.localeCompare(b);
  });
  const center = { x: 500, y: 350 };
  const radius = Math.min(190, 70 + entries.length * 12);
  entries.forEach(([symbol, amount], index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / entries.length;
    const atom = addAtom(symbol, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
    atom.count = amount;
  });
  const metal = labState.atoms.find((atom) => ["Fe", "Cu", "Mg", "Zn", "Co", "Ni"].includes(atom.symbol));
  const carbon = labState.atoms.find((atom) => atom.symbol === "C");
  if (metal && carbon) createOrUpdateBond(metal.id, carbon.id, 1);
  labState.atoms.forEach((atom, index) => {
    if (index > 0 && labState.atoms[index - 1] !== metal && atom !== metal && labState.atoms.length <= 12) {
      createOrUpdateBond(labState.atoms[index - 1].id, atom.id, 1);
    }
  });
  labState.selectedAtomIds = metal ? [metal.id] : labState.atoms.slice(0, 2).map((atom) => atom.id);
}

export function formulaUseHint(counts, formula) {
  const name = bioNameForFormula(formula, counts);
  if (name.includes("гемоглобин")) return "Биомакромолекула переноса газов: металл в центре показывает Fe/Cu-вариант модели.";
  if (name !== "пользовательская формула") return `${name}: биоорганический пример для изучения состава, массы и функциональных групп.`;
  if (counts.C && counts.N && counts.O) return "Похоже на биоорганическое вещество: можно менять гетероатомы, металл и изотопные метки.";
  return "Формула построена как учебная молекулярная модель.";
}

export function formulaBuildAdvice(counts) {
  const advice = ["Smaller formulas may show explicit atoms; larger examples may use a compact composition map."];
  if (counts.C === 6 && counts.H === 12 && counts.O === 6) advice.push("For this catalog-mapped glucose example, use Expand diagram to inspect the schematic ring. The formula alone does not establish its structure.");
  if (counts.Fe || counts.Cu) advice.push("Fe↔Cu changes the modeled metal and rebuilds the sketch; it does not establish a real analogue.");
  if ((counts.C || 0) > 20) advice.push("For large biomolecular sketches, use the top field to change the formula or modeled metal. The drawing is not a validated structure.");
  return advice;
}

export function expandCurrentMolecule() {
  const analysis = analyzeMolecule();
  const formula = displayFormula(analysis) || analysis.formula;
  const substance = labState.compoundMeta?.commonName ? labState.compoundMeta : findKnownSubstance(formula);
  const structure = substance?.structure || (!substance?.commonName ? structureForFormula(analysis.counts) : "");
  if (!structure) {
    centerMolecule(false);
    return reactionResult(false, "Нет готовой схемы", "Для этой молекулы пока нет ручной структурной раскладки.", {
      advice: ["Попробуйте глюкозу, сахарозу, крахмал, бензол, этанол или CO2.", "Для неизвестной структуры можно использовать SMILES, если он задан."]
    });
  }
  const meta = {
    ...substance,
    type: "formula",
    formula: substance?.formula || formula,
    commonName: substance?.commonName || structure,
    className: substance?.className || "структурная схема",
    note: substance?.note || "Молекула развернута в учебную структурную схему.",
    structure
  };
  const parsed = parseFormula(meta.formula || formula);
  if (!parsed.ok) {
    return reactionResult(false, "Схема не построена", parsed.error, {
      advice: ["Проверьте формулу или выберите вещество из справочника."]
    });
  }
  buildMoleculeFromFormula(parsed.counts, parsed.formula, meta);
  if (formulaInput) formulaInput.value = meta.commonName || parsed.formula;
  if (smilesInput) smilesInput.value = meta.smiles || "";
  return reactionResult(true, "Молекула развернута", `${meta.commonName || parsed.formula}: показана структурная учебная схема.`, {
    equation: meta.displayFormula || parsed.formula,
    uses: meta.note || "Развернутая схема помогает видеть геометрию, кольца, OH-группы и реакционные центры.",
    advice: ["Откройте справочник: там появились игровые задания и интересная химия для этой структуры.", "Можно перетаскивать атомы и менять связи вручную."]
  });
}

export function structureForFormula(counts) {
  if ((counts.C || 0) === 6 && (counts.H || 0) === 12 && (counts.O || 0) === 6) return "glucose";
  if ((counts.C || 0) === 6 && (counts.H || 0) === 11 && (counts.F || 0) === 1 && (counts.O || 0) === 5) return "fdg";
  if ((counts.C || 0) === 12 && (counts.H || 0) === 22 && (counts.O || 0) === 11) return "sucrose";
  if ((counts.C || 0) === 6 && (counts.H || 0) === 10 && (counts.O || 0) === 5) return "starch";
  if ((counts.C || 0) === 16 && (counts.H || 0) >= 24 && (counts.N || 0) === 4 && (counts.O || 0) === 8) return "dota";
  if ((counts.C || 0) === 14 && (counts.N || 0) === 3 && (counts.O || 0) === 10) return "dtpa";
  return "";
}

export function bioNameForFormula(formula, counts) {
  const normalized = formulaFromCounts(counts);
  const names = {
    C6H12O6: "глюкоза",
    C6H11FO5: "18F-FDG",
    C12H22O11: "сахароза",
    C6H10O5: "звено полисахарида",
    C16H28N4O8: "DOTA",
    C14H23N3O10: "DTPA",
    C8H11NO2: "дофамин",
    C10H12N2O: "серотонин",
    C158H251N39O46S: "β-эндорфин",
    C4H8N2O3: "простой пептид"
  };
  if (names[normalized]) return names[normalized];
  if (normalized === "C2952H4664Cu4N812O832S8") return "гемоглобин Cu-модель";
  if (normalized === "C2952H4664Fe4N812O832S8") return "гемоглобин Fe";
  if ((counts.C || 0) > 100 && (counts.N || 0) > 10) return "биомакромолекула";
  return "пользовательская формула";
}
