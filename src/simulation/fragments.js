import { analyzeMolecule } from "../chemistry/analysis.js";
import { buildMoleculeFromFormula } from "../chemistry/builders.js";
import { addChelator, chelateSelectedMetal } from "../chemistry/coordination.js";
import { isHydrogenLike, neighborsOf, valenceUsage } from "../chemistry/properties.js";
import { radioisotopePresets } from "../data/catalogs.js";
import { centerMolecule, freeCenterPoint } from "../render/camera.js";
import { triggerReactionEffect } from "../render/effects.js";
import { connects, getAtom } from "./graph.js";
import { addAtom, addAtomAttached, createOrUpdateBond, removeAtom } from "./molecule.js";
import { analyzeAndRender } from "./update.js";
import { state as labState } from "../state.js";
import { logReaction, reactionResult } from "../ui/journal.js";

export function addFragment(fragment) {
  const before = analyzeMolecule();
  const point = freeCenterPoint();
  let specialResult = null;
  if (fragment === "benzene") addBenzene(point.x, point.y);
  if (fragment === "ring5") addRing(point.x, point.y, 5, 88, "C", 1);
  if (fragment === "cyclohexane") addRing(point.x, point.y, 6, 96, "C", 1);
  if (fragment === "ring7") addRing(point.x, point.y, 7, 108, "C", 1);
  if (fragment === "n4ring") addDonorRing(point.x, point.y);
  if (fragment === "ethanol") addEthanol(point.x, point.y);
  if (fragment === "water") addWater(point.x, point.y);
  if (fragment === "methane") addMethane(point.x, point.y);
  if (fragment === "dota") addChelator("dota", point.x, point.y);
  if (fragment === "dtpa") addChelator("dtpa", point.x, point.y);
  if (fragment === "macropa") addChelator("macropa", point.x, point.y);
  if (fragment === "radioligand") specialResult = addRadioligandScaffold(point.x, point.y);
  if (fragment === "fdg") buildMoleculeFromFormula({ C: 6, H: 11, F: 1, O: 5 }, "C6H11FO5", {
    type: "formula",
    commonName: "18F-FDG",
    className: "радиофторированная глюкоза",
    structure: "fdg",
    note: "Учебная модель 18F-фтордезоксиглюкозы: неметаллическая радиометка на сахарном каркасе."
  });
  centerMolecule(false);
  analyzeAndRender();
  if (specialResult) {
    logReaction(specialResult, before, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, specialResult);
    return;
  }
  if (["dota", "dtpa", "macropa"].includes(fragment)) {
    logReaction(reactionResult(true, "Хелатор добавлен", `${fragment.toUpperCase()}: клетка с N/O-донорами для удержания радиометалла.`, {
      equation: `${fragment.toUpperCase()} + Mⁿ⁺ -> M⊂${fragment.toUpperCase()}`,
      uses: "Хелаторы нужны в радиофарммоделях, чтобы показать перенос металла в защищённой координационной клетке.",
      advice: ["Теперь нажмите Lu-177, Y-90, Cu-67, Ac-225 или кнопку M⊂Хелат."]
    }), before, labState.lastAnalysis);
  }
}

