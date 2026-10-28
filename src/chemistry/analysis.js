import { addCount, formulaFromCounts, groupMass, mergeCounts } from "./formula.js";
import { allowedValencesFor, atomMass, bondOrderValue, chooseIdealValence, countAromaticRings, countSmallRings, desiredBondLength, inferImplicitHydrogens, isotopeLabel, valenceUsage } from "./properties.js";
import { getAtom, getElement, isMetalAtom } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { clamp, distance, formatNumber, nearlyEqual, signed } from "../utils/format.js";

export function analyzeMolecule() {
  const atomMap = new Map();
  const issues = [];
  const counts = {};
  let mass = 0;
  let totalCharge = 0;
  let score = 100;
  let strainEnergy = 0;

  labState.atoms.forEach((atom) => {
    const normalUsage = valenceUsage(atom.id);
    const coordinationUsage = isMetalAtom(atom)
      ? labState.bonds.filter((bond) => (bond.a === atom.id || bond.b === atom.id) && bond.order === "coordination").length
      : 0;
    const usage = coordinationUsage || normalUsage;
    const element = getElement(atom.symbol);
    const allowedValences = allowedValencesFor(atom, element);
    const maxValence = Math.max(...allowedValences);
    const ideal = chooseIdealValence(atom, element, usage);
    const implicitH = inferImplicitHydrogens(atom, usage, ideal);
    const totalValence = usage + implicitH;
    const allowed = allowedValences.some((valence) => nearlyEqual(totalValence, valence));
    const over = usage > maxValence + 0.05;
    const under = !over && !allowed && totalValence < Math.min(...allowedValences);
    let state = "ok";
    let detail = "valence consistent within model";

    if (over) {
      state = "bad";
      detail = `overloaded: ${formatNumber(usage)} > ${maxValence}`;
      issues.push({ kind: "bad", title: `${atom.symbol}${atom.id}: valence exceeded`, text: detail });
      score -= 26 + (usage - maxValence) * 14;
    } else if (under && allowedValences[0] !== 0) {
      state = "warn";
      detail = `incomplete valence: ${formatNumber(totalValence)} of ${allowedValences.join("/")}`;
      issues.push({ kind: "warn", title: `${atom.symbol}${atom.id}: unfilled valence`, text: detail });
      score -= 7;
    }

    const expectedChelatorCharge = atom.donorRole === "carboxylate-O" && atom.chelatorId && atom.charge === -1;
    const expectedChelatedMetalCharge = Boolean(atom.chelatedBy && atom.radioisotope && atom.charge > 0);
    if (atom.charge !== 0 && !expectedChelatorCharge && !expectedChelatedMetalCharge) {
      score -= Math.min(18, Math.abs(atom.charge) * 7);
      issues.push({ kind: "warn", title: `${atom.symbol}${atom.id}: formal charge ${signed(atom.charge)}`, text: "In this model, charge affects stability and polarity." });
    }

    if (element.category === "noble" && usage > 0) {
      score -= 30;
      state = "bad";
      issues.push({ kind: "bad", title: `${atom.symbol}${atom.id}: bonded noble gas`, text: "This bond is treated as unstable in this illustrative model." });
    }

    atomMap.set(atom.id, { atom, usage, implicitH, totalValence, state, detail, element, allowedValences });
  });

  labState.bonds.forEach((bond) => {
    const a = getAtom(bond.a);
    const b = getAtom(bond.b);
    if (!a || !b) return;
    const desired = desiredBondLength(bond);
    const actual = distance(a, b);
    strainEnergy += Math.pow((actual - desired) / 42, 2) * bondOrderValue(bond.order);
    const enA = getElement(a.symbol).electronegativity;
    const enB = getElement(b.symbol).electronegativity;
    if (enA != null && enB != null && Math.abs(enA - enB) > 1.9) {
      issues.push({ kind: "warn", title: `${a.symbol}-${b.symbol}: strongly polar bond`, text: `Δχ=${formatNumber(Math.abs(enA - enB))}` });
      score -= 2;
    }
  });

  const aromaticRings = countAromaticRings();
  if (aromaticRings > 0) {
    score += aromaticRings * 6;
    issues.push({ kind: "ok", title: `Aromaticity: ${aromaticRings}`, text: "In this model, delocalization increases ring stability." });
  }

  const smallRingPenalty = countSmallRings() * 8;
  if (smallRingPenalty) {
    score -= smallRingPenalty;
    issues.push({ kind: "warn", title: "Ring strain (model estimate)", text: `model penalty ${smallRingPenalty}` });
  }

  score -= Math.min(18, strainEnergy * 0.7);

  const freeRadioMetals = labState.atoms.filter((atom) => atom.radioisotope && isMetalAtom(atom) && !atom.chelatedBy);
  if (freeRadioMetals.length) {
    score -= 16;
    issues.push({ kind: "warn", title: "Unchelated radiometal", text: `${freeRadioMetals.map((atom) => atom.radioisotope || isotopeLabel(atom)).join(", ")} — model suggestion: place in DOTA/DTPA/Macropa.` });
  }

  labState.atoms.filter((atom) => atom.chelatedBy).forEach((metal) => {
    const coordination = labState.bonds.filter((bond) => (bond.a === metal.id || bond.b === metal.id) && bond.order === "coordination").length;
    const metalLabel = metal.radioisotope || metal.structLabel || metal.symbol;
    if (coordination < 4) {
      score -= 10;
      issues.push({ kind: "warn", title: `${metalLabel}: weak coordination in model`, text: `coordination bonds: ${coordination}; this illustrative model normally expects 4-8 for a stable coordination cage.` });
    } else {
      issues.push({ kind: "ok", title: `${metalLabel} in chelator`, text: `coordination bonds: ${coordination}; the model represents the radiometal as held by the donor cage.` });
    }
  });

  const hasChelator = labState.atoms.some((atom) => atom.chelatorId);
  const hasPayload = labState.atoms.some((atom) => atom.radioisotope || atom.chelatedBy);
  const hasTarget = labState.atoms.some((atom) => atom.role === "target");
  const hasRadioligandIntent = labState.compoundMeta?.structure === "radioligand" || labState.atoms.some((atom) => atom.role === "linker");
  if (hasRadioligandIntent && hasChelator && hasPayload && !hasTarget) {
    score -= 4;
    issues.push({ kind: "warn", title: "No target block", text: "The chelator and radiometal are assembled. For a radioligand sketch, add a target and linker with the “Target / linker / DOTA” button." });
  }

  labState.atoms.forEach((atom) => {
    const report = atomMap.get(atom.id);
    const atomCountValue = atom.count || 1;
    if (atom.groupCounts) {
      mergeCounts(counts, atom.groupCounts, atomCountValue);
      mass += groupMass(atom.groupCounts) * atomCountValue;
    } else {
      addCount(counts, atom.symbol, atomCountValue);
      mass += atomMass(atom, report.element) * atomCountValue;
    }
    totalCharge += atom.charge * atomCountValue;
    if (!atom.groupCounts && report.implicitH > 0) {
      const atomCountValue = atom.count || 1;
      addCount(counts, "H", report.implicitH * atomCountValue);
      mass += getElement("H").mass * report.implicitH * atomCountValue;
    }
  });

  if (labState.atoms.length === 0) {
    score = 0;
    issues.push({ kind: "warn", title: "No atoms", text: "Add an element from the periodic table." });
  }

  return {
    atomMap,
    issues,
    counts,
    formula: formulaFromCounts(counts),
    mass,
    totalCharge,
    score: clamp(Math.round(score), 0, 100),
    strainEnergy,
    aromaticRings
  };
}
