import { elementBySymbol } from "../data/elements.js";
import { centerMolecule } from "../render/camera.js";
import { addBenzene, addEthanol } from "../simulation/fragments.js";
import { addAtom, createOrUpdateBond } from "../simulation/molecule.js";
import { state as labState } from "../state.js";

export function parseSimpleSmiles(smiles) {
  const source = String(smiles || "").trim();
  if (!source) return { ok: false, error: "Введите SMILES." };
  const atomsOut = [];
  const bondsOut = [];
  const branchStack = [];
  const ringClosures = new Map();
  let current = null;
  let pendingOrder = null;
  let componentIndex = 0;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "-") { pendingOrder = 1; continue; }
    if (char === "=") { pendingOrder = 2; continue; }
    if (char === "#") { pendingOrder = 3; continue; }
    if (char === ".") { current = null; componentIndex++; pendingOrder = null; continue; }
    if (char === "(") { branchStack.push(current); continue; }
    if (char === ")") { current = branchStack.pop() ?? current; continue; }
    if (/[0-9]/.test(char)) {
      if (current == null) return { ok: false, error: `Цифра кольца ${char} стоит без атома.` };
      if (ringClosures.has(char)) {
        const open = ringClosures.get(char);
        const a = atomsOut[open];
        const b = atomsOut[current];
        bondsOut.push({ a: open, b: current, order: pendingOrder || (a.aromatic && b.aromatic ? "aromatic" : 1) });
        ringClosures.delete(char);
      } else {
        ringClosures.set(char, current);
      }
      pendingOrder = null;
      continue;
    }

    const atom = readSmilesAtom(source, i);
    if (!atom) return { ok: false, error: `Не удалось разобрать SMILES около "${source.slice(i, i + 8)}".` };
    i = atom.end;
    atom.component = componentIndex;
    const atomIndex = atomsOut.length;
    atomsOut.push(atom);
    if (current != null) {
      const previous = atomsOut[current];
      bondsOut.push({ a: current, b: atomIndex, order: pendingOrder || (previous.aromatic && atom.aromatic ? "aromatic" : 1) });
    }
    current = atomIndex;
    pendingOrder = null;
  }

  if (branchStack.length) return { ok: false, error: "В SMILES не закрыта ветка ')'." };
  if (ringClosures.size) return { ok: false, error: "В SMILES не закрыто кольцо." };
  if (!atomsOut.length) return { ok: false, error: "SMILES пустой." };
  return { ok: true, smiles: source, atoms: atomsOut, bonds: bondsOut };
}

export function readSmilesAtom(source, index) {
  const char = source[index];
  if (char === "[") {
    const end = source.indexOf("]", index + 1);
    if (end === -1) return null;
    const body = source.slice(index + 1, end);
    const match = body.match(/^([A-Z][a-z]?|[cnosp])(?:H\d*)?([+-]\d*)?/);
    if (!match) return null;
    const aromatic = /^[cnosp]$/.test(match[1]);
    return {
      symbol: aromatic ? match[1].toUpperCase() : match[1],
      aromatic,
      charge: smilesCharge(match[2] || ""),
      end
    };
  }
  if (/[cnosp]/.test(char)) return { symbol: char.toUpperCase(), aromatic: true, charge: 0, end: index };
  if (!/[A-Z]/.test(char)) return null;
  let symbol = char;
  if (/[a-z]/.test(source[index + 1] || "")) {
    const two = symbol + source[index + 1];
    if (elementBySymbol.has(two)) {
      symbol = two;
      index++;
    }
  }
  if (!elementBySymbol.has(symbol)) return null;
  return { symbol, aromatic: false, charge: 0, end: index };
}

export function smilesCharge(text) {
  if (!text) return 0;
  const sign = text[0] === "-" ? -1 : 1;
  const magnitude = Number(text.slice(1)) || 1;
  return sign * magnitude;
}

export function buildMoleculeFromSmiles(parsed, smiles, meta = {}) {
  labState.atoms = [];
  labState.bonds = [];
  labState.selectedAtomIds = [];
  labState.selectedBondId = null;
  labState.pendingAtomId = null;
  labState.nextAtomId = 1;
  labState.nextBondId = 1;

  const center = { x: 500, y: 350 };
  const normalized = smiles.replace(/\s+/g, "");
  const lower = normalized.toLowerCase();
  labState.compoundMeta = {
    inputType: "smiles",
    sourceFormula: meta.formula || "",
    sourceInput: meta.input || smiles,
    displayFormula: meta.displayFormula || "",
    structure: meta.structure || "",
    smiles,
    commonName: meta.commonName || "",
    className: meta.className || "SMILES",
    note: meta.note || "",
    uses: meta.uses || [],
    hazards: meta.hazards || [],
    external: meta.external || null,
    rdkit: null,
    condensed: false,
    totalAtoms: parsed.atoms.length,
    bioName: meta.commonName || ""
  };

  if (lower === "c1ccccc1") {
    addBenzene(center.x, center.y);
  } else if (normalized === "CCO") {
    addEthanol(center.x, center.y);
  } else if (normalized === "O=C=O") {
    const o1 = addAtom("O", center.x - 96, center.y);
    const c = addAtom("C", center.x, center.y);
    const o2 = addAtom("O", center.x + 96, center.y);
    createOrUpdateBond(o1.id, c.id, 2);
    createOrUpdateBond(c.id, o2.id, 2);
    labState.selectedAtomIds = [o1.id, c.id, o2.id];
  } else {
    const created = parsed.atoms.map((item, index) => {
      const componentOffset = item.component * 190;
      const x = center.x - 120 + componentOffset + index * 62;
      const y = center.y + Math.sin(index * 1.3) * 34;
      const atom = addAtom(item.symbol, x, y, item.charge || 0);
      atom.smilesAromatic = item.aromatic;
      return atom;
    });
    parsed.bonds.forEach((bond) => {
      createOrUpdateBond(created[bond.a].id, created[bond.b].id, bond.order);
    });
    if (created.length === 2 && created.some((atom) => atom.symbol === "Na") && created.some((atom) => atom.symbol === "Cl")) {
      createOrUpdateBond(created[0].id, created[1].id, "ionic");
    }
    labState.selectedAtomIds = created.slice(0, 8).map((atom) => atom.id);
  }

  labState.atoms.forEach((atom) => {
    atom.suppressImplicitH = false;
  });
  centerMolecule(false);
}
