import { atomRadius, bondClass, bondOffsets, isotopeLabel } from "../chemistry/properties.js";
import { getAtom, getElement } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { atomLayer, bondLayer, svg } from "../ui/dom.js";
import { onAtomPointerDown, onBondPointerDown, showAtomContextMenu, showBondContextMenu } from "../ui/interactions.js";
import { formatCompactCount, signed } from "../utils/format.js";

export function render() {
  bondLayer.innerHTML = "";
  atomLayer.innerHTML = "";

  labState.bonds.forEach((bond) => renderBond(bond));
  labState.atoms.forEach((atom) => renderAtom(atom));

  if (labState.pendingAtomId) {
    const atom = getAtom(labState.pendingAtomId);
    if (atom) {
      const ring = makeSvg("circle", {
        class: "pending-ring",
        cx: atom.x,
        cy: atom.y,
        r: 34
      });
      atomLayer.appendChild(ring);
    }
  }
}

export function renderBond(bond) {
  const a = getAtom(bond.a);
  const b = getAtom(bond.b);
  if (!a || !b) return;
  const group = makeSvg("g", { "data-bond-id": bond.id });
  group.addEventListener("contextmenu", (event) => showBondContextMenu(event, bond.id));
  const hit = makeSvg("line", { class: "bond-hit", x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  hit.addEventListener("pointerdown", (event) => onBondPointerDown(event, bond.id));
  group.appendChild(hit);

  const offsets = bondOffsets(bond.order, a, b);
  offsets.forEach((offset, index) => {
    const line = makeSvg("line", {
      class: `bond-line ${bondClass(bond.order, index)} ${labState.selectedBondId === bond.id ? "is-selected" : ""}`,
      x1: a.x + offset.x,
      y1: a.y + offset.y,
      x2: b.x + offset.x,
      y2: b.y + offset.y
    });
    group.appendChild(line);
  });
  bondLayer.appendChild(group);
}

export function renderAtom(atom) {
  const element = getElement(atom.symbol);
  const report = labState.lastAnalysis?.atomMap.get(atom.id);
  const group = makeSvg("g", {
    class: "atom-group",
    "data-atom-id": atom.id,
    transform: `translate(${atom.x} ${atom.y})`
  });
  group.addEventListener("pointerdown", (event) => onAtomPointerDown(event, atom.id));
  group.addEventListener("contextmenu", (event) => showAtomContextMenu(event, atom.id));
  const radius = atomRadius(element);
  const circle = makeSvg("circle", {
    class: `atom-circle ${labState.selectedAtomIds.includes(atom.id) ? "is-selected" : ""} ${report?.state === "bad" ? "is-bad" : ""} ${report?.state === "warn" ? "is-warn" : ""}`,
    r: radius,
    fill: element.color
  });
  group.appendChild(circle);
  if (atom.roleLabel) {
    const roleLabel = makeSvg("text", {
      class: "atom-role",
      y: -radius - 25
    });
    roleLabel.textContent = atom.roleLabel;
    group.appendChild(roleLabel);
  }
  if (report?.state === "bad" || report?.state === "warn") {
    const warning = makeSvg("text", {
      class: `atom-warning ${report.state}`,
      y: -radius - 11
    });
    warning.textContent = report.state === "bad" ? "!" : "△";
    group.appendChild(warning);
  }
  const label = makeSvg("text", { class: "atom-label", y: 1 });
  label.textContent = atom.symbol;
  group.appendChild(label);
  if ((atom.count || 1) > 1) {
    const countLabel = makeSvg("text", { class: "atom-count", y: -radius - 12 });
    countLabel.textContent = `×${formatCompactCount(atom.count)}`;
    group.appendChild(countLabel);
  }
  const adornments = [];
  const isoText = isotopeLabel(atom, element);
  if (atom.structLabel && atom.structLabel !== atom.symbol && atom.structLabel !== isoText) adornments.push(atom.structLabel);
  if (atom.charge !== 0) adornments.push(signed(atom.charge));
  if (atom.isotopeShift !== 0 || atom.targetMassNumber) adornments.push(`${isoText}@${Math.round((atom.enrichment || 0) * 100)}%`);
  if (atom.valenceOverride != null) adornments.push(`V${atom.valenceOverride}`);
  if (report?.implicitH > 0) adornments.push(`H${report.implicitH > 1 ? report.implicitH : ""}`);
  if (adornments.length) {
    const rows = adornments.length > 2 ? [adornments.slice(0, 2), adornments.slice(2)] : [adornments];
    rows.forEach((row, index) => {
      const sub = makeSvg("text", { class: "atom-sub", y: radius + 13 + index * 13 });
      sub.textContent = row.join(" ");
      group.appendChild(sub);
    });
  }
  atomLayer.appendChild(group);
}

export function svgPoint(event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

export function makeSvg(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) node.setAttribute(key, String(value));
  });
  return node;
}