export function addRadioligandScaffold(x = 500, y = 350) {
  const chelator = addChelator("dota", x + 170, y);
  const chelateResult = chelateSelectedMetal(radioisotopePresets.find((item) => item.id === "lu177"), chelator.id);
  const chelatorAnchor = labState.atoms.find((atom) => atom.chelatorId === chelator.id && atom.symbol === "C" && !atom.donorRole && valenceUsage(atom.id) < 4)
    || labState.atoms.find((atom) => atom.chelatorId === chelator.id && atom.donorRole)
    || labState.atoms.find((atom) => atom.chelatorId === chelator.id);
  const metal = labState.atoms.find((atom) => atom.chelatedBy === chelator.id);

  const target = addRoleNode("Target", "target", { C: 26, H: 40, N: 8, O: 8, S: 1 }, x - 260, y - 18, 1);
  const linker = addRoleNode("Linker", "linker", { C: 8, H: 12, N: 2, O: 3 }, x - 80, y + 14, 2);
  createOrUpdateBond(target.id, linker.id, 1);
  if (chelatorAnchor) createOrUpdateBond(linker.id, chelatorAnchor.id, 1);

  if (chelatorAnchor) {
    chelatorAnchor.role = "chelator";
    chelatorAnchor.roleLabel = "Chelator";
  }
  if (metal) {
    metal.role = "payload";
    metal.roleLabel = "Payload";
  }

  labState.selectedAtomIds = [target.id, linker.id, ...(metal ? [metal.id] : []), ...(chelatorAnchor ? [chelatorAnchor.id] : [])];
  labState.selectedBondId = null;
  labState.compoundMeta = {
    ...(labState.compoundMeta || {}),
    inputType: "fragment",
    sourceFormula: "radioligand",
    displayFormula: "Target-Linker-DOTA⊂177Lu",
    structure: "radioligand",
    commonName: "радиолигандная модель",
    className: "концептуальная схема радиофармпрепарата",
    note: "Схема делит молекулу на роли: мишень узнает рецептор, линкер держит расстояние, DOTA удерживает радиометалл.",
    uses: ["разделение ролей", "хелаторная химия", "радиолигандная идея"],
    hazards: ["учебная визуализация без доз, синтеза и медицинских инструкций"],
    external: null,
    rdkit: null
  };
  centerMolecule(false);
  return reactionResult(Boolean(chelateResult?.success), "Доставка собрана", "Построена учебная схема Target-Linker-DOTA⊂177Lu: металл спрятан в хелаторе, а мишень и линкер показывают идею доставки.", {
    equation: "Target-Linker-DOTA + 177Lu3+ -> Target-Linker-DOTA⊂177Lu",
    uses: "Практический смысл такой схемы в разделении задач: биологическая часть выбирает адрес, линкер настраивает расстояние и растворимость, хелатор удерживает металл.",
    advice: [
      "Поменяйте радиометалл кнопками 90Y, 67Cu, 225Ac и сравните предупреждения по координации.",
      "Нажмите «▣ Группы», чтобы свернуть мелкие OH/CH3/NH2-фрагменты и читать крупную архитектуру.",
      "Это концептуальная безопасная модель: она не задает дозировки, протоколы синтеза или медицинское применение."
    ]
  });
}

export function addRoleNode(label, role, groupCounts, x, y, groupValence = 1) {
  const atom = addAtom("C", x, y);
  atom.structLabel = label;
  atom.role = role;
  atom.roleLabel = label;
  atom.groupCounts = { ...groupCounts };
  atom.groupValence = groupValence;
  atom.suppressImplicitH = true;
  return atom;
}

export function runDeliveryDemo() {
  if (labState.atoms.some((atom) => atom.role === "target" || atom.role === "linker") && labState.atoms.some((atom) => atom.chelatedBy)) {
    return reactionResult(false, "Доставка уже показана", "На поле уже есть мишень, линкер и хелированный радиометалл.", {
      advice: ["Можно заменить радиометалл кнопками изотопов или стереть часть схемы и собрать заново."]
    });
  }
  return addRadioligandScaffold(500, 350);
}

export function collapseFunctionalGroups() {
  const changed = collapseCarboxylGroups()
    + collapseHydroxyGroups()
    + collapseHydrogenRichGroups("N", 2, "NH2")
    + collapseHydrogenRichGroups("C", 3, "CH3");

  if (!changed) {
    return reactionResult(false, "Группы не найдены", "Не нашлось явных OH, COOH/COO-, NH2 или CH3, которые можно свернуть без потери учебной схемы.", {
      advice: ["Попробуйте глюкозу, DTPA/DOTA без уже связанного металла, этанол или любую органическую цепочку с явными H/O/N."]
    });
  }

  labState.selectedAtomIds = labState.atoms.filter((atom) => atom.groupCounts).map((atom) => atom.id).slice(0, 12);
  labState.selectedBondId = null;
  centerMolecule(false);
  return reactionResult(true, "Функциональные группы свернуты", `Свернуто ${changed} фрагмент(ов): формула и масса сохраняются через групповые счетчики.`, {
    equation: "явные атомы -> компактные фрагменты OH / COOH / NH2 / CH3",
    uses: "Так легче читать большие биоорганические и хелаторные молекулы: вместо леса мелких H/O видно архитектуру.",
    advice: ["Повторное редактирование возможно: свернутый узел можно удалить или соединить как обычный атомный фрагмент.", "Для точной атомной геометрии лучше вводить SMILES и сверять карточку RDKit/PubChem."]
  });
}

export function collapseHydroxyGroups() {
  let changed = 0;
  [...labState.atoms].forEach((oxygen) => {
    if (!getAtom(oxygen.id) || oxygen.symbol !== "O" || oxygen.groupCounts) return;
    const neighbors = neighborsOf(oxygen.id).map(getAtom).filter(Boolean);
    const hNeighbors = neighbors.filter((atom) => isHydrogenLike(atom.symbol));
    const external = neighbors.filter((atom) => !isHydrogenLike(atom.symbol));
    if (!hNeighbors.length || !external.length) return;
    oxygen.groupCounts = { O: 1, H: 1 };
    oxygen.groupValence = external.length;
    oxygen.structLabel = "OH";
    oxygen.suppressImplicitH = true;
    removeAtomsByIds(hNeighbors.map((atom) => atom.id));
    changed++;
  });
  return changed;
}

