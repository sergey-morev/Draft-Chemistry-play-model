import { state as labState } from "../state.js";
import { elements } from "../data/elements.js";
import { snapshotMolecule } from "../simulation/history.js";
import { analyzeAndRender } from "../simulation/update.js";
import { openReferenceModal, closeReferenceModal } from "./reference.js";
import { logReaction } from "./journal.js";
import { initRdkitEngine } from "../services/rdkit.js";

const layoutKey = "chemistry-play-model.layout.v2";
let layout = {};

export function initWorkspace() {
  window.lucide?.createIcons();
  try { layout = JSON.parse(localStorage.getItem(layoutKey) || "{}"); } catch { layout = {}; }
  for (const side of ["left", "right", "bottom"]) applySize(side, layout[side]);
  bindTabs("inspector");
  bindTabs("dock");
  document.querySelectorAll("[data-split]").forEach(bindSplitter);
  document.getElementById("menuReference").addEventListener("click", openReferenceModal);
  document.addEventListener("click", event => {
    if (event.target.closest("[data-enable-rdkit]")) initRdkitEngine();
  });
  document.getElementById("saveModel").addEventListener("click", () => {
    download(JSON.stringify({ format: "chemistry-play-model", version: 1, molecule: snapshotMolecule() }, null, 2), "molecule.json", "application/json");
    setStatus("Model saved");
  });
  document.getElementById("exportSvg").addEventListener("click", exportSvg);
  document.getElementById("openModel").addEventListener("click", () => document.getElementById("modelFile").click());
  document.getElementById("modelFile").addEventListener("change", loadModel);
  document.getElementById("toggleLibrary").addEventListener("click", () => togglePanel("library"));
  document.getElementById("toggleInspector").addEventListener("click", () => togglePanel("inspector"));
  document.getElementById("resetLayout").addEventListener("click", resetLayout);
  bindPeriodicDialog();
  document.addEventListener("click", event => {
    if (event.target.closest(".menu-items button")) document.querySelectorAll(".app-menu").forEach(menu => { menu.open = false; });
    else if (!event.target.closest(".app-menu")) document.querySelectorAll(".app-menu").forEach(menu => { menu.open = false; });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !document.getElementById("referenceModal").hidden) closeReferenceModal();
  });
  document.addEventListener("pointerdown", event => {
    if (event.target.closest("[data-atom-id], [data-bond-id]")) activateTab("inspector", "selection");
  }, true);
}

function bindTabs(group) {
  const tabs = [...document.querySelectorAll(`[data-${group}-tab]`)];
  tabs.forEach((button, index) => {
    const name = button.dataset[`${group}Tab`];
    const page = document.querySelector(`[data-${group}-page="${name}"]`);
    button.id = `${group}-tab-${name}`;
    page.id ||= `${group}-page-${name}`;
    button.setAttribute("aria-controls", page.id);
    page.setAttribute("aria-labelledby", button.id);
    button.tabIndex = index ? -1 : 0;
    button.addEventListener("click", () => activateTab(group, name));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(group, tabs[next].dataset[`${group}Tab`]);
      tabs[next].focus();
    });
  });
}

function activateTab(group, name) {
  document.querySelectorAll(`[data-${group}-tab]`).forEach(button => {
    const active = button.dataset[`${group}Tab`] === name;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(`[data-${group}-page]`).forEach(page => { page.hidden = page.dataset[`${group}Page`] !== name; });
}

function applySize(side, value) {
  if (!Number.isFinite(value)) return;
  const maxSide = Math.min(420, Math.max(210, innerWidth * .3));
  const size = side === "bottom" ? Math.max(100, Math.min(innerHeight * .4, value)) : Math.max(side === "left" ? 185 : 245, Math.min(maxSide, value));
  document.documentElement.style.setProperty(side === "bottom" ? "--dock-height" : `--${side}-width`, `${size}px`);
  layout[side] = size;
}

function bindSplitter(handle) {
  const side = handle.dataset.split;
  handle.addEventListener("pointerdown", event => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("is-dragging");
    const move = e => applySize(side, side === "bottom" ? innerHeight - e.clientY - 23 : side === "left" ? e.clientX - 42 : innerWidth - e.clientX);
    const stop = () => {
      handle.classList.remove("is-dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      try { localStorage.setItem(layoutKey, JSON.stringify(layout)); } catch { /* Storage may be disabled. */ }
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });
  handle.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const value = layout[side] || (side === "bottom" ? 172 : side === "left" ? 244 : 306);
    applySize(side, value + (["ArrowRight", "ArrowUp"].includes(event.key) ? 15 : -15));
    try { localStorage.setItem(layoutKey, JSON.stringify(layout)); } catch {}
  });
}

function togglePanel(name) {
  const shell = document.querySelector(".app-shell");
  if (innerWidth <= 620) shell.classList.toggle(`mobile-${name}`);
  else if (name === "library" && innerWidth <= 900) document.getElementById("openPeriodicTable").click();
  else shell.classList.toggle(`${name}-hidden`);
}

function resetLayout() {
  layout = {};
  for (const variable of ["--left-width", "--right-width", "--dock-height"]) document.documentElement.style.removeProperty(variable);
  document.querySelector(".app-shell").classList.remove("library-hidden", "inspector-hidden", "mobile-library", "mobile-inspector");
  try { localStorage.removeItem(layoutKey); } catch {}
  setStatus("Layout reset");
}

function bindPeriodicDialog() {
  const dialog = document.getElementById("periodicDialog");
  const grid = document.getElementById("periodicGrid");
  const originalParent = grid.parentElement;
  document.getElementById("openPeriodicTable").addEventListener("click", () => {
    document.getElementById("periodicTableHost").appendChild(grid);
    dialog.showModal();
  });
  document.getElementById("closePeriodicTable").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => originalParent.appendChild(grid));
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
}

