import { elementBrief } from "../chemistry/elements.js";
import { elements } from "../data/elements.js";
import { getElement } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { setMode } from "./controls.js";
import { elementSearch, periodicGrid, selectedElementBox } from "./dom.js";
import { formatNumber } from "../utils/format.js";

export function renderPeriodicTable() {
  const query = elementSearch.value.trim().toLowerCase();
  periodicGrid.innerHTML = "";
  elements.forEach((element) => {
    const tile = document.createElement("button");
    tile.className = "element-tile";
    tile.style.gridColumn = element.group;
    tile.style.gridRow = element.period;
    tile.style.setProperty("--group", element.group);
    tile.style.setProperty("--period", element.period);
    tile.style.background = element.color;
    tile.title = `${element.name}: Z=${element.z}, валентности ${element.valences.join(", ")}`;
    tile.innerHTML = `<small>${element.z}</small>${element.symbol}`;
    tile.classList.toggle("is-selected", element.symbol === labState.selectedElement);
    const text = `${element.symbol} ${element.name}`.toLowerCase();
    tile.classList.toggle("is-muted", query && !text.includes(query));
    tile.addEventListener("click", () => {
      labState.selectedElement = element.symbol;
      renderPeriodicTable();
      renderSelectedElement();
      setMode("atom");
    });
    periodicGrid.appendChild(tile);
  });
}

export function renderSelectedElement() {
  const element = getElement(labState.selectedElement);
  selectedElementBox.innerHTML = `
    <div class="big-symbol" style="background:${element.color}">${element.symbol}</div>
    <div>
      <strong>${element.name}</strong>
      <span>Z=${element.z}; валентности ${element.valences.join(", ")}; χ=${formatNumber(element.electronegativity)}</span>
      <span>радиус ${element.radius} пм; масса ${formatNumber(element.mass)}</span>
      <span>${elementBrief(element)}</span>
    </div>
  `;
}
