import { buildMoleculeFromFormula } from "./builders.js";
import { isHydrogenLike, isotopeBaseMassNumber } from "./properties.js";
import { radioisotopePresets } from "../data/catalogs.js";
import { centerMolecule, freeCenterPoint } from "../render/camera.js";
import { centerOfAtomIds, getElement, isMetalAtom } from "../simulation/graph.js";
import { addAtom, createOrUpdateBond, selectedAtoms } from "../simulation/molecule.js";
import { state as labState } from "../state.js";
import { reactionResult } from "../ui/journal.js";
import { distance } from "../utils/format.js";

export function buildChelatorModel(type = "dota", defaultMetal = "") {
  const chelator = addChelator(type, 500, 350);
  const preset = radioisotopePresets.find((item) => item.id === defaultMetal || item.label === defaultMetal);
  if (preset) chelateSelectedMetal(preset, chelator.id);
  else labState.selectedAtomIds = chelator.donors.slice(0, 8).map((atom) => atom.id);
  labState.selectedBondId = null;
  centerMolecule(false);
}

export function addChelator(type, x, y) {
  if (type === "dtpa") return addOpenChelator(type, x, y);
  return addMacroChelator(type, x, y);
}

export function addMacroChelator(type, x, y) {
  const isMacropa = type === "macropa";
  const ringSize = isMacropa ? 16 : 12;
  const radius = isMacropa ? 142 : 118;
  const chelatorId = `${type}-${labState.nextAtomId}`;
  const donorPositions = isMacropa ? new Set([1, 4, 7, 9, 12, 15]) : new Set([0, 3, 6, 9]);
  const ringAtoms = [];
  for (let i = 0; i < ringSize; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / ringSize;
    const donor = donorPositions.has(i);
    const symbol = donor ? (isMacropa && i % 2 ? "O" : "N") : "C";
    const atom = addAtom(symbol, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    atom.chelatorId = chelatorId;
    atom.chelatorType = type;
    if (donor) {
      atom.donorRole = symbol === "N" ? "ring-N" : "ring-O";
      atom.structLabel = symbol === "N" ? "N" : "O";
    }
    ringAtoms.push(atom);
  }
  ringAtoms.forEach((atom, index) => {
    createOrUpdateBond(atom.id, ringAtoms[(index + 1) % ringAtoms.length].id, 1);
  });
  const donors = ringAtoms.filter((atom) => atom.donorRole);
  donors.forEach((donor, index) => {
    if (type === "macropa" && donor.symbol === "O" && index % 2 === 0) return;
    addCarboxylateArm(donor, Math.atan2(donor.y - y, donor.x - x), chelatorId, type);
  });
  const allDonors = labState.atoms.filter((atom) => atom.chelatorId === chelatorId && atom.donorRole);
  labState.selectedAtomIds = allDonors.map((atom) => atom.id);
  return { id: chelatorId, type, donors: allDonors };
}

export function addOpenChelator(type, x, y) {
  const chelatorId = `${type}-${labState.nextAtomId}`;
  const points = [
    ["N", -210, 0], ["C", -145, -54], ["C", -78, -16],
    ["N", 0, 0], ["C", 78, -16], ["C", 145, -54], ["N", 210, 0]
  ];
  const chain = points.map(([symbol, dx, dy], index) => {
    const atom = addAtom(symbol, x + dx, y + dy + Math.sin(index) * 18);
    atom.chelatorId = chelatorId;
    atom.chelatorType = type;
    if (symbol === "N") {
      atom.donorRole = "amine-N";
      atom.structLabel = "N";
    }
    return atom;
  });
  for (let i = 0; i < chain.length - 1; i++) createOrUpdateBond(chain[i].id, chain[i + 1].id, 1);
  chain.forEach((atom, index) => {
    if (atom.symbol === "N") {
      addCarboxylateArm(atom, index < 3 ? -2.25 : index > 3 ? -0.9 : Math.PI / 2, chelatorId, type);
    }
  });
  addCarboxylateArm(chain[1], -Math.PI / 1.15, chelatorId, type);
  addCarboxylateArm(chain[5], -0.18, chelatorId, type);
  const donors = labState.atoms.filter((atom) => atom.chelatorId === chelatorId && atom.donorRole);
  labState.selectedAtomIds = donors.map((atom) => atom.id);
  return { id: chelatorId, type, donors };
}

export function addCarboxylateArm(anchor, angle, chelatorId, type) {
  const linker = addAtom("C", anchor.x + Math.cos(angle) * 50, anchor.y + Math.sin(angle) * 50);
  const carboxyl = addAtom("C", anchor.x + Math.cos(angle) * 96, anchor.y + Math.sin(angle) * 96);
  const normal = angle + Math.PI / 2;
  const oxo = addAtom("O", carboxyl.x + Math.cos(normal) * 34, carboxyl.y + Math.sin(normal) * 34);
  const donorO = addAtom("O", carboxyl.x - Math.cos(normal) * 34, carboxyl.y - Math.sin(normal) * 34);
  [linker, carboxyl, oxo, donorO].forEach((atom) => {
    atom.chelatorId = chelatorId;
    atom.chelatorType = type;
  });
  donorO.donorRole = "carboxylate-O";
  donorO.charge = -1;
  donorO.structLabel = "O-";
  donorO.valenceOverride = 1;
  donorO.suppressImplicitH = true;
  oxo.suppressImplicitH = true;
  createOrUpdateBond(anchor.id, linker.id, 1);
  createOrUpdateBond(linker.id, carboxyl.id, 1);
  createOrUpdateBond(carboxyl.id, oxo.id, 2);
  createOrUpdateBond(carboxyl.id, donorO.id, 1);
  return donorO;
}

export function addRadioisotopePreset(id) {
  const preset = radioisotopePresets.find((item) => item.id === id);
  if (!preset) return reactionResult(false, "Isotope not found", "No such preset exists in the local reference.");
  if (isMetalAtom({ symbol: preset.symbol })) {
    if (findActiveChelator()) return chelateSelectedMetal(preset);
    const point = freeCenterPoint();
    const metal = addAtom(preset.symbol, point.x, point.y, preset.charge || 0);
    applyRadioisotope(metal, preset);
    labState.selectedAtomIds = [metal.id];
    return reactionResult(true, "Radiometal added", `${preset.label}: placed as a separate ion in the model; add DOTA, DTPA or Macropa and press Place metal at center.`, {
      equation: preset.label,
      advice: ["To sketch a metal in a chelator, add a DOTA, DTPA or Macropa fragment."]
    });
  }
  return attachRadiohalogen(preset);
}

export function chelateSelectedMetal(preset = null, preferredChelatorId = "") {
  const chelator = findActiveChelator(preferredChelatorId) || findSelectedCoordinationCavity();
  if (!chelator) {
    return reactionResult(false, "No ring or chelator", "Select a ring on the field or add DOTA, DTPA, Macropa, N4-ring, benzene/cycloalkane, then press M-chelate.", {
      advice: ["After adding a fragment its atoms are usually selected: choose a metal in the element table and press M-chelate.", "Manual mode: select several ring atoms first, then press M-chelate."]
    });
  }
  const center = chelator.center;
  let metal = selectedAtoms().find((atom) => isMetalAtom(atom) && atom.chelatorId !== chelator.id);
  const metalSpec = preset ? { ...preset } : genericMetalSpec(metal?.symbol || labState.selectedElement);
  if (!metalSpec) {
    return reactionResult(false, "Choose a metal", "Choose a metal in the periodic table or place a metal atom on the field first.", {
      advice: ["Examples: Fe, Cu, Zn, Ni, Co, Mn, Mg, Ca, Lu, U. Then press M-chelate."]
    });
  }
  if (!metal) {
    metal = addAtom(metalSpec.symbol, center.x, center.y, metalSpec.charge || 0);
  } else {
    metal.symbol = metalSpec.symbol;
    metal.x = center.x;
    metal.y = center.y;
    metal.charge = metalSpec.charge ?? metal.charge;
  }
  if (preset) applyRadioisotope(metal, preset);
  else {
    delete metal.radioisotope;
    delete metal.radioisotopeKind;
    delete metal.targetMassNumber;
    metal.isotopeShift = 0;
    metal.enrichment = 0;
    metal.valenceOverride = metalSpec.valence;
  }
  metal.chelatedBy = chelator.id;
  metal.structLabel = metalSpec.label;
  metal.role = metal.role || "payload";
  metal.roleLabel = metal.roleLabel || "Metal";
  const donors = chelator.donors
    .slice()
    .sort((a, b) => distance(a, metal) - distance(b, metal))
    .slice(0, Math.min(chelator.donors.length, metalSpec.valence || 6));
  donors.forEach((donor) => createOrUpdateBond(metal.id, donor.id, "coordination"));
  labState.selectedAtomIds = [metal.id, ...donors.map((atom) => atom.id)];
  labState.selectedBondId = null;
  centerMolecule(false);
  return reactionResult(true, "Metal placed in center", metalSpec.label + ": created " + donors.length + " coordination bonds with " + chelator.type + ".", {
    equation: chelator.type + " + " + metalSpec.label + " -> " + metalSpec.label + "?" + chelator.type,
    uses: "Generic educational mode: place almost any metal into a selected ring or donor cavity and compare charge, valence, stability and strain.",
    advice: ["Coordination dotted bonds do not consume normal covalent valence in this sandbox.", "Use V+/V- and charge controls to model another oxidation state.", "Real complex chemistry needs pH, solvent, stability constants and geometry; here it is a visual model."]
  });
}

export function genericMetalSpec(symbol) {
  const element = getElement(symbol);
  if (!element || !isMetalAtom({ symbol: element.symbol })) return null;
  const valence = defaultCoordinationNumber(element);
  const charge = defaultMetalCharge(element);
  return {
    symbol: element.symbol,
    label: element.symbol,
    charge,
    valence,
    note: element.name + ": generic metal without isotope preset."
  };
}

export function defaultCoordinationNumber(element) {
  if (element.category === "lanthanide" || element.category === "actinide") return 8;
  if (element.category === "alkali") return 4;
  if (element.category === "alkaline") return 6;
  if (element.category === "transition") return 6;
  return Math.max(2, Math.min(6, Math.max(...element.valences.filter((value) => value > 0))));
}

export function defaultMetalCharge(element) {
  const positives = element.valences.filter((value) => value > 0);
  if (element.category === "alkali") return 1;
  if (element.category === "alkaline") return 2;
  if (element.category === "lanthanide" || element.category === "actinide") return positives.includes(3) ? 3 : positives[0] || 0;
  if (element.symbol === "Fe") return 2;
  if (element.symbol === "Cu") return 2;
  return positives[0] || 0;
}

export function attachRadiohalogen(preset) {
  if (preset.id === "f18" && (labState.lastAnalysis?.counts.C || 0) === 6 && (labState.lastAnalysis?.counts.O || 0) >= 5) {
    buildMoleculeFromFormula({ C: 6, H: 11, F: 1, O: 5 }, "C6H11FO5", {
      type: "formula",
      formula: "C6H11FO5",
      commonName: "18F-FDG",
      className: "радиофторированная глюкоза",
      structure: "fdg",
      note: "Фтор-18 заменяет одну OH-группу: учебная аналогия с диагностическим радиотрейсером."
    });
    return reactionResult(true, "18F added to glucose", "An illustrative 18F-FDG sketch was built.", {
      equation: "glucose + 18F -> 18F-FDG",
      advice: ["F-18 is a nonmetal; this example depicts it as a covalent label rather than a metal in DOTA."]
    });
  }
  const anchor = selectedAtoms().find((atom) => !isHydrogenLike(atom.symbol)) || labState.atoms.find((atom) => atom.symbol === "C") || null;
  const point = anchor ? { x: anchor.x + 78, y: anchor.y - 26 } : freeCenterPoint();
  const atom = addAtom(preset.symbol, point.x, point.y, preset.charge || 0);
  applyRadioisotope(atom, preset);
  atom.structLabel = preset.label;
  if (anchor) createOrUpdateBond(anchor.id, atom.id, 1);
  labState.selectedAtomIds = anchor ? [anchor.id, atom.id] : [atom.id];
  labState.selectedBondId = null;
  return reactionResult(true, "Radiolabel added", `${preset.label}: ${preset.note}`, {
    equation: anchor ? `R-H + ${preset.label} -> R-${preset.symbol}` : preset.label,
    uses: "In this illustrative model, a nonmetal radionuclide can be attached to an organic fragment as a label.",
    advice: ["For metals, use DOTA, DTPA or Macropa and Place metal at center."]
  });
}

export function applyRadioisotope(atom, preset) {
  if (!atom || !preset) return;
  atom.symbol = preset.symbol;
  atom.targetMassNumber = preset.massNumber;
  atom.isotopeShift = preset.massNumber - isotopeBaseMassNumber(getElement(preset.symbol));
  atom.enrichment = 1;
  atom.radioisotope = preset.label;
  atom.radioisotopeKind = preset.kind;
  atom.valenceOverride = preset.valence || atom.valenceOverride;
  atom.charge = preset.charge ?? atom.charge;
}

export function findActiveChelator(preferredChelatorId = "") {
  const chelatorIds = [...new Set(labState.atoms.map((atom) => atom.chelatorId).filter(Boolean))];
  if (!chelatorIds.length) return null;
  const selectedChelatorId = selectedAtoms().map((atom) => atom.chelatorId).find(Boolean);
  const id = preferredChelatorId || selectedChelatorId || chelatorIds[chelatorIds.length - 1];
  const chelatorAtoms = labState.atoms.filter((atom) => atom.chelatorId === id);
  const donors = chelatorAtoms.filter((atom) => atom.donorRole);
  return {
    id,
    type: chelatorAtoms[0]?.chelatorType || "chelator",
    atoms: chelatorAtoms,
    donors,
    center: centerOfAtomIds(donors.length ? donors.map((atom) => atom.id) : chelatorAtoms.map((atom) => atom.id))
  };
}

export function findSelectedCoordinationCavity() {
  const selected = selectedAtoms().filter((atom) => !isMetalAtom(atom));
  if (selected.length < 3) return null;
  const donors = selected.filter((atom) => ["N", "O", "S", "P", "C"].includes(atom.symbol));
  if (donors.length < 3) return null;
  return {
    id: `selection-${donors.map((atom) => atom.id).join("-")}`,
    type: "selected-ring",
    atoms: donors,
    donors,
    center: centerOfAtomIds(donors.map((atom) => atom.id))
  };
}
