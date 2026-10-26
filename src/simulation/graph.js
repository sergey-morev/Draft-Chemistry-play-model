import { addCount, mergeCounts } from "../chemistry/formula.js";
import { elementBySymbol } from "../data/elements.js";
import { state as labState } from "../state.js";

export function findBondByOrder(order, symbolA, symbolB) {
  const preferred = labState.selectedBondId ? getBond(labState.selectedBondId) : null;
  if (preferred && preferred.order === order && bondHasSymbols(preferred, symbolA, symbolB)) return preferred;
  return labState.bonds.find((bond) => bond.order === order && bondHasSymbols(bond, symbolA, symbolB));
}

export function bondHasSymbols(bond, symbolA, symbolB) {
  const a = getAtom(bond.a)?.symbol;
  const b = getAtom(bond.b)?.symbol;
  return (a === symbolA && b === symbolB) || (a === symbolB && b === symbolA);
}

export function molecularComponents(includeInteractions = true) {
  const adjacency = new Map(labState.atoms.map((atom) => [atom.id, []]));
  labState.bonds.forEach((bond) => {
    if (!includeInteractions && isIntermolecularBond(bond.order)) return;
    adjacency.get(bond.a)?.push(bond.b);
    adjacency.get(bond.b)?.push(bond.a);
  });
  const seen = new Set();
  const components = [];
  labState.atoms.forEach((atom) => {
    if (seen.has(atom.id)) return;
    const stack = [atom.id];
    const ids = [];
    seen.add(atom.id);
    while (stack.length) {
      const id = stack.pop();
      ids.push(id);
      (adjacency.get(id) || []).forEach((next) => {
        if (seen.has(next)) return;
        seen.add(next);
        stack.push(next);
      });
    }
    components.push({
      atomIds: ids,
      center: centerOfAtomIds(ids),
      counts: countsForAtomIds(ids)
    });
  });
  return components.sort((a, b) => b.atomIds.length - a.atomIds.length);
}

export function pickComponentsForCombination(components) {
  if (labState.selectedAtomIds.length >= 2) {
    const selectedComponents = [];
    components.forEach((component) => {
      if (component.atomIds.some((id) => labState.selectedAtomIds.includes(id))) selectedComponents.push(component);
    });
    const unique = [...new Map(selectedComponents.map((component) => [component.atomIds.join(","), component])).values()];
    if (unique.length >= 2) return unique.slice(0, 2);
  }
  let best = [components[0], components[1]];
  let bestDistance = Infinity;
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const d = Math.hypot(components[i].center.x - components[j].center.x, components[i].center.y - components[j].center.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = [components[i], components[j]];
      }
    }
  }
  return best;
}

export function moveComponentToward(first, second) {
  const dx = first.center.x - second.center.x;
  const dy = first.center.y - second.center.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const targetDistance = 145;
  if (d <= targetDistance) return;
  const shift = (d - targetDistance) * 0.48;
  const sx = (dx / d) * shift;
  const sy = (dy / d) * shift;
  second.atomIds.forEach((id) => {
    const atom = getAtom(id);
    atom.x += sx;
    atom.y += sy;
  });
}

export function componentAtoms(component) {
  return component.atomIds.map(getAtom).filter(Boolean);
}

export function centerOfAtomIds(ids) {
  if (!ids.length) return { x: 500, y: 350 };
  return ids.reduce((acc, id) => {
    const atom = getAtom(id);
    acc.x += atom.x / ids.length;
    acc.y += atom.y / ids.length;
    return acc;
  }, { x: 0, y: 0 });
}

export function countsForAtomIds(ids) {
  const counts = {};
  ids.forEach((id) => {
    const atom = getAtom(id);
    if (!atom) return;
    if (atom.groupCounts) mergeCounts(counts, atom.groupCounts, atom.count || 1);
    else addCount(counts, atom.symbol, atom.count || 1);
  });
  return counts;
}

export function isIntermolecularBond(order) {
  return ["ionic", "hbond", "solvation", "coordination"].includes(order);
}

export function isMetalAtom(atom) {
  if (!atom) return false;
  return ["Na", "K", "Mg", "Ca", "Fe", "Cu", "Zn", "Co", "Ni", "Mn", "U"].includes(atom.symbol)
    || ["transition", "alkali", "alkaline", "lanthanide", "actinide"].includes(getElement(atom.symbol).category);
}

export function isDonorAtom(atom) {
  return atom && ["O", "N", "S", "P", "Cl", "F"].includes(atom.symbol);
}

export function getAtom(id) {
  return labState.atoms.find((atom) => atom.id === id);
}

export function getBond(id) {
  return labState.bonds.find((bond) => bond.id === id);
}

export function getElement(symbol) {
  return elementBySymbol.get(symbol) || elementBySymbol.get("C");
}

export function connects(bond, a, b) {
  return (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a);
}
