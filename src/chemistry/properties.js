import { isotopeSymbols, organicSymbols } from "../data/elements.js";
import { findSixCarbonRing, ringToBonds } from "../simulation/fragments.js";
import { connects, getAtom, getElement, isIntermolecularBond } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { clamp, nearlyEqual } from "../utils/format.js";

export function valenceUsage(atomId) {
  const atom = getAtom(atomId);
  if ((atom?.count || 1) > 1) return 0;
  return labState.bonds.reduce((sum, bond) => {
    if (bond.a !== atomId && bond.b !== atomId) return sum;
    return sum + valenceBondValue(bond.order);
  }, 0);
}

export function allowedValencesFor(atom, element) {
  if (atom.groupValence != null) return [atom.groupValence];
  if (atom.valenceOverride != null) return [atom.valenceOverride];
  return element.valences;
}

export function chooseIdealValence(atom, element, usage) {
  const sorted = [...allowedValencesFor(atom, element)].sort((a, b) => a - b);
  return sorted.find((valence) => valence >= usage - 0.05) ?? sorted[sorted.length - 1] ?? 0;
}

export function atomMass(atom, element = getElement(atom.symbol)) {
  const enrichment = clamp(atom.enrichment || 0, 0, 1);
  const shift = atom.isotopeShift || 0;
  if (atom.targetMassNumber) return element.mass * (1 - enrichment) + atom.targetMassNumber * enrichment;
  return element.mass + shift * enrichment;
}

export function isotopeBaseMassNumber(element) {
  if (element.symbol === "D") return 2;
  if (element.symbol === "T") return 3;
  return Math.max(1, Math.round(element.mass));
}

export function isotopeMassNumber(atom, element = getElement(atom.symbol)) {
  if (atom.targetMassNumber) return atom.targetMassNumber;
  return isotopeBaseMassNumber(element) + (atom.isotopeShift || 0);
}

export function isotopeLabel(atom, element = getElement(atom.symbol)) {
  return `${atom.symbol}-${isotopeMassNumber(atom, element)}`;
}

export function inferImplicitHydrogens(atom, usage, ideal) {
  if (atom.suppressImplicitH) return 0;
  if (atom.groupCounts) return 0;
  if ((atom.count || 1) > 1) return 0;
  if (isHydrogenLike(atom.symbol)) return 0;
  if (!organicSymbols.has(atom.symbol)) return 0;
  const missing = ideal - usage;
  if (missing <= 0.05) return 0;
  if (!nearlyEqual(missing, Math.round(missing))) return 0;
  return clamp(Math.round(missing), 0, 4);
}

export function isHydrogenLike(symbol) {
  return symbol === "H" || isotopeSymbols.has(symbol);
}

export function desiredBondLength(bond) {
  const a = getElement(getAtom(bond.a)?.symbol || "C");
  const b = getElement(getAtom(bond.b)?.symbol || "C");
  const order = bondOrderValue(bond.order);
  return clamp((a.radius + b.radius) * (0.62 - order * 0.035), 56, 170);
}

export function bondOrderValue(order) {
  if (order === "hbond") return 0.16;
  if (order === "solvation") return 0.22;
  if (order === "ionic") return 0.28;
  if (order === "coordination") return 0.55;
  return order === "aromatic" ? 1.5 : Number(order);
}

export function valenceBondValue(order) {
  if (isIntermolecularBond(order)) return 0;
  return bondOrderValue(order);
}

export function bondOffsets(order, a, b) {
  const value = bondOrderValue(order);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / d;
  const ny = dx / d;
  if (isIntermolecularBond(order)) return [{ x: 0, y: 0 }];
  if (order === "aromatic") return [{ x: 0, y: 0 }, { x: nx * 8, y: ny * 8 }];
  if (value === 1) return [{ x: 0, y: 0 }];
  if (value === 2) return [{ x: nx * 5, y: ny * 5 }, { x: -nx * 5, y: -ny * 5 }];
  return [{ x: 0, y: 0 }, { x: nx * 8, y: ny * 8 }, { x: -nx * 8, y: -ny * 8 }];
}

export function bondClass(order, index) {
  if (order === "aromatic" && index === 1) return "aromatic";
  if (isIntermolecularBond(order)) return order;
  return "";
}

export function atomRadius(element) {
  return clamp(18 + element.radius / 18, 22, 34);
}

export function countAromaticRings() {
  const rings = [];
  const ring = findSixCarbonRing();
  if (!ring) return 0;
  const ringBonds = ringToBonds(ring);
  if (ringBonds.length === 6 && ringBonds.every((bond) => bond.order === "aromatic")) rings.push(ring);
  return rings.length;
}

export function countSmallRings() {
  let count = 0;
  labState.atoms.forEach((atom) => {
    const neighbors = neighborsOf(atom.id);
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (labState.bonds.some((bond) => connects(bond, neighbors[i], neighbors[j]))) count++;
      }
    }
  });
  return Math.floor(count / 3);
}

export function neighborsOf(atomId) {
  return labState.bonds.flatMap((bond) => {
    if (bond.a === atomId) return [bond.b];
    if (bond.b === atomId) return [bond.a];
    return [];
  });
}