export function collapseCarboxylGroups() {
  let changed = 0;
  [...labState.atoms].forEach((carbon) => {
    if (!getAtom(carbon.id) || carbon.symbol !== "C" || carbon.groupCounts || carbon.chelatorId) return;
    const neighbors = neighborsOf(carbon.id).map(getAtom).filter(Boolean);
    const oxygens = neighbors.filter((atom) => atom.symbol === "O");
    if (oxygens.length < 2) return;
    const external = neighbors.filter((atom) => atom.symbol !== "O");
    const hydrogens = [];
    oxygens.forEach((oxygen) => {
      neighborsOf(oxygen.id).map(getAtom).filter((atom) => atom && isHydrogenLike(atom.symbol)).forEach((atom) => hydrogens.push(atom));
    });
    const hasHydrogen = hydrogens.length > 0;
    carbon.groupCounts = hasHydrogen ? { C: 1, O: 2, H: 1 } : { C: 1, O: 2 };
    carbon.groupValence = external.length;
    carbon.structLabel = hasHydrogen ? "COOH" : "COO-";
    carbon.suppressImplicitH = true;
    carbon.charge = hasHydrogen ? 0 : -1;
    removeAtomsByIds([...oxygens.map((atom) => atom.id), ...hydrogens.map((atom) => atom.id)]);
    changed++;
  });
  return changed;
}

export function collapseHydrogenRichGroups(symbol, hydrogenCount, label) {
  let changed = 0;
  [...labState.atoms].forEach((atom) => {
    if (!getAtom(atom.id) || atom.symbol !== symbol || atom.groupCounts) return;
    const neighbors = neighborsOf(atom.id).map(getAtom).filter(Boolean);
    const hydrogens = neighbors.filter((item) => isHydrogenLike(item.symbol));
    const external = neighbors.filter((item) => !isHydrogenLike(item.symbol));
    if (hydrogens.length < hydrogenCount || external.length > 2) return;
    atom.groupCounts = { [symbol]: 1, H: hydrogenCount };
    atom.groupValence = external.length;
    atom.structLabel = label;
    atom.suppressImplicitH = true;
    removeAtomsByIds(hydrogens.slice(0, hydrogenCount).map((item) => item.id));
    changed++;
  });
  return changed;
}

export function removeAtomsByIds(ids) {
  [...new Set(ids)].forEach((id) => {
    if (getAtom(id)) removeAtom(id);
  });
}

