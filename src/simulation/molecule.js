import { analyzeMolecule } from "../chemistry/analysis.js";
import { bondOrderValue, chooseIdealValence, isHydrogenLike, isotopeBaseMassNumber, valenceUsage } from "../chemistry/properties.js";
import { connects, getAtom, getBond, getElement } from "./graph.js";
import { analyzeAndRender } from "./update.js";
import { state as labState } from "../state.js";
import { logReaction, reactionResult } from "../ui/journal.js";
import { clamp } from "../utils/format.js";

export function createOrUpdateBond(a, b, order, toggleExisting = false) {
  const existing = labState.bonds.find((bond) => connects(bond, a, b));
  if (existing) {
    if (toggleExisting && existing.order === order) {
      return weakenOrRemoveBond(existing.id);
    }
    existing.order = order;
    labState.selectedBondId = existing.id;
    return existing;
  }
  const bond = { id: labState.nextBondId++, a, b, order };
  labState.bonds.push(bond);
  labState.selectedBondId = bond.id;
  return bond;
}

export function weakenOrRemoveBond(bondId) {
  const bond = getBond(bondId);
  if (!bond) return null;
  if (bond.order === "aromatic") {
    bond.order = 1;
    labState.selectedBondId = bond.id;
    return bond;
  }
  if (bond.order > 1) {
    bond.order -= 1;
    labState.selectedBondId = bond.id;
    return bond;
  }
  removeBond(bond.id);
  return null;
}

export function strengthenBond(bondId) {
  const bond = getBond(bondId);
  if (!bond) return null;
  if (bond.order === "aromatic") return bond;
  bond.order = clamp(bond.order + 1, 1, 3);
  labState.selectedBondId = bond.id;
  return bond;
}

export function addAtom(symbol, x, y, charge = 0) {
  const atom = {
    id: labState.nextAtomId++,
    symbol,
    x,
    y,
    charge,
    count: 1,
    isotopeShift: 0,
    enrichment: 0,
    valenceOverride: null,
    vx: 0,
    vy: 0
  };
  labState.atoms.push(atom);
  labState.selectedAtomIds = [atom.id];
  labState.selectedBondId = null;
  return atom;
}

export function addAtomAttached(symbol, atomId, angle, distance = 86) {
  const atom = getAtom(atomId);
  const child = addAtom(symbol, atom.x + Math.cos(angle) * distance, atom.y + Math.sin(angle) * distance);
  createOrUpdateBond(atomId, child.id, 1);
  return child;
}

export function removeAtom(atomId) {
  labState.atoms = labState.atoms.filter((atom) => atom.id !== atomId);
  labState.bonds = labState.bonds.filter((bond) => bond.a !== atomId && bond.b !== atomId);
  labState.selectedAtomIds = labState.selectedAtomIds.filter((id) => id !== atomId);
  if (labState.pendingAtomId === atomId) labState.pendingAtomId = null;
}

export function removeBond(bondId) {
  labState.bonds = labState.bonds.filter((bond) => bond.id !== bondId);
  if (labState.selectedBondId === bondId) labState.selectedBondId = null;
}

export function deleteSelection() {
  if (labState.selectedBondId) {
    removeBond(labState.selectedBondId);
  } else {
    [...labState.selectedAtomIds].forEach(removeAtom);
  }
  labState.selectedAtomIds = [];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  analyzeAndRender();
}

export function adjustCharge(delta) {
  if (labState.selectedAtomIds.length !== 1) return;
  const atom = getAtom(labState.selectedAtomIds[0]);
  if (!atom) return;
  atom.charge = clamp(atom.charge + delta, -4, 4);
  analyzeAndRender();
}

export function adjustValenceOverride(delta) {
  const changed = selectedAtoms().filter((atom) => !isHydrogenLike(atom.symbol));
  if (!changed.length) return;
  changed.forEach((atom) => {
    const element = getElement(atom.symbol);
    const current = atom.valenceOverride ?? chooseIdealValence(atom, element, valenceUsage(atom.id));
    atom.valenceOverride = clamp(current + delta, 0, 8);
  });
  analyzeAndRender();
}

export function adjustIsotopeShift(delta) {
  const changed = selectedAtoms();
  if (!changed.length) return;
  changed.forEach((atom) => {
    setIsotopeShift(atom, (atom.isotopeShift || 0) + delta);
  });
  analyzeAndRender();
}

