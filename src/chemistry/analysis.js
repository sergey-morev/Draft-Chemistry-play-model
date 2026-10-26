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
    let detail = "валентность согласована";

    if (over) {
      state = "bad";
      detail = `перегружен: ${formatNumber(usage)} > ${maxValence}`;
      issues.push({ kind: "bad", title: `${atom.symbol}${atom.id}: превышение валентности`, text: detail });
      score -= 26 + (usage - maxValence) * 14;
    } else if (under && allowedValences[0] !== 0) {
      state = "warn";
      detail = `неполная оболочка: ${formatNumber(totalValence)} из ${allowedValences.join("/")}`;
      issues.push({ kind: "warn", title: `${atom.symbol}${atom.id}: свободная валентность`, text: detail });
      score -= 7;
    }

    const expectedChelatorCharge = atom.donorRole === "carboxylate-O" && atom.chelatorId && atom.charge === -1;
    const expectedChelatedMetalCharge = Boolean(atom.chelatedBy && atom.radioisotope && atom.charge > 0);
    if (atom.charge !== 0 && !expectedChelatorCharge && !expectedChelatedMetalCharge) {
      score -= Math.min(18, Math.abs(atom.charge) * 7);
      issues.push({ kind: "warn", title: `${atom.symbol}${atom.id}: формальный заряд ${signed(atom.charge)}`, text: "заряд влияет на устойчивость и полярность" });
    }

    if (element.category === "noble" && usage > 0) {
      score -= 30;
      state = "bad";
      issues.push({ kind: "bad", title: `${atom.symbol}${atom.id}: инертный газ со связью`, text: "для этой учебной модели такая связь нестабильна" });
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
      issues.push({ kind: "warn", title: `${a.symbol}-${b.symbol}: сильно полярная связь`, text: `Δχ=${formatNumber(Math.abs(enA - enB))}` });
      score -= 2;
    }
  });

  const aromaticRings = countAromaticRings();
  if (aromaticRings > 0) {
    score += aromaticRings * 6;
    issues.push({ kind: "ok", title: `Ароматичность: ${aromaticRings}`, text: "делокализация повышает устойчивость кольца" });
  }

  const smallRingPenalty = countSmallRings() * 8;
  if (smallRingPenalty) {
    score -= smallRingPenalty;
    issues.push({ kind: "warn", title: "Кольцевое напряжение", text: `штраф модели ${smallRingPenalty}` });
  }

  score -= Math.min(18, strainEnergy * 0.7);

  const freeRadioMetals = labState.atoms.filter((atom) => atom.radioisotope && isMetalAtom(atom) && !atom.chelatedBy);
  if (freeRadioMetals.length) {
    score -= 16;
    issues.push({ kind: "warn", title: "Свободный радиометалл", text: `${freeRadioMetals.map((atom) => atom.radioisotope || isotopeLabel(atom)).join(", ")} лучше поместить в DOTA/DTPA/Macropa.` });
  }

  labState.atoms.filter((atom) => atom.chelatedBy).forEach((metal) => {
    const coordination = labState.bonds.filter((bond) => (bond.a === metal.id || bond.b === metal.id) && bond.order === "coordination").length;
    const metalLabel = metal.radioisotope || metal.structLabel || metal.symbol;
    if (coordination < 4) {
      score -= 10;
      issues.push({ kind: "warn", title: `${metalLabel}: слабая координация`, text: `координационных связей ${coordination}; для устойчивой учебной клетки обычно нужно 4-8.` });
    } else {
      issues.push({ kind: "ok", title: `${metalLabel} в хелаторе`, text: `координационных связей ${coordination}; радиометалл удерживается донорной клеткой.` });
    }
  });

  const hasChelator = labState.atoms.some((atom) => atom.chelatorId);
  const hasPayload = labState.atoms.some((atom) => atom.radioisotope || atom.chelatedBy);
  const hasTarget = labState.atoms.some((atom) => atom.role === "target");
  const hasRadioligandIntent = labState.compoundMeta?.structure === "radioligand" || labState.atoms.some((atom) => atom.role === "linker");
  if (hasRadioligandIntent && hasChelator && hasPayload && !hasTarget) {
    score -= 4;
    issues.push({ kind: "warn", title: "Нет блока мишени", text: "Хелатор с радиометаллом собран, но для радиолиганда можно добавить мишень и линкер кнопкой «→ Мишень»." });
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
    issues.push({ kind: "warn", title: "Нет атомов", text: "добавьте элемент из таблицы" });
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