export function addBenzene(cx, cy) {
  const ringAtoms = [];
  const radius = 96;
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 3;
    ringAtoms.push(addAtom("C", cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
  }
  for (let i = 0; i < 6; i++) {
    createOrUpdateBond(ringAtoms[i].id, ringAtoms[(i + 1) % 6].id, "aromatic");
  }
  labState.selectedAtomIds = ringAtoms.map((atom) => atom.id);
  labState.selectedBondId = null;
  logReaction("Добавлен бензольный фрагмент C6H6.");
}

export function addRing(cx, cy, count, radius, symbol, order) {
  const ringAtoms = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    ringAtoms.push(addAtom(symbol, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
  }
  for (let i = 0; i < count; i++) {
    createOrUpdateBond(ringAtoms[i].id, ringAtoms[(i + 1) % count].id, order);
  }
  labState.selectedAtomIds = ringAtoms.map((atom) => atom.id);
  labState.selectedBondId = null;
  logReaction(`Добавлен фрагмент ${symbol}${count}.`);
}

export function addDonorRing(cx, cy) {
  const ringSize = 12;
  const radius = 112;
  const cavityId = `free-n4-${labState.nextAtomId}`;
  const donorPositions = new Set([0, 3, 6, 9]);
  const ringAtoms = [];
  for (let i = 0; i < ringSize; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / ringSize;
    const donor = donorPositions.has(i);
    const atom = addAtom(donor ? "N" : "C", cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    atom.chelatorId = cavityId;
    atom.chelatorType = "N4-ring";
    if (donor) {
      atom.donorRole = "ring-N";
      atom.structLabel = "N";
    }
    ringAtoms.push(atom);
  }
  ringAtoms.forEach((atom, index) => createOrUpdateBond(atom.id, ringAtoms[(index + 1) % ringAtoms.length].id, 1));
  labState.selectedAtomIds = ringAtoms.map((atom) => atom.id);
  labState.selectedBondId = null;
  logReaction("Добавлено N4-кольцо: свободная донорная полость, куда можно посадить любой выбранный металл кнопкой M⊂Хелат.");
}

export function addEthanol(cx, cy) {
  const c1 = addAtom("C", cx - 88, cy);
  const c2 = addAtom("C", cx, cy);
  const o = addAtom("O", cx + 86, cy);
  const h = addAtom("H", cx + 146, cy - 48);
  createOrUpdateBond(c1.id, c2.id, 1);
  createOrUpdateBond(c2.id, o.id, 1);
  createOrUpdateBond(o.id, h.id, 1);
  labState.selectedAtomIds = [c1.id, c2.id, o.id, h.id];
  labState.selectedBondId = null;
  logReaction("Добавлен этанол C2H6O.");
}

export function addWater(cx, cy) {
  const o = addAtom("O", cx, cy);
  const h1 = addAtom("H", cx - 68, cy + 36);
  const h2 = addAtom("H", cx + 68, cy + 36);
  createOrUpdateBond(o.id, h1.id, 1);
  createOrUpdateBond(o.id, h2.id, 1);
  labState.selectedAtomIds = [o.id, h1.id, h2.id];
  labState.selectedBondId = null;
  logReaction("Добавлена молекула воды H2O.");
}

export function addMethane(cx, cy) {
  const c = addAtom("C", cx, cy);
  [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4].forEach((angle) => addAtomAttached("H", c.id, angle, 76));
  labState.selectedAtomIds = [c.id];
  labState.selectedBondId = null;
  logReaction("Добавлен метан CH4.");
}

export function toggleBenzeneBonds() {
  const ring = findSixCarbonRing();
  if (!ring) return reactionResult(false, "Бензольное кольцо не найдено", "Добавьте бензол или замкните шесть атомов C в кольцо.", {
    advice: ["Нажмите фрагмент «Бензол», затем попробуйте переключить ароматичность снова."]
  });
  const ringBonds = ringToBonds(ring);
  const allAromatic = ringBonds.every((bond) => bond.order === "aromatic");
  ringBonds.forEach((bond, index) => {
    bond.order = allAromatic ? (index % 2 === 0 ? 2 : 1) : "aromatic";
  });
  labState.selectedAtomIds = ring;
  labState.selectedBondId = null;
  return reactionResult(true, "Изменение бензольного кольца", allAromatic ? "Ароматическое кольцо переведено в чередующиеся C-C/C=C связи." : "Кольцо переведено в ароматическое состояние с делокализацией.", {
    equation: allAromatic ? "C6H6(аром.) -> C6H6(Кекуле)" : "C6H6(Кекуле) -> C6H6(аром.)",
    uses: "Бензольные кольца встречаются в красителях, полимерах, растворителях и многих лекарственных молекулах.",
    advice: allAromatic
      ? ["Верните ароматичность, если хотите увидеть прибавку устойчивости от делокализации."]
      : ["К ароматическому кольцу удобно добавлять заместители: Cl, OH, NO2-подобные фрагменты."]
  });
}

export function findSixCarbonRing() {
  const selectedSet = new Set(labState.selectedAtomIds);
  const adjacency = new Map();
  labState.atoms.filter((atom) => atom.symbol === "C").forEach((atom) => adjacency.set(atom.id, []));
  labState.bonds.forEach((bond) => {
    const a = getAtom(bond.a);
    const b = getAtom(bond.b);
    if (a?.symbol === "C" && b?.symbol === "C") {
      adjacency.get(a.id)?.push(b.id);
      adjacency.get(b.id)?.push(a.id);
    }
  });

  const rings = [];
  for (const start of adjacency.keys()) {
    dfsRing(start, start, [start], adjacency, rings);
  }
  const unique = new Map();
  rings.forEach((ring) => {
    const key = [...ring].sort((a, b) => a - b).join("-");
    if (!unique.has(key)) unique.set(key, ring);
  });
  const values = [...unique.values()];
  return values.find((ring) => ring.some((id) => selectedSet.has(id))) || values[0] || null;
}

export function dfsRing(start, current, path, adjacency, rings) {
  if (path.length === 6) {
    if (adjacency.get(current)?.includes(start)) rings.push([...path]);
    return;
  }
  for (const next of adjacency.get(current) || []) {
    if (next < start) continue;
    if (path.includes(next)) continue;
    dfsRing(start, next, [...path, next], adjacency, rings);
  }
}

export function ringToBonds(ring) {
  const result = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const bond = labState.bonds.find((item) => connects(item, a, b));
    if (bond) result.push(bond);
  }
  return result;
}