export function adjustEnrichment(delta) {
  const changed = selectedAtoms();
  if (!changed.length) return;
  changed.forEach((atom) => {
    if (!atom.isotopeShift) setIsotopeShift(atom, 1);
    atom.enrichment = clamp((atom.enrichment || 0) + delta, 0, 1);
    if (atom.enrichment === 0) setIsotopeShift(atom, 0);
  });
  analyzeAndRender();
}

export function resetSelectedAtomTuning() {
  const changed = selectedAtoms();
  if (!changed.length) return;
  changed.forEach((atom) => {
    atom.isotopeShift = 0;
    atom.enrichment = 0;
    delete atom.targetMassNumber;
    delete atom.radioisotope;
    delete atom.radioisotopeKind;
    atom.valenceOverride = null;
  });
  analyzeAndRender();
}

export function tuneSelectedAtoms(kind, delta) {
  const before = analyzeMolecule();
  const changed = selectedAtoms().length ? selectedAtoms() : labState.atoms;
  if (!changed.length) {
    return reactionResult(false, "Нет атомов для настройки", "Выберите атом или добавьте молекулу.", {
      advice: ["Для обогащения любого элемента выделите атом, затем нажмите A± или %±."]
    });
  }
  if (kind === "isotope") {
    changed.forEach((atom) => {
      setIsotopeShift(atom, (atom.isotopeShift || 0) + delta);
    });
  }
  if (kind === "enrichment") {
    changed.forEach((atom) => {
      if (!atom.isotopeShift) setIsotopeShift(atom, 1);
      atom.enrichment = clamp((atom.enrichment || 0) + delta, 0, 1);
      if (atom.enrichment === 0) setIsotopeShift(atom, 0);
    });
  }
  labState.selectedAtomIds = changed.map((atom) => atom.id);
  labState.selectedBondId = null;
  const label = kind === "isotope" ? "Масса изотопа повышена" : "Обогащение повышено";
  return reactionResult(true, label, `Настроено атомов: ${changed.length}.`, {
    equation: kind === "isotope" ? "E-A -> E-(A±n)" : "E-(A±n) -> enriched E-(A±n)",
    uses: "Универсальная изотопная настройка нужна для учебного сравнения массы и маркировки положения любого элемента.",
    advice: ["A± меняет массовое число выбранного элемента.", "%± задает долю обогащенной фракции для расчета массы."]
  });
}

export function selectedAtoms() {
  return labState.selectedAtomIds.map(getAtom).filter(Boolean);
}

export function setIsotopeShift(atom, value) {
  const element = getElement(atom.symbol);
  const base = isotopeBaseMassNumber(element);
  delete atom.targetMassNumber;
  delete atom.radioisotope;
  delete atom.radioisotopeKind;
  atom.isotopeShift = clamp(Math.round(value), 1 - base, 80);
  if (atom.isotopeShift === 0) {
    atom.enrichment = 0;
  } else if (!atom.enrichment) {
    atom.enrichment = 1;
  }
}

export function mergeAtoms(primaryId, secondaryId) {
  const primary = getAtom(primaryId);
  const secondary = getAtom(secondaryId);
  if (!primary || !secondary) return;
  primary.x = (primary.x + secondary.x) / 2;
  primary.y = (primary.y + secondary.y) / 2;
  labState.bonds.forEach((bond) => {
    if (bond.a === secondaryId) bond.a = primaryId;
    if (bond.b === secondaryId) bond.b = primaryId;
  });
  labState.bonds = labState.bonds.filter((bond) => bond.a !== bond.b);
  const unique = new Map();
  labState.bonds.forEach((bond) => {
    const key = [bond.a, bond.b].sort((x, y) => x - y).join(":");
    const old = unique.get(key);
    if (!old || bondOrderValue(bond.order) > bondOrderValue(old.order)) unique.set(key, bond);
  });
  labState.bonds = [...unique.values()];
  labState.atoms = labState.atoms.filter((atom) => atom.id !== secondaryId);
  labState.selectedAtomIds = [primaryId];
  logReaction(`${secondary.symbol}${secondaryId} совмещён с ${primary.symbol}${primaryId}.`);
}
