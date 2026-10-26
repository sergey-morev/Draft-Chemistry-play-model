import { state as labState } from "../state.js";
import { clamp } from "../utils/format.js";

export function centerMolecule(animate = true) {
  if (!labState.atoms.length) return;
  const bounds = moleculeBounds();
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };
  const scale = Math.min(1, 860 / Math.max(1, bounds.width), 600 / Math.max(1, bounds.height));
  labState.atoms.forEach((atom) => {
    atom.x = clamp(500 + (atom.x - center.x) * scale, 24, 976);
    atom.y = clamp(360 + (atom.y - center.y) * scale, 24, 696);
    if (!animate) {
      atom.vx = 0;
      atom.vy = 0;
    }
  });
}

export function moleculeBounds() {
  if (!labState.atoms.length) return { minX: 500, maxX: 500, minY: 360, maxY: 360, width: 0, height: 0 };
  const bounds = labState.atoms.reduce((acc, atom) => {
    acc.minX = Math.min(acc.minX, atom.x);
    acc.maxX = Math.max(acc.maxX, atom.x);
    acc.minY = Math.min(acc.minY, atom.y);
    acc.maxY = Math.max(acc.maxY, atom.y);
    return acc;
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  bounds.width = bounds.maxX - bounds.minX;
  bounds.height = bounds.maxY - bounds.minY;
  return bounds;
}

export function moleculeCenter() {
  if (!labState.atoms.length) return { x: 500, y: 360 };
  return labState.atoms.reduce((acc, atom) => {
    acc.x += atom.x / labState.atoms.length;
    acc.y += atom.y / labState.atoms.length;
    return acc;
  }, { x: 0, y: 0 });
}

export function freeCenterPoint() {
  if (!labState.atoms.length) return { x: 500, y: 350 };
  const center = moleculeCenter();
  return {
    x: clamp(center.x + 140, 130, 870),
    y: clamp(center.y + 40, 110, 610)
  };
}