function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportSvg() {
  const svg = document.getElementById("stage").cloneNode(true);
  svg.querySelector("#effectLayer").replaceChildren();
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = ".stage-bg{fill:white}.grid-lines{display:none}.bond-line{stroke:#465461;stroke-width:4}.bond-hit{display:none}.atom-circle{stroke:#465461;stroke-width:1.5}.atom-label{fill:white;font:bold 18px sans-serif;text-anchor:middle;dominant-baseline:middle}.atom-sub,.atom-count,.atom-role,.atom-warning{fill:#26313b;font:12px sans-serif;text-anchor:middle}.coordination,.hbond,.solvation{stroke-dasharray:7 5}";
  svg.prepend(style);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  download(new XMLSerializer().serializeToString(svg), "molecule.svg", "image/svg+xml");
  setStatus("Diagram exported");
}

async function loadModel(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("File exceeds 5 MB");
    const data = JSON.parse(await file.text());
    const model = validateModelFile(data);
    Object.assign(labState, model);
    labState.selectedAtomIds = []; labState.selectedBondId = null; labState.pendingAtomId = null;
    analyzeAndRender();
    logReaction("Model loaded from a local file.");
    setStatus("Model opened");
  } catch (error) { setStatus(`Could not open model: ${error.message}`); }
  event.target.value = "";
}

export function validateModelFile(data) {
  if (data?.format !== "chemistry-play-model" || data.version !== 1) throw new Error("Unsupported format");
  const model = data.molecule;
  if (!Array.isArray(model?.atoms) || model.atoms.length > 2000 || !Array.isArray(model.bonds) || model.bonds.length > 6000) throw new Error("Invalid model size");
  const symbols = new Set(elements.map(element => element.symbol));
  const ids = new Set();
  const atoms = model.atoms.map(atom => {
    if (!Number.isSafeInteger(atom.id) || atom.id < 1 || ids.has(atom.id) || !symbols.has(atom.symbol) || ![atom.x, atom.y, atom.charge].every(Number.isFinite)) throw new Error("Invalid atom");
    ids.add(atom.id);
    const copy = { ...atom, x: Math.max(24, Math.min(976, atom.x)), y: Math.max(24, Math.min(696, atom.y)), vx: 0, vy: 0 };
    for (const key of ["count", "isotopeShift", "enrichment", "valenceOverride", "targetMassNumber", "groupValence"]) {
      if (copy[key] != null && (!Number.isFinite(copy[key]) || Math.abs(copy[key]) > 1e7)) throw new Error("Invalid atom setting");
    }
    if (copy.groupCounts && Object.entries(copy.groupCounts).some(([symbol,n]) => !symbols.has(symbol) || !Number.isFinite(n) || n < 0 || n > 1e7)) throw new Error("Invalid group");
    return copy;
  });
  const bondIds = new Set();
  const bonds = model.bonds.map(bond => {
    if (!Number.isSafeInteger(bond.id) || bond.id < 1 || bondIds.has(bond.id) || !ids.has(bond.a) || !ids.has(bond.b) || bond.a === bond.b || ![1,2,3,"aromatic","ionic","coordination","hbond","solvation"].includes(bond.order)) throw new Error("Invalid bond");
    bondIds.add(bond.id);
    return { id: bond.id, a: bond.a, b: bond.b, order: bond.order };
  });
  return { atoms, bonds, nextAtomId: Math.max(0,...ids) + 1, nextBondId: Math.max(0,...bondIds) + 1, compoundMeta: restoreSafeCompoundMeta(model.compoundMeta) };
}

function restoreSafeCompoundMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (["__proto__", "prototype", "constructor"].some((key) => Object.hasOwn(value, key))) return null;
  const limits = { commonName: 160, className: 160, note: 1000, bioName: 160 };
  const restored = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (!Object.hasOwn(value, key)) continue;
    const text = value[key];
    if (typeof text !== "string" || text.length > limit || /[<>\u0000-\u001f\u007f]|https?:\/\/|javascript:/i.test(text)) return null;
    restored[key] = text;
  }
  return Object.keys(restored).length ? restored : null;
}

export function setStatus(message) { document.getElementById("workspaceStatus").textContent = message; }
